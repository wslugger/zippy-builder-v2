import { collection, doc, setDoc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { Equipment } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, EQUIPMENT_COLLECTION } from "./config";

export const EquipmentService = {
    saveEquipment: async (equipment: Equipment) => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, equipment.id);
        const cleaned = cleanObject(equipment);
        await setDoc(docRef, cleaned, { merge: true });
        return equipment.id;
    },

    /**
     * Save multiple Equipment items in a single batch
     */
    saveEquipmentBatch: async (items: Equipment[]) => {
        const batch = writeBatch(db);

        items.forEach((item) => {
            const docRef = doc(db, EQUIPMENT_COLLECTION, item.id);
            const cleaned = cleanObject(item);
            batch.set(docRef, cleaned, { merge: true });
        });

        await batch.commit();
        return items.length;
    },

    /**
     * Get all Equipment
     */
    getAllEquipment: async (): Promise<Equipment[]> => {
        const snapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as Equipment);
    },

    /**
     * Get single Equipment by ID
     */
    getEquipmentById: async (id: string): Promise<Equipment | null> => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Equipment;
        }
        return null;
    },
};
