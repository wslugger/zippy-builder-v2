import { NextResponse } from "next/server";
import { db, EQUIPMENT_COLLECTION } from "@/src/lib/firebase/config";
import { EquipmentService } from "@/src/lib/firebase/equipment-service";
import { parsePricingCSV } from "@/src/lib/pricing-csv-parser";
import { doc, writeBatch } from "firebase/firestore";
import { stampUpdate } from "@/src/lib/timestamps";

const BATCH_CHUNK_SIZE = 500;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
        }

        // ── 1. Parse CSV ───────────────────────────────────────────────────────
        const text = await file.text();
        const { effectiveDate, rows } = parsePricingCSV(text);

        if (rows.length === 0) {
            return NextResponse.json({ error: "No valid pricing rows found in CSV." }, { status: 400 });
        }

        // ── 2. Fetch existing catalog ──────────────────────────────────────────
        const existingEquipment = await EquipmentService.getAllEquipment();

        // Build a map from model (case-insensitive) → equipment doc for quick lookup
        const catalogByModel = new Map<string, (typeof existingEquipment)[number]>();
        for (const eq of existingEquipment) {
            catalogByModel.set(eq.model.toLowerCase().trim(), eq);
        }

        // ── 3. Diff & collect writes (idempotent) ──────────────────────────────
        interface PricingUpdate {
            id: string;
            listPrice: number;
            pricingEffectiveDate?: string;
            eosDate: string | null;
            status?: string;
        }

        const updates: PricingUpdate[] = [];
        let skipped = 0;

        for (const row of rows) {
            const existing = catalogByModel.get(row.product.toLowerCase().trim());
            if (!existing) {
                // Product not in our catalog — skip silently
                skipped++;
                continue;
            }

            const existingAny = existing as Record<string, unknown>;
            const priceChanged = existingAny.listPrice !== row.listPrice;
            const eosChanged = existingAny.eosDate !== row.eosDate;

            if (!priceChanged && !eosChanged) {
                skipped++;
                continue;
            }

            const update: PricingUpdate = {
                id: existing.id,
                listPrice: row.listPrice,
                eosDate: row.eosDate,
            };

            if (effectiveDate) {
                update.pricingEffectiveDate = effectiveDate;
            }

            if (row.eosDate) {
                update.status = "eos";
            }

            updates.push(update);
        }

        // ── 4. Batch-write in chunks of 500 ───────────────────────────────────
        for (let i = 0; i < updates.length; i += BATCH_CHUNK_SIZE) {
            const chunk = updates.slice(i, i + BATCH_CHUNK_SIZE);
            const batch = writeBatch(db);

            for (const update of chunk) {
                const docRef = doc(db, EQUIPMENT_COLLECTION, update.id);
                const payload = stampUpdate({ ...update });
                // Merge so we don't overwrite unrelated fields
                batch.set(docRef, payload, { merge: true });
            }

            await batch.commit();
        }

        // ── 5. Return summary ──────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            effectiveDate,
            total: rows.length,
            updated: updates.length,
            skipped,
        });

    } catch (error) {
        console.error("[PricingIngest] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
