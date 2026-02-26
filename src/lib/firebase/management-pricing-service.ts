import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, SYSTEM_CONFIG_COLLECTION } from "./config";
import { ManagementPricingMatrix } from "@/src/lib/types";

const DOC_ID = "management_pricing_matrix";

export const ManagementPricingService = {
    getManagementPricing: async (): Promise<ManagementPricingMatrix> => {
        try {
            const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, DOC_ID);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                return snapshot.data() as ManagementPricingMatrix;
            }
            return {};
        } catch (error) {
            console.error("Error fetching management pricing matrix", error);
            return {};
        }
    },

    saveManagementPricing: async (matrix: ManagementPricingMatrix): Promise<void> => {
        try {
            const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, DOC_ID);
            await setDoc(docRef, matrix, { merge: false });
        } catch (error) {
            console.error("Error saving management pricing matrix", error);
            throw error;
        }
    }
};
