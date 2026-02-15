import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing equipment ID" },
                { status: 400 }
            );
        }

        const docRef = doc(db, "equipment_catalog", id);
        await deleteDoc(docRef);

        return NextResponse.json({ success: true, id });
    } catch (error: unknown) {
        console.error("Server-side delete error:", error);
        return NextResponse.json(
            { error: (error as Error).message || "Failed to delete equipment" },
            { status: 500 }
        );
    }
}
