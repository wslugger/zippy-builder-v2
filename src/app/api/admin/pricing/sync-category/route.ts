import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EquipmentService } from '@/src/lib/firebase/equipment-service';
import { PricingService } from '@/src/lib/firebase/pricing-service';
import { AIPromptsService } from '@/src/lib/firebase/ai-prompts-service';
import { PromptId, Equipment } from '@/src/lib/types';

export async function POST(request: Request) {
    try {
        const { category } = await request.json();

        if (!['WAN', 'LAN', 'WLAN'].includes(category)) {
            return NextResponse.json({ error: "Invalid category. Must be WAN, LAN, or WLAN" }, { status: 400 });
        }

        const PROMPT_MAP: Record<string, PromptId> = {
            'WAN': 'license_mapping_wan',
            'LAN': 'license_mapping_lan',
            'WLAN': 'license_mapping_wlan'
        };

        // 1. Fetch data
        const [allEquip, pricingCatalog, promptConfig] = await Promise.all([
            EquipmentService.getAllEquipment(),
            PricingService.getAllPricingItems(5000),
            AIPromptsService.getPromptConfig(PROMPT_MAP[category])
        ]);

        const filteredEquip = allEquip.filter(e => e.primary_purpose === category);

        if (filteredEquip.length === 0) {
            return NextResponse.json({ message: `No equipment found for category ${category}`, count: 0 });
        }

        // 2. Prepare AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const aiModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: promptConfig.temperature,
                responseMimeType: "application/json"
            }
        });

        const syncResults = [];
        const updatedEquipBatch: Equipment[] = [];

        // 3. Process each equipment
        for (const equip of filteredEquip) {
            const results = { id: equip.id, model: equip.model, changes: [] as string[] };

            // --- Part B: License Discovery & Pricing Match ---
            try {
                const prompt = promptConfig.userPromptTemplate
                    .replace('{model}', equip.model)
                    .replace('{vendor}', equip.vendor_id);

                const aiResult = await aiModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    systemInstruction: promptConfig.systemInstruction
                });

                const text = aiResult.response.text();
                console.log(`[AI License Response for ${equip.model}]`, text);
                // We need to parse safely as json block could contain markdown.
                const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const aiData = JSON.parse(cleanText);

                if (Array.isArray(aiData.licenses) && aiData.licenses.length > 0) {
                    equip.licenses = aiData.licenses.map((l: { id: string; tier: string; termLength?: string; term?: string; listPrice?: number }) => ({
                        id: l.id,
                        tier: l.tier,
                        termLength: l.termLength || l.term || "1YR",
                        listPrice: Number(l.listPrice) || 0
                    }));

                    for (const l of aiData.licenses) {
                        const lItem = {
                            id: l.id,
                            description: l.description || `${l.tier} License - ${l.termLength || l.term || "1YR"}`,
                            listPrice: Number(l.listPrice) || 0,
                            vendor_id: equip.vendor_id
                        };
                        await PricingService.updatePricingItem(lItem.id, lItem);
                    }
                    results.changes.push(`Discovered ${aiData.licenses.length} licenses via AI`);
                }

            } catch (aiErr) {
                console.error(`AI license sync error for ${equip.id}:`, aiErr);
                results.changes.push(`AI license mapping failed`);
            }

            updatedEquipBatch.push(equip);
            syncResults.push(results);

            // Limited Sleep to be kind to API
            await new Promise(r => setTimeout(r, 200));
        }

        // 4. Save updates
        if (updatedEquipBatch.length > 0) {
            await EquipmentService.saveEquipmentBatch(updatedEquipBatch);
        }

        return NextResponse.json({
            message: `Licensing Sync complete for ${category}`,
            count: updatedEquipBatch.length,
            details: syncResults
        });

    } catch (error) {
        console.error("Licensing Sync API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
