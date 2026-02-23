import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

const SETTINGS_DOC = 'settings/bom_engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGlobalParameters(): Promise<Record<string, any>> {
    try {
        const docRef = doc(db, SETTINGS_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return docSnap.data() as Record<string, any>;
        }
    } catch (error) {
        console.error("Error fetching global parameters:", error);
    }
    return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateGlobalParameters(params: Record<string, any>): Promise<void> {
    try {
        const docRef = doc(db, SETTINGS_DOC);

        // Attempt to update first
        try {
            await updateDoc(docRef, params);
        } catch {
            // If document doesn't exist, create it via setDoc
            await setDoc(docRef, params);
        }
    } catch (error) {
        console.error("Error updating global parameters:", error);
        throw error;
    }
}
