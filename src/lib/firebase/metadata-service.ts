import { collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { CatalogMetadata } from "@/src/lib/types";
import { db, METADATA_COLLECTION } from "./config";

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
