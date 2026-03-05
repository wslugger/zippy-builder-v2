import { NextResponse } from "next/server";
import { db, EQUIPMENT_COLLECTION } from "@/src/lib/firebase/config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const VALID_PURPOSES = ["WAN", "LAN", "WLAN"];

export async function POST() {
    try {
        const snapshot = await getDocs(collection(db, EQUIPMENT_COLLECTION));
        const updates: { id: string; before: string[]; after: string[] }[] = [];

        for (const d of snapshot.docs) {
            const data = d.data();
            const before: string[] = data.additional_purposes || [];
            const after = before.filter(p => VALID_PURPOSES.includes(p));

            if (after.length !== before.length) {
                await updateDoc(doc(db, EQUIPMENT_COLLECTION, d.id), {
                    additional_purposes: after,
                });
                updates.push({ id: d.id, before, after });
            }
        }

        return NextResponse.json({ success: true, updated: updates.length, changes: updates });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
