import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { SiteType } from "@/src/lib/site-types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, SITE_DEFINITIONS_COLLECTION } from "./config";

export const SiteDefinitionService = {
    saveSiteDefinition: async (siteDef: SiteType) => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, siteDef.id);
        const cleaned = cleanObject(siteDef);
        await setDoc(docRef, cleaned, { merge: true });
        return siteDef.id;
    },

    getAllSiteDefinitions: async (): Promise<SiteType[]> => {
        const snapshot = await getDocs(collection(db, SITE_DEFINITIONS_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as SiteType);
    },

    getSiteDefinitionById: async (id: string): Promise<SiteType | null> => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as SiteType;
        }
        return null;
    },

    deleteSiteDefinition: async (id: string) => {
        const docRef = doc(db, SITE_DEFINITIONS_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
