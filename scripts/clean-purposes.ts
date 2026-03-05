import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, EQUIPMENT_COLLECTION } from "../src/lib/firebase/config";

const VALID_PURPOSES = ["WAN", "LAN", "WLAN"];

/**
 * Removes invalid purposes (Security, IoT, etc.) from additional_purposes
 * and cleans primary_purpose if it's not a valid value.
 * Run with: npx tsx scripts/clean-purposes.ts
 */
async function cleanPurposes() {
    console.log(`🧹 Cleaning purposes in: ${EQUIPMENT_COLLECTION}...`);

    try {
        const snapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        let updated = 0;

        for (const d of snapshot.docs) {
            const data = d.data();
            const additionalPurposes: string[] = data.additional_purposes || [];
            const cleaned = additionalPurposes.filter(p => VALID_PURPOSES.includes(p));

            if (cleaned.length !== additionalPurposes.length) {
                console.log(`   - Updating ${d.id}: ${additionalPurposes.join(', ')} → ${cleaned.join(', ') || '(none)'}`);
                await updateDoc(doc(db, EQUIPMENT_COLLECTION, d.id), {
                    additional_purposes: cleaned,
                });
                updated++;
            }
        }

        console.log(`✅ Updated ${updated} of ${snapshot.size} records.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

cleanPurposes();
