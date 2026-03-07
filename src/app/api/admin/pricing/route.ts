import { NextResponse } from 'next/server';
import { PricingService } from '@/src/lib/firebase/pricing-service';

export async function GET() {
    try {
        const items = await PricingService.getAllPricingItems();
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching pricing items:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
