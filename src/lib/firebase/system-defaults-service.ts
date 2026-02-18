import { doc, setDoc, getDoc } from "firebase/firestore";
import { TechnicalFeature, Service, Package, CatalogMetadata, WorkflowStep } from "@/src/lib/types";
import { BOMLogicRule } from "@/src/lib/bom-types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, DEFAULTS_COLLECTION } from "./config";

interface SystemDefaults {
    features: TechnicalFeature[];
    services: Service[];
    packages: Package[];
    metadata: CatalogMetadata[];
    workflowSteps?: WorkflowStep[];
    bomRules?: BOMLogicRule[];
}

export const SystemDefaultsService = {
    saveDefaults: async (defaults: SystemDefaults) => {
        const docRef = doc(db, DEFAULTS_COLLECTION, "global");
        const cleaned = cleanObject(defaults);
        await setDoc(docRef, cleaned);
    },

    async getDefaults(): Promise<SystemDefaults | null> {
        const docRef = doc(db, DEFAULTS_COLLECTION, "global");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as SystemDefaults;
        }
        return null;
    },

    updateServiceInDefaults: async (service: Service) => {
        const docRef = doc(db, DEFAULTS_COLLECTION, "global");
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const defaults = snapshot.data() as SystemDefaults;
            const services = defaults.services || [];

            // Find index of existing service
            const index = services.findIndex(s => s.id === service.id);

            if (index !== -1) {
                // Update existing
                services[index] = service;
            } else {
                // Add new
                services.push(service);
            }

            const cleaned = cleanObject({ ...defaults, services });
            await setDoc(docRef, cleaned);
        }
    },

    async getWorkflowSteps(): Promise<WorkflowStep[] | null> {
        const defaults = await this.getDefaults();
        return defaults?.workflowSteps || null;
    },

    async saveWorkflowSteps(steps: WorkflowStep[]) {
        const docRef = doc(db, DEFAULTS_COLLECTION, "global");
        await setDoc(docRef, { workflowSteps: steps }, { merge: true });
    }
};
