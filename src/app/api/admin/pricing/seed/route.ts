import { NextResponse } from 'next/server';
import { PricingService } from '@/src/lib/firebase/pricing-service';
import { PricingItem } from '@/src/lib/types';

export async function POST() {
    try {
        const samplePricingItems: (Omit<PricingItem, 'id'> & { id: string })[] = [
            {
                id: "C3650-DNA-E-24-5Y",
                listPrice: 1206.54,
                description: "C3650 DNA Essentials, 24-port, 5 Year Term license",
            },
            {
                id: "MX67-HW",
                listPrice: 795.00,
                description: "Meraki MX67 Cloud Managed Security Appliance",
            },
            {
                id: "LIC-MX67-ENT-3Y",
                listPrice: 650.00,
                description: "Meraki MX67 Enterprise License and Support, 3 Years",
            }
        ];

        let seededCount = 0;
        for (const item of samplePricingItems) {
            await PricingService.createPricingItem(item);
            seededCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${seededCount} items successfully.`
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
