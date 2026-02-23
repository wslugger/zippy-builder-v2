import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config
const missingKeys = Object.entries(firebaseConfig)
    .filter(([__, value]) => !value)
    .map(([key]) => key);

if (missingKeys.length > 0 && typeof window !== 'undefined') {
    console.warn(`Firebase Configuration Warning: The following keys are missing: ${missingKeys.join(', ')}. This may cause issues with Firebase services.`);
}

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = initializeFirestore(app, {});

let storage: FirebaseStorage;
try {
    storage = getStorage(app);
} catch (error) {
    console.error("Failed to initialize Firebase Storage. Ensure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is set.", error);
    // @ts-expect-error - storage might be undefined if initialization fails
    storage = undefined;
}

export { storage };

// Collection name constants
export const EQUIPMENT_COLLECTION = "equipment_catalog";
export const METADATA_COLLECTION = "catalog_metadata";
export const SERVICE_COLLECTION = "service_catalog";
export const FEATURES_COLLECTION = "technical_features";
export const PACKAGES_COLLECTION = "packages_catalog";
export const PROJECTS_COLLECTION = "projects";
export const DEFAULTS_COLLECTION = "system_defaults";
export const SITE_DEFINITIONS_COLLECTION = "site_definitions";
export const BOM_RULES_COLLECTION = "bom_rules";
export const SYSTEM_CONFIG_COLLECTION = "system_config";
