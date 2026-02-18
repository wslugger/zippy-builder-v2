import { collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Project } from "@/src/lib/types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, storage, PROJECTS_COLLECTION } from "./config";

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
