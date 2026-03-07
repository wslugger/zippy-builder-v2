import { NextResponse } from 'next/server';
import { PricingService } from '@/src/lib/firebase/pricing-service';

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        await PricingService.deletePricingItem(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[PricingDelete] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
