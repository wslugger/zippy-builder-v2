import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Project, Equipment } from "@/src/lib/types";
import { Site } from "@/src/lib/bom-types";
import { cleanObject } from "@/src/lib/feature-utils";
import { db, storage, PROJECTS_COLLECTION } from "./config";
import { validateDoc, ProjectSchema } from "./validation";

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
            return validateDoc(ProjectSchema, snapshot.data(), projectId);
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
        // Server-side query: only fetches this user's projects, ordered by most recent
        // Requires a composite index on (userId, updatedAt) — Firestore will auto-prompt
        // to create it on the first query, or it can be added via firebase.json indexes.
        try {
            const projectsRef = collection(db, PROJECTS_COLLECTION);
            const q = query(
                projectsRef,
                where("userId", "==", userId),
                orderBy("updatedAt", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => validateDoc(ProjectSchema, d.data(), d.id));
        } catch (error) {
            // Fallback to client-side filtering if index is missing
            console.warn("[ProjectService] Server-side query failed (missing index?), falling back to client-side filter:", error);
            const projectsRef = collection(db, PROJECTS_COLLECTION);
            const snapshot = await getDocs(projectsRef);
            return snapshot.docs
                .map(d => validateDoc(ProjectSchema, d.data(), d.id))
                .filter(p => p.userId === userId)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
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
    },

    getAllProjects: async (): Promise<Project[]> => {
        try {
            const projectsRef = collection(db, PROJECTS_COLLECTION);
            const snapshot = await getDocs(projectsRef);
            return snapshot.docs.map(d => validateDoc(ProjectSchema, d.data(), d.id));
        } catch (error) {
            console.error("[ProjectService] Failed to fetch all projects:", error);
            throw error;
        }
    },

    saveSites: async (projectId: string, sites: Site[]): Promise<void> => {
        try {
            const batch = writeBatch(db);
            const sitesRef = collection(db, PROJECTS_COLLECTION, projectId, "sites");

            // Note: In a full app, you might want to delete obsolete sites, but for now we just overwrite/update
            sites.forEach((site) => {
                const docRef = site.id ? doc(sitesRef, site.id) : doc(sitesRef);
                const data = cleanObject({ ...site, id: docRef.id });
                batch.set(docRef, data);
            });

            await batch.commit();
        } catch (error) {
            console.error("[ProjectService] Failed to save sites:", error);
            throw error;
        }
    },

    finalizeProject: async (projectId: string, equipment: Equipment[]): Promise<void> => {
        try {
            const docRef = doc(db, PROJECTS_COLLECTION, projectId);
            const now = new Date().toISOString();

            // Clone only the necessary parts of the equipment (or the whole thing as requested)
            // to fulfill the "EmbeddedEquipmentSnapshot" requirement if we want strictness,
            // but the instructions say "fetch current full technical specifications of all equipment in the BOM"
            // and "Save these specs into a new embeddedEquipment array".
            const embeddedEquipment = equipment.map(e => cleanObject({
                ...e,
                clonedAt: now
            }));

            await setDoc(docRef, {
                status: "completed",
                embeddedEquipment,
                updatedAt: now
            }, { merge: true });

            console.log(`[ProjectService] Project ${projectId} finalized with ${embeddedEquipment.length} items cloned.`);
        } catch (error) {
            console.error("[ProjectService] Finalization Failed:", error);
            throw error;
        }
    }
};
