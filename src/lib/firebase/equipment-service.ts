import { collection, doc, setDoc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { Equipment, EquipmentSchema } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, EQUIPMENT_COLLECTION } from "./config";
import { validateDoc, validateDocs } from "./validation";

export const EquipmentService = {
    saveEquipment: async (equipment: Equipment) => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, equipment.id);
        const stamped = applyTimestamps(equipment);
        const cleaned = cleanObject(stamped);
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
            const stamped = applyTimestamps(item);
            const cleaned = cleanObject(stamped);
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
        return validateDocs(EquipmentSchema, snapshot.docs);
    },

    /**
     * Get single Equipment by ID
     */
    getEquipmentById: async (id: string): Promise<Equipment | null> => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(EquipmentSchema, snapshot.data(), id);
        }
        return null;
    },
};
