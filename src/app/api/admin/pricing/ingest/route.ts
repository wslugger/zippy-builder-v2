import { NextResponse } from "next/server";
import { db } from "@/src/lib/firebase/config";
import { PRICING_COLLECTION } from "@/src/lib/firebase/pricing-service";
import { parsePricingCSV } from "@/src/lib/pricing-csv-parser";
import { doc, writeBatch } from "firebase/firestore";
import { stampUpdate } from "@/src/lib/timestamps";
import { EquipmentService } from "@/src/lib/firebase/equipment-service";

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

        // ── 2. Filter rows against local Equipment Catalog ────────────────────
        // We only want to import prices for items we actually have in our catalog.
        const equipment = await EquipmentService.getAllEquipment();
        const relevantSkus = new Set<string>();

        equipment.forEach(e => {
            relevantSkus.add(e.id);
            if (e.pricingSku) relevantSkus.add(e.pricingSku);
        });

        interface PricingUpdate {
            id: string; // The SKU
            listPrice: number;
            description?: string;
            pricingEffectiveDate?: string;
            eosDate: string | null;
            status?: string;
        }

        const updates: PricingUpdate[] = [];

        for (const row of rows) {
            // Only include if the product matches an ID or pricingSku in our equipment catalog
            if (!relevantSkus.has(row.product)) {
                continue;
            }

            const update: PricingUpdate = {
                id: row.product,
                listPrice: row.listPrice,
                description: row.description,
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

        // ── 3. Batch-write in chunks of 500 ───────────────────────────────────
        for (let i = 0; i < updates.length; i += BATCH_CHUNK_SIZE) {
            const chunk = updates.slice(i, i + BATCH_CHUNK_SIZE);
            const batch = writeBatch(db);

            for (const update of chunk) {
                const docRef = doc(db, PRICING_COLLECTION, update.id);
                const payload = stampUpdate({ ...update });
                // Merge so we don't overwrite unrelated fields
                batch.set(docRef, payload, { merge: true });
            }

            await batch.commit();
        }

        // ── 4. Return summary ──────────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            effectiveDate,
            total: rows.length,
            updated: updates.length,
            skipped: rows.length - updates.length,
        });

    } catch (error) {
        console.error("[PricingIngest] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
