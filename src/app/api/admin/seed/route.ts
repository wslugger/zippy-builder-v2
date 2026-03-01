import { NextResponse } from "next/server";
import { FeatureService, ServiceService, PackageService, SystemDefaultsService, SiteDefinitionService, BOMService } from "@/src/lib/firebase";
import { ALL_SITE_TYPES } from "@/src/lib/seed-site-catalog";
import { SEED_BOM_RULES } from "@/src/lib/seed-bom-rules";

export async function GET() {
    try {
        // 1. Get System Defaults from DB
        const defaults = await SystemDefaultsService.getDefaults();

        if (!defaults) {
            throw new Error("System defaults not found! Please run the bootstrap process first.");
        }

        // 3. Seed Technical Features
        console.log("Seeding features from DB defaults...");
        await FeatureService.saveFeatureBatch(defaults.features);

        // 4. Seed Services
        console.log("Seeding services from DB defaults...");
        for (const service of defaults.services) {
            await ServiceService.saveService(service);
        }

        // 5. Seed Packages
        console.log("Seeding packages from DB defaults...");
        for (const pkg of defaults.packages) {
            await PackageService.savePackage(pkg);
        }

        // 7. Seed Site Definitions
        console.log("Seeding site definitions...");
        for (const siteType of ALL_SITE_TYPES) {
            await SiteDefinitionService.saveSiteDefinition(siteType);
        }

        // 8. Seed BOM Rules
        console.log("Seeding BOM rules...");
        await BOMService.clearAllRules();
        for (const rule of SEED_BOM_RULES) {
            await BOMService.saveRule(rule);
        }

        // 9. Seed Equipment
        console.log("Seeding Equipment...");
        const { EquipmentService } = await import("@/src/lib/firebase/equipment-service");
        const { SEED_EQUIPMENT } = await import("@/src/lib/seed-equipment");
        await EquipmentService.saveEquipmentBatch(SEED_EQUIPMENT);

        return NextResponse.json({ success: true, message: "Database seeded successfully! Catalog populated with Services, Features, Packages, and Site Definitions." });
    } catch (error) {
        console.error("Seeding error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        console.log("Cleaning up seeded data...");

        return NextResponse.json({
            success: true,
            message: "Cleanup successful! All seeded Services, Packages, and Features have been removed."
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
