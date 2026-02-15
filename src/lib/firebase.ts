import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Equipment, CatalogMetadata, Service, TechnicalFeature, Package } from "@/src/lib/types";
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
        // Note: Actual delete might need dedicated API or Admin SDK depending on security rules
        console.log("Delete service requested for ID:", id);
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

    saveCatalogMetadata: async (metadata: CatalogMetadata) => {
        const docRef = doc(db, METADATA_COLLECTION, metadata.id);
        const { id, ...data } = metadata;
        await setDoc(docRef, data, { merge: true });
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

export { db, storage };
