import { SiteType, SiteTypeSchema } from "@/src/lib/types";
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";

import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, SITE_DEFINITIONS_COLLECTION } from "./config";
import { validateDoc, validateDocs } from "./validation";

export const SiteDefinitionService = {
    saveSiteDefinition: async (siteDef: SiteType) => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, siteDef.id);
        const stamped = applyTimestamps(siteDef);
        const cleaned = cleanObject(stamped);
        await setDoc(docRef, cleaned, { merge: true });
        return siteDef.id;
    },

    getAllSiteDefinitions: async (): Promise<SiteType[]> => {
        const snapshot = await getDocs(collection(db, SITE_DEFINITIONS_COLLECTION));
        return validateDocs(SiteTypeSchema, snapshot.docs);
    },

    getSiteDefinitionById: async (id: string): Promise<SiteType | null> => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(SiteTypeSchema, snapshot.data(), id);
        }
        return null;
    },

    deleteSiteDefinition: async (id: string) => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
