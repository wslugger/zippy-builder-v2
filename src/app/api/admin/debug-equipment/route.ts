import { NextResponse } from "next/server";
import { EquipmentService } from "@/src/lib/firebase/equipment-service";

export async function GET() {
    try {
        const all = await EquipmentService.getAllEquipment();
        const aps = all.filter(e => e.role === 'LAN' && e.vendor_id === 'meraki');
        return NextResponse.json({ success: true, count: aps.length, data: aps });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
