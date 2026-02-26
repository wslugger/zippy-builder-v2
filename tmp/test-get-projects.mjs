import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { z } from "zod";

const firebaseConfig = {
    apiKey: "AIzaSyBgrix7fRr_A51epBTEpfhqfKTxHYf6meM",
    authDomain: "zippy-builder-v2.firebaseapp.com",
    projectId: "zippy-builder-v2",
    storageBucket: "zippy-builder-v2.firebasestorage.app",
    messagingSenderId: "857649274021",
    appId: "1:857649274021:web:f40ad5c777f1c9f1a3c14c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Copy from validation.ts
export function validateDoc(schema, data, docId) {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.warn(
            `[Firestore Validation] Document "${docId}" has schema issues:`,
            result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
        );
        return data; // Graceful fallback
    }
    return result.data;
}

const ProjectSchema = z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    customerName: z.string(),
    description: z.string().optional(),
    status: z.enum(["draft", "package_selection", "customizing", "completed"]).default("draft"),
    currentStep: z.number().default(1),
    selectedPackageId: z.string().optional(),
    packageConfidenceScore: z.number().optional(),
    packageReasoning: z.string().optional(),
    requirementsFiles: z.array(z.string()).optional(),
    requirementsText: z.string().optional(),
    selectedFeatures: z.array(z.string()).optional(),
    selectedDesignOptions: z.record(z.string(), z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

async function main() {
    try {
        const userId = "user_123";
        const projectsRef = collection(db, "projects");
        const q = query(
            projectsRef,
            where("userId", "==", userId),
            orderBy("updatedAt", "desc")
        );
        const snapshot = await getDocs(q);
        console.log(`Initial query returned ${snapshot.docs.length} docs`);
    } catch (error) {
        console.log("Initial query threw:", error.message);
        try {
            console.log("Falling back...");
            const projectsRef = collection(db, "projects");
            const snapshot = await getDocs(projectsRef);
            console.log(`Fallback getDocs returned ${snapshot.docs.length}`);

            const rawDocs = snapshot.docs;
            const validated = rawDocs.map(d => validateDoc(ProjectSchema, d.data(), d.id));
            const filtered = validated.filter(p => p.userId === "user_123");
            const sorted = filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            console.log(`Final sorted array has ${sorted.length} projects`);
        } catch (e2) {
            console.error("Fallback threw:", e2);
        }
    }
}

main().then(() => process.exit(0));
