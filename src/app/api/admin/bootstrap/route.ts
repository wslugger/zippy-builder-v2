import { NextResponse } from "next/server";
import { SystemDefaultsService } from "@/src/lib/firebase";
import { SEED_FEATURES, SEED_SERVICES, SEED_PACKAGES, SEED_METADATA } from "@/src/lib/seed-data";

export async function POST() {
    try {
        console.log("Bootstrapping system defaults from code...");

        await SystemDefaultsService.saveDefaults({
            features: SEED_FEATURES,
            services: SEED_SERVICES,
            packages: SEED_PACKAGES,
            metadata: SEED_METADATA
        });

        return NextResponse.json({
            success: true,
            message: "System defaults bootstrapped successfully! You can now seed the database using these defaults."
        });
    } catch (error) {
        console.error("Bootstrap error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
