import { NextResponse } from "next/server";
import { db, FEATURES_COLLECTION, SERVICE_COLLECTION } from "@/src/lib/firebase/config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export async function POST() {
    try {
        // Build the allowlist from actual service names in the service catalog
        const servicesSnap = await getDocs(collection(db, SERVICE_COLLECTION));
        const validServiceNames = new Set(
            servicesSnap.docs.map(d => (d.data().name as string)).filter(Boolean)
        );

        const featuresSnap = await getDocs(collection(db, FEATURES_COLLECTION));
        const updates: { id: string; before: string[]; after: string[] }[] = [];

        for (const d of featuresSnap.docs) {
            const data = d.data();
            const current: string[] = Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []);
            const cleaned = current.filter(cat => validServiceNames.has(cat));

            if (cleaned.length !== current.length) {
                await updateDoc(doc(db, FEATURES_COLLECTION, d.id), { category: cleaned });
                updates.push({ id: d.id, before: current, after: cleaned });
            }
        }

        return NextResponse.json({
            success: true,
            validServices: Array.from(validServiceNames),
            updated: updates.length,
            changes: updates,
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
