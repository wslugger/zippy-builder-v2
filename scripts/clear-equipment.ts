import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, EQUIPMENT_COLLECTION } from "../src/lib/firebase/config";

/**
 * Script to clear the equipment catalog for testing fresh ingestion.
 * Run with: npx tsx scripts/clear-equipment.ts
 */
async function clearEquipmentCatalog() {
    console.log(`🧹 Clearing collection: ${EQUIPMENT_COLLECTION}...`);

    try {
        const querySnapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        const deletePromises = querySnapshot.docs.map((d) => {
            console.log(`   - Deleting: ${d.id}`);
            return deleteDoc(doc(db, EQUIPMENT_COLLECTION, d.id));
        });

        await Promise.all(deletePromises);
        console.log(`✅ Successfully deleted ${querySnapshot.size} items.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing collection:", error);
        process.exit(1);
    }
}

clearEquipmentCatalog();
