import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { Service } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, SERVICE_COLLECTION } from "./config";

export const ServiceService = {
    saveService: async (service: Service) => {
        const docRef = doc(db, SERVICE_COLLECTION, service.id);
        const cleaned = cleanObject(service);
        await setDoc(docRef, cleaned, { merge: true });
        return service.id;
    },

    getAllServices: async (): Promise<Service[]> => {
        const snapshot = await getDocs(collection(db, SERVICE_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as Service);
    },

    getServiceById: async (id: string): Promise<Service | null> => {
        const docRef = doc(db, SERVICE_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Service;
        }
        return null;
    },

    deleteService: async (id: string) => {
        const docRef = doc(db, SERVICE_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
