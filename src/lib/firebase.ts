import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Equipment, CatalogMetadata, Service, TechnicalFeature, Package, Project } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with settings to avoid hanging on some networks
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
const storage = getStorage(app);

// Collection References
const EQUIPMENT_COLLECTION = "equipment_catalog";

export const EquipmentService = {
    saveEquipment: async (equipment: Equipment) => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, equipment.id);
        const cleaned = cleanObject(equipment);
        await setDoc(docRef, cleaned, { merge: true });
        return equipment.id;
    },

    /**
     * Save multiple Equipment items in a single batch
     */
    saveEquipmentBatch: async (items: Equipment[]) => {
        const batch = writeBatch(db);

        items.forEach((item) => {
            const docRef = doc(db, EQUIPMENT_COLLECTION, item.id);
            const cleaned = cleanObject(item);
            batch.set(docRef, cleaned, { merge: true });
        });

        await batch.commit();
        return items.length;
    },

    /**
     * Get all Equipment
     */
    getAllEquipment: async (): Promise<Equipment[]> => {
        const snapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as Equipment);
    },

    /**
     * Get single Equipment by ID
     */
    getEquipmentById: async (id: string): Promise<Equipment | null> => {
        const docRef = doc(db, EQUIPMENT_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Equipment;
        }
        return null;
    },
};

const METADATA_COLLECTION = "catalog_metadata";
const SERVICE_COLLECTION = "service_catalog";

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

export const MetadataService = {
    getCatalogMetadata: async (catalogId: string): Promise<CatalogMetadata | null> => {
        const docRef = doc(db, METADATA_COLLECTION, catalogId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as CatalogMetadata;
        }
        return null;
    },

    saveCatalogMetadata: async (metadata: CatalogMetadata, overwrite: boolean = false) => {
        const docRef = doc(db, METADATA_COLLECTION, metadata.id);
        const { id, ...data } = metadata;
        await setDoc(docRef, data, { merge: !overwrite });
        return id;
    },

    getAllCatalogMetadata: async (): Promise<CatalogMetadata[]> => {
        const snapshot = await getDocs(collection(db, METADATA_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogMetadata));
    },

    updateCatalogField: async (catalogId: string, fieldKey: string, newValue: string) => {
        const docRef = doc(db, METADATA_COLLECTION, catalogId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            const fields = data.fields || {};
            const field = fields[fieldKey] || { label: fieldKey.replace(/_/g, ' '), values: [] };

            if (!field.values.includes(newValue)) {
                field.values.push(newValue);
                await setDoc(docRef, {
                    fields: {
                        ...fields,
                        [fieldKey]: field
                    }
                }, { merge: true });
            }
        } else {
            // Create the catalog if it doesn't exist (safety)
            await setDoc(docRef, {
                fields: {
                    [fieldKey]: {
                        label: fieldKey.replace(/_/g, ' '),
                        values: [newValue]
                    }
                }
            });
        }
    }
};

const FEATURES_COLLECTION = "technical_features";
const PACKAGES_COLLECTION = "packages_catalog";

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

