import { NextResponse } from "next/server";
import { SystemDefaultsService, ServiceService, FeatureService, PackageService, MetadataService, BOMService } from "@/src/lib/firebase";

export async function POST() {
    try {
        console.log("Snapshotting current database state as system defaults...");

        // Read the LIVE data from the database
        const [services, features, packages, metadata, bomRules] = await Promise.all([
            ServiceService.getAllServices(),
            FeatureService.getAllFeatures(),
            PackageService.getAllPackages(),
            MetadataService.getAllCatalogMetadata(),
            BOMService.getAllRules(),
        ]);

        // Save the live state as the new system defaults (snapshot)
        await SystemDefaultsService.saveDefaults({
            features,
            services,
            packages,
            metadata,
            bomRules,
        });

        return NextResponse.json({
            success: true,
            message: `Defaults set successfully! Snapshot contains ${services.length} services, ${features.length} features, ${packages.length} packages, and ${metadata.length} metadata catalogs.`
        });
    } catch (error) {
        console.error("Set defaults error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
