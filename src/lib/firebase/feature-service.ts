import { collection, doc, setDoc, getDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { TechnicalFeature } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, FEATURES_COLLECTION } from "./config";

export const FeatureService = {
    saveFeature: async (feature: TechnicalFeature) => {
        const docRef = doc(db, FEATURES_COLLECTION, feature.id);
        const cleaned = cleanObject(feature);
        await setDoc(docRef, cleaned, { merge: true });
        return feature.id;
    },

    getAllFeatures: async (): Promise<TechnicalFeature[]> => {
        const snapshot = await getDocs(collection(db, FEATURES_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as TechnicalFeature);
    },

    getFeatureById: async (id: string): Promise<TechnicalFeature | null> => {
        const docRef = doc(db, FEATURES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as TechnicalFeature;
        }
        return null;
    },

    saveFeatureBatch: async (features: TechnicalFeature[]) => {
        const batch = writeBatch(db);
        features.forEach(feature => {
            const docRef = doc(db, FEATURES_COLLECTION, feature.id);
            batch.set(docRef, feature, { merge: true });
        });
        await batch.commit();
        return features.length;
    },

    deleteFeature: async (id: string) => {
        const docRef = doc(db, FEATURES_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