export const PackageService = {
    savePackage: async (pkg: Package) => {
        const docRef = doc(db, PACKAGES_COLLECTION, pkg.id);
        const cleaned = cleanObject(pkg);
        await setDoc(docRef, cleaned, { merge: true });
        return pkg.id;
    },

    getAllPackages: async (): Promise<Package[]> => {
        const snapshot = await getDocs(collection(db, PACKAGES_COLLECTION));
        return snapshot.docs.map((doc) => doc.data() as Package);
    },

    getPackageById: async (id: string): Promise<Package | null> => {
        const docRef = doc(db, PACKAGES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Package;
        }
        return null;
    },

    deletePackage: async (id: string) => {
        const docRef = doc(db, PACKAGES_COLLECTION, id);
        await deleteDoc(docRef);
    },

    uploadCollateral: async (packageId: string, file: File, type: string) => {
        try {
            console.log("Starting upload to Storage for:", file.name);
            const path = `packages/${packageId}/collateral/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);

            console.log("Uploading bytes to path:", path);
            const snapshot = await uploadBytes(storageRef, file);

            console.log("Upload succesful. Metadata:", snapshot.metadata);
            console.log("Retrieving download URL...");
            const url = await getDownloadURL(snapshot.ref);

            console.log("URL retrieved:", url);
            const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2, 11);

            return {
                id,
                name: file.name.split('.')[0],
                type,
                url,
                file_name: file.name,
                uploaded_at: new Date().toISOString()
            };
        } catch (error) {
            console.error("Firebase Storage Upload Error:", error);
            throw error;
        }
    },

    deleteCollateral: async (url: string) => {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    }
};

const PROJECTS_COLLECTION = "projects";
const DEFAULTS_COLLECTION = "system_defaults";

interface SystemDefaults {
    features: TechnicalFeature[];
    services: Service[];
    packages: Package[];
    metadata: CatalogMetadata[];
    workflowSteps?: import("./types").WorkflowStep[];
    bomRules?: import("./bom-types").BOMLogicRule[];
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

    async getWorkflowSteps(): Promise<import("./types").WorkflowStep[] | null> {
        const defaults = await this.getDefaults();
        return defaults?.workflowSteps || null;
    },

    async saveWorkflowSteps(steps: import("./types").WorkflowStep[]) {
        const docRef = doc(db, DEFAULTS_COLLECTION, "global");
        await setDoc(docRef, { workflowSteps: steps }, { merge: true });
    }
};

export const ProjectService = {
    createProject: async (project: Project): Promise<string> => {
        const docRef = doc(db, PROJECTS_COLLECTION, project.id);
        const cleaned = cleanObject(project);
        await setDoc(docRef, cleaned);
        return project.id;
    },

    getProject: async (projectId: string): Promise<Project | null> => {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Project;
        }
        return null;
    },

    updateProject: async (projectId: string, updates: Partial<Project>): Promise<void> => {
        const docRef = doc(db, PROJECTS_COLLECTION, projectId);
        const cleaned = cleanObject(updates);
        // Always update updatedAt
        cleaned.updatedAt = new Date().toISOString();
        await setDoc(docRef, cleaned, { merge: true });
    },

    getUserProjects: async (userId: string): Promise<Project[]> => {
        // Note: Requires an index on userId in production
        // For now, we'll fetch all and filter client-side if dataset is small, 
        // OR ideally use a query. Let's try query.
        // If query fails due to missing index, we might need to fallback or create index.
        const projectsRef = collection(db, PROJECTS_COLLECTION);
        const snapshot = await getDocs(projectsRef);

        const projects = snapshot.docs
            .map(doc => doc.data() as Project)
            .filter(p => p.userId === userId)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return projects;
    },

    uploadRequirements: async (projectId: string, file: File) => {
        try {
            const path = `projects/${projectId}/requirements/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            return url;
        } catch (error) {
            console.error("Requirements Upload Error:", error);
            throw error;
        }
    }
};

import { SiteType } from "./site-types";

const SITE_DEFINITIONS_COLLECTION = "site_definitions";

const BOM_RULES_COLLECTION = "bom_rules";

export const BOMService = {
    saveRule: async (rule: import("./bom-types").BOMLogicRule) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, rule.id);
        const cleaned = cleanObject(rule);
        await setDoc(docRef, cleaned, { merge: true });
        return rule.id;
    },

    getAllRules: async (): Promise<import("./bom-types").BOMLogicRule[]> => {
        const snapshot = await getDocs(collection(db, BOM_RULES_COLLECTION));
        return snapshot.docs
            .map((doc) => doc.data() as import("./bom-types").BOMLogicRule)
            .sort((a, b) => b.priority - a.priority);
    },

    getRuleById: async (id: string): Promise<import("./bom-types").BOMLogicRule | null> => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as import("./bom-types").BOMLogicRule;
        }
        return null;
    },

    deleteRule: async (id: string) => {
        const docRef = doc(db, BOM_RULES_COLLECTION, id);
        await deleteDoc(docRef);
    }
};

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

export { db, storage };
