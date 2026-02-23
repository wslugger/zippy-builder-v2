import { doc, getDoc, setDoc } from "firebase/firestore";
import { SystemConfig, SystemConfigSchema } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, SYSTEM_CONFIG_COLLECTION } from "./config";
import { validateDoc } from "./validation";

export const SystemConfigService = {
    getConfig: async (): Promise<SystemConfig | null> => {
        const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, "global");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(SystemConfigSchema, snapshot.data(), "global");
        }
        return null;
    },

    updateConfig: async (config: Partial<SystemConfig>): Promise<void> => {
        const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, "global");
        const currentConfig = await SystemConfigService.getConfig();
        const now = new Date().toISOString();

        const updatedConfig = {
            ...(currentConfig || {}), // Ensure it's safely spread
            ...config,
            updatedAt: now,
        };

        if (!currentConfig && !config.createdAt) {
            updatedConfig.createdAt = now;
        }

        const cleaned = cleanObject(updatedConfig);
        await setDoc(docRef, cleaned, { merge: true });
    }
};
