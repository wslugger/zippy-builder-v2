import { NextResponse } from 'next/server';
import { PricingService } from '@/src/lib/firebase/pricing-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const limitCount = limitParam ? parseInt(limitParam) : 5000;

        const items = await PricingService.getAllPricingItems(limitCount);
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching pricing items:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
