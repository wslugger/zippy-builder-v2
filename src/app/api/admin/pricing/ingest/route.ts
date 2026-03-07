import { NextResponse } from "next/server";
import { db } from "@/src/lib/firebase/config";
import { PRICING_COLLECTION, PricingService } from "@/src/lib/firebase/pricing-service";
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

        // ── 2. Process all rows (No filtering against catalog) ────────────────
        // We now import the entire list so that we can match them later 
        // as new equipment is added to the catalog.

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
                const docRef = doc(db, PRICING_COLLECTION, PricingService.getPricingDocId(update.id));
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
            skipped: 0, // No filtered out rows anymore
        });

    } catch (error) {
        console.error("[PricingIngest] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
