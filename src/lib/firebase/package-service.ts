import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Package } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { applyTimestamps } from "@/src/lib/timestamps";
import { db, storage, PACKAGES_COLLECTION } from "./config";
import { validateDoc, validateDocs, PackageSchema } from "./validation";

export const PackageService = {
    savePackage: async (pkg: Package) => {
        const docRef = doc(db, PACKAGES_COLLECTION, pkg.id);
        const stamped = applyTimestamps(pkg);
        const cleaned = cleanObject(stamped);
        await setDoc(docRef, cleaned, { merge: true });
        return pkg.id;
    },

    getAllPackages: async (): Promise<Package[]> => {
        const snapshot = await getDocs(collection(db, PACKAGES_COLLECTION));
        return validateDocs(PackageSchema, snapshot.docs);
    },

    getPackageById: async (id: string): Promise<Package | null> => {
        const docRef = doc(db, PACKAGES_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return validateDoc(PackageSchema, snapshot.data(), id);
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
