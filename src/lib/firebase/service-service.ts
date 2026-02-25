import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { Service } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, SERVICE_COLLECTION } from "./config";
import { validateDoc, validateDocs, ServiceSchema } from "./validation";

/**
 * Sort services by sortOrder ascending, falling back to alphabetical by name
 * when sortOrder is missing or tied.
 */
function sortServices(services: Service[]): Service[] {
    return [...services].sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name ?? "").localeCompare(b.name ?? "");
    });
}

export const ServiceService = {
    saveService: async (service: Service) => {
        const docRef = doc(db, SERVICE_COLLECTION, service.id);
        const stamped = applyTimestamps(service);
        const cleaned = cleanObject(stamped);
        await setDoc(docRef, cleaned, { merge: true });
        return service.id;
    },

    getAllServices: async (): Promise<Service[]> => {
        const snapshot = await getDocs(collection(db, SERVICE_COLLECTION));
        const services = validateDocs(ServiceSchema, snapshot.docs);
        return sortServices(services);
    },

    getServiceById: async (id: string): Promise<Service | null> => {
        const docRef = doc(db, SERVICE_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(ServiceSchema, snapshot.data(), id);
        }
        return null;
    },

    deleteService: async (id: string) => {
        const docRef = doc(db, SERVICE_COLLECTION, id);
        await deleteDoc(docRef);
    },

    /**
     * Batch-update sortOrder for multiple services in a single Firestore write.
     */
    updateServiceSortOrders: async (updates: { id: string; sortOrder: number }[]) => {
        const batch = writeBatch(db);
        for (const { id, sortOrder } of updates) {
            const docRef = doc(db, SERVICE_COLLECTION, id);
            batch.update(docRef, { sortOrder, updatedAt: new Date().toISOString() });
        }
        await batch.commit();
    },
};
