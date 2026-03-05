import { NextResponse } from "next/server";
import { db, EQUIPMENT_COLLECTION, SYSTEM_CONFIG_COLLECTION } from "@/src/lib/firebase/config";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";

const VALID_PURPOSES = ["WAN", "LAN", "WLAN"];

const PURPOSE_TO_SERVICE: Record<string, string> = {
    WAN: "Managed SD-WAN",
    LAN: "Managed LAN",
    WLAN: "Managed Wi-Fi",
};

export async function POST() {
    try {
        const snapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        const updates: { id: string; changes: Record<string, unknown> }[] = [];

        for (const d of snapshot.docs) {
            const data = d.data();
            const changes: Record<string, unknown> = {};

            // Strip invalid additional_purposes
            const before: string[] = data.additional_purposes || [];
            const cleanedPurposes = before.filter(p => VALID_PURPOSES.includes(p));
            if (cleanedPurposes.length !== before.length) {
                changes.additional_purposes = cleanedPurposes;
            }

            // Map primary_purpose to mapped_services
            const primaryPurpose: string = data.primary_purpose || "";
            const allPurposes = [primaryPurpose, ...cleanedPurposes].filter(p => VALID_PURPOSES.includes(p));
            const expectedServices = allPurposes.map(p => PURPOSE_TO_SERVICE[p]).filter(Boolean);

            if (expectedServices.length > 0) {
                const currentServices: string[] = data.mapped_services || [];
                // Merge: keep any existing services, add expected ones if missing
                const merged = Array.from(new Set([...currentServices, ...expectedServices]));
                if (merged.length !== currentServices.length || !expectedServices.every(s => currentServices.includes(s))) {
                    changes.mapped_services = merged;
                }
            }

            if (Object.keys(changes).length > 0) {
                await updateDoc(doc(db, EQUIPMENT_COLLECTION, d.id), changes);
                updates.push({ id: d.id, changes });
            }
        }

        // Also clean the taxonomy doc in system config
        const configRef = doc(db, SYSTEM_CONFIG_COLLECTION, "global");
        const configSnap = await getDoc(configRef);
        let taxonomyFixed = false;
        if (configSnap.exists()) {
            const configData = configSnap.data();
            const taxonomy = configData.taxonomy || {};
            const currentPurposes: string[] = taxonomy.purposes || [];
            const cleanedTaxonomyPurposes = currentPurposes.filter(p => VALID_PURPOSES.includes(p));
            if (cleanedTaxonomyPurposes.length !== currentPurposes.length) {
                await updateDoc(configRef, { "taxonomy.purposes": cleanedTaxonomyPurposes });
                taxonomyFixed = true;
            }
        }

        return NextResponse.json({ success: true, updated: updates.length, changes: updates, taxonomyFixed });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
