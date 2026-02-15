import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Equipment } from "@/src/lib/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { equipment } = body;

        if (!equipment || !equipment.id) {
            return NextResponse.json(
                { error: "Invalid equipment data" },
                { status: 400 }
            );
        }

        const docRef = doc(db, "equipment_catalog", equipment.id);
        await setDoc(docRef, equipment as Equipment, { merge: true });

        return NextResponse.json({ success: true, id: equipment.id });
    } catch (error: any) {
        console.error("Server-side save error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save equipment" },
            { status: 500 }
        );
    }
}
