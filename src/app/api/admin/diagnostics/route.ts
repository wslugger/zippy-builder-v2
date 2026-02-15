import { NextResponse } from "next/server";
import { db } from "@/src/lib/firebase";
import { collection, getDocs, limit, query, setDoc, doc, Timestamp } from "firebase/firestore";

export async function GET() {
    try {
        const diagnostics: any = {
            status: "ok",
            steps: [],
            timestamp: new Date().toISOString(),
        };

        const log = (msg: string) => diagnostics.steps.push(`${new Date().toISOString().split('T')[1].split('.')[0]} - [Server] ${msg}`);

        // 1. Check Config
        log(`Checking Server Environment...`);
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
            throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
        }
        log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

        // 2. Test Read from Server (Node.js)
        log('Attempting READ from "equipment_catalog"...');
        const q = query(collection(db, "equipment_catalog"), limit(1));
        const snapshot = await getDocs(q);
        log(`Read successful. Documents found: ${snapshot.size}`);

        // 3. Test Write from Server (Node.js)
        log('Attempting WRITE to "diagnostics/server_connection"...');
        const testDocRef = doc(db, "diagnostics", "server_connection");
        await setDoc(testDocRef, {
            timestamp: Timestamp.now(),
            status: "online",
            agent: "ZippyBuilder Server"
        });
        log('Write successful.');

        return NextResponse.json(diagnostics);

    } catch (error: any) {
        console.error("Server Diagnostics Failed:", error);
        return NextResponse.json({
            status: "error",
            error: error.message,
            steps: [`[Server Error] ${error.message}`]
        }, { status: 500 });
    }
}
