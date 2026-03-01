import { NextResponse } from "next/server";
import { EquipmentService } from "@/src/lib/firebase/equipment-service";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";

export async function GET() {
    try {
        console.log("Seeding equipment catalog...");
        const count = await EquipmentService.saveEquipmentBatch(SEED_EQUIPMENT);
        return NextResponse.json({ success: true, message: `Successfully seeded ${count} equipment items.` });
    } catch (error) {
        console.error("Seeding error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
