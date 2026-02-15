import { NextResponse } from "next/server";
import { MetadataService, EquipmentService } from "@/src/lib/firebase";
import { EQUIPMENT_PURPOSES, VENDOR_IDS } from "@/src/lib/types";

export async function GET() {
    try {
        // 1. Seed Metadata
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

        // 2. Seed a sample Equipment item (Meraki MX67)
        await EquipmentService.saveEquipment({
            id: "meraki_mx67",
            model: "MX67",
            active: true,
            status: "Supported",
            vendor_id: "meraki",
            purpose: ["SDWAN"],
            family: "Meraki MX",
            description: "Cloud-managed security & SD-WAN appliance",
            specs: {
                ngfw_throughput_mbps: 450,
                vpn_throughput_mbps: 200,
                wan_interfaces_count: 2,
                wan_interfaces_desc: "1x GbE RJ45, 1x GbE SFP",
                lan_interfaces_count: 4,
                lan_interfaces_desc: "4x GbE RJ45",
                integrated_wifi: false,
                recommended_use_case: "Small Branch",
                max_clients: 50,
            },
        });

        return NextResponse.json({ success: true, message: "Database seeded successfully! Please refresh the Catalog page." });
    } catch (error) {
        console.error("Seeding error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
