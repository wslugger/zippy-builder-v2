import { NextResponse } from 'next/server';
import { PricingService } from '@/src/lib/firebase/pricing-service';
import { PricingItemSchema } from '@/src/lib/types';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.item) {
            return NextResponse.json({ error: 'Missing item data' }, { status: 400 });
        }

        const parsed = PricingItemSchema.safeParse(body.item);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
        }

        const item = parsed.data;

        // Check if exists
        const existing = await PricingService.getPricingItem(item.id);

        let saved;
        if (existing) {
            saved = await PricingService.updatePricingItem(item.id, item);
        } else {
            saved = await PricingService.createPricingItem(item);
        }

        return NextResponse.json({ success: true, item: saved });
    } catch (error) {
        console.error('[PricingSave] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
