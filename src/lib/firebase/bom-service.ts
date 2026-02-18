import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { BOMLogicRule } from "@/src/lib/bom-types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, BOM_RULES_COLLECTION } from "./config";

export const BOMService = {
    saveRule: async (rule: BOMLogicRule) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, rule.id);
        const cleaned = cleanObject(rule);
        await setDoc(docRef, cleaned, { merge: true });
        return rule.id;
    },

    getAllRules: async (): Promise<BOMLogicRule[]> => {
        const snapshot = await getDocs(collection(db, BOM_RULES_COLLECTION));
        return snapshot.docs
            .map((doc) => doc.data() as BOMLogicRule)
            .sort((a, b) => b.priority - a.priority);
    },

    getRuleById: async (id: string): Promise<BOMLogicRule | null> => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as BOMLogicRule;
        }
        return null;
    },

    deleteRule: async (id: string) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
