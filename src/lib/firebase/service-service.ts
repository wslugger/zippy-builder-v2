import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { Service } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, SERVICE_COLLECTION } from "./config";
import { validateDoc, validateDocs, ServiceSchema } from "./validation";

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
        return validateDocs(ServiceSchema, snapshot.docs);
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
    }
};
