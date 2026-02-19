import { collection, doc, setDoc, getDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { TechnicalFeature } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, FEATURES_COLLECTION } from "./config";
import { validateDoc, validateDocs, TechnicalFeatureSchema } from "./validation";

export const FeatureService = {
    saveFeature: async (feature: TechnicalFeature) => {
        const docRef = doc(db, FEATURES_COLLECTION, feature.id);
        const stamped = applyTimestamps(feature);
        const cleaned = cleanObject(stamped);
        await setDoc(docRef, cleaned, { merge: true });
        return feature.id;
    },

    getAllFeatures: async (): Promise<TechnicalFeature[]> => {
        const snapshot = await getDocs(collection(db, FEATURES_COLLECTION));
        return validateDocs(TechnicalFeatureSchema, snapshot.docs);
    },

    getFeatureById: async (id: string): Promise<TechnicalFeature | null> => {
        const docRef = doc(db, FEATURES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(TechnicalFeatureSchema, snapshot.data(), id);
        }
        return null;
    },

    saveFeatureBatch: async (features: TechnicalFeature[]) => {
        const batch = writeBatch(db);
        features.forEach((feature) => {
            const docRef = doc(db, FEATURES_COLLECTION, feature.id);
            const stamped = applyTimestamps(feature);
            batch.set(docRef, stamped, { merge: true });
        });
        await batch.commit();
        return features.length;
    },

    deleteFeature: async (id: string) => {
        const docRef = doc(db, FEATURES_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
