import { NextResponse } from "next/server";
import { MetadataService, FeatureService, ServiceService, PackageService } from "@/src/lib/firebase";
import { EQUIPMENT_PURPOSES, VENDOR_IDS, SERVICE_CATEGORIES, DESIGN_OPTION_CATEGORIES } from "@/src/lib/types";
import { SEED_FEATURES, SEED_SERVICES, SEED_PACKAGES } from "@/src/lib/seed-data";

export async function GET() {
    try {
        // 1. Seed Equipment Metadata
        await MetadataService.saveCatalogMetadata({
            id: "equipment_catalog",
            fields: {
                purposes: {
                    label: "Purposes",
                    values: [...EQUIPMENT_PURPOSES],
                },
                vendors: {
                    label: "Vendors",
                    values: [...VENDOR_IDS]
                }
            },
        });

        // 2. Seed Service Catalog Metadata
        await MetadataService.saveCatalogMetadata({
            id: "service_catalog",
            fields: {
                service_categories: {
                    label: "Service Categories",
                    values: [...SERVICE_CATEGORIES]
                },
                design_option_categories: {
                    label: "Design Option Categories",
                    values: [...DESIGN_OPTION_CATEGORIES]
                }
            }
        });

        // 3. Seed Technical Features
        console.log("Seeding features...");
        await FeatureService.saveFeatureBatch(SEED_FEATURES);

        // 4. Seed Services
        console.log("Seeding services...");
        for (const service of SEED_SERVICES) {
            await ServiceService.saveService(service);
        }

        // 5. Seed Packages
        console.log("Seeding packages...");
        for (const pkg of SEED_PACKAGES) {
            await PackageService.savePackage(pkg);
        }

        return NextResponse.json({ success: true, message: "Database seeded successfully! Catalog populated with Services, Features, and Packages." });
    } catch (error) {
        console.error("Seeding error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        console.log("Cleaning up seeded data...");

        // 1. Delete Packages
        for (const pkg of SEED_PACKAGES) {
            await PackageService.deletePackage(pkg.id);
        }

        // 2. Delete Services
        for (const service of SEED_SERVICES) {
            await ServiceService.deleteService(service.id);
        }

        // 3. Delete Features
        for (const feature of SEED_FEATURES) {
            await FeatureService.deleteFeature(feature.id);
        }

        return NextResponse.json({
            success: true,
            message: "Cleanup successful! All seeded Services, Packages, and Features have been removed."
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
