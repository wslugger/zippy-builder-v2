import { NextRequest, NextResponse } from "next/server";
import { collectionGroup, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/src/lib/firebase/config";
import { EmbeddedEquipmentSnapshot } from "@/src/lib/types";

export async function POST(req: NextRequest) {
    try {
        const { equipmentId, newModelName, newThroughput, newPorts } = await req.json();

        if (!equipmentId) {
            return NextResponse.json({ success: false, error: "equipmentId is required" }, { status: 400 });
        }

        // NOTE: Querying inside an array of objects is not directly supported by Firestore.
        // In a production scenario, you would maintain an `equipmentIds` string array field 
        // to use `array-contains` for this query. For demonstration, we will fetch all active 
        // projects' sites and filter server-side.

        const sitesQuery = query(collectionGroup(db, "sites"));
        const sitesSnap = await getDocs(sitesQuery);

        const batch = writeBatch(db);
        let updatedCount = 0;

        sitesSnap.forEach(siteDoc => {
            const data = siteDoc.data();
            if (!data.embeddedEquipment) return;

            // Check if this site contains the equipment
            const hasEquipment = data.embeddedEquipment.some((eq: EmbeddedEquipmentSnapshot) => eq.id === equipmentId);
            if (!hasEquipment) return;

            const updatedEquipment = data.embeddedEquipment.map((eq: EmbeddedEquipmentSnapshot) => {
                if (eq.id === equipmentId) {
                    return {
                        ...eq,
                        model: newModelName ?? eq.model,
                        specs_summary: {
                            ...eq.specs_summary,
                            throughput: newThroughput ?? eq.specs_summary?.throughput,
                            ports: newPorts ?? eq.specs_summary?.ports,
                        }
                    };
                }
                return eq;
            });

            batch.update(siteDoc.ref, { embeddedEquipment: updatedEquipment });
            updatedCount++;
        });

        await batch.commit();
        return NextResponse.json({ success: true, updatedSitesCount: updatedCount });
    } catch (error) {
        console.error("Error in sync-equipment route:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
