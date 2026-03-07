/**
 * One-time seed script for the Pricing Catalog.
 * Tests Cisco and Meraki format ingestion and SKU matching.
 */

import { PricingService } from "./firebase/pricing-service";
import { EquipmentService } from "./firebase/equipment-service";

async function seedPricingCatalog() {
    console.log("Starting Pricing Catalog Seed...");

    const samplePricingItems = [
        // Cisco Catalyst 3650 
        {
            id: "C3650-DNA-E-24-5Y",
            listPrice: 1206.54,
            description: "C3650 DNA Essentials, 24-port, 5 Year Term license",
        },
        // Meraki MX67 
        {
            id: "MX67-HW",
            listPrice: 795.00,
            description: "Meraki MX67 Cloud Managed Security Appliance",
        },
        // Licensing
        {
            id: "LIC-MX67-ENT-3Y",
            listPrice: 650.00,
            description: "Meraki MX67 Enterprise License and Support, 3 Years",
        }
    ];

    for (const item of samplePricingItems) {
        try {
            await PricingService.createPricingItem(item);
            console.log(`Seeded: ${item.id}`);
        } catch (e) {
            console.error(`Failed to seed ${item.id}:`, e);
        }
    }

    console.log("Seeding complete. Testing connection to equipment...");

    // Test Match
    const equipment = await EquipmentService.getAllEquipment();
    const pricing = await PricingService.getAllPricingItems();

    console.log(`Found ${equipment.length} equipment items and ${pricing.length} pricing items.`);

    const sampleMatch = equipment.find(e => e.model.includes("3650"));
    if (sampleMatch) {
        console.log(`Match Test: Equipment ${sampleMatch.model} (pricingSku: ${sampleMatch.pricingSku || 'None'})`);
        const lookupId = sampleMatch.pricingSku || sampleMatch.id;
        const priceItem = pricing.find(p => p.id === lookupId);
        if (priceItem) {
            console.log(`✅ SUCCESS: Found price entry for ${sampleMatch.model} -> $${priceItem.listPrice}`);
        } else {
            console.log(`❌ FAIL: No price entry found for ${sampleMatch.model} using ID ${lookupId}`);
        }
    }
}

// In a real environment, you'd run this via a CLI or one-time API route.
// For this task, we can wrap it in an API route for easy execution if needed,
// but for now I'll just provide the code.
