import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { BOMLogicRule } from "@/src/lib/bom-types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, BOM_RULES_COLLECTION } from "./config";
import { validateDoc, validateDocs, BOMLogicRuleSchema } from "./validation";
import { z } from "zod";

// Cast the schema since Zod infers `field: string` but BOMLogicRule uses a specific union type.
// The validation still catches structural issues, just not the specific field name values.
const RuleSchema = BOMLogicRuleSchema as z.ZodType<BOMLogicRule>;

export const BOMService = {
    saveRule: async (rule: BOMLogicRule) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, rule.id);
        const cleaned = cleanObject(rule);
        await setDoc(docRef, cleaned, { merge: true });
        return rule.id;
    },

    getAllRules: async (): Promise<BOMLogicRule[]> => {
        const snapshot = await getDocs(collection(db, BOM_RULES_COLLECTION));
        return validateDocs(RuleSchema, snapshot.docs)
            .sort((a, b) => b.priority - a.priority);
    },

    getRuleById: async (id: string): Promise<BOMLogicRule | null> => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(RuleSchema, snapshot.data(), id);
        }
        return null;
    },

    deleteRule: async (id: string) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
