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
            'WAN': 'pricing_mapping_wan',
            'LAN': 'pricing_mapping_lan',
            'WLAN': 'pricing_mapping_wlan'
        };

        // 1. Fetch data
        const [allEquip, promptConfig] = await Promise.all([
            EquipmentService.getAllEquipment(),
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
            
            try {
                const prompt = promptConfig.userPromptTemplate
                    .replace('{model}', equip.model)
                    .replace('{vendor}', equip.vendor_id);

                const aiResult = await aiModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    systemInstruction: promptConfig.systemInstruction
                });

                const text = aiResult.response.text();
                const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const aiData = JSON.parse(cleanText);

                if (aiData.hardwareSku) {
                    equip.pricingSku = aiData.hardwareSku;
                    equip.pricingSkuConfirmed = true;
                    equip.pricingSku_listPrice = Number(aiData.listPrice) || 0;
                    
                    const pItem = {
                        id: aiData.hardwareSku,
                        description: aiData.description || `${equip.model} Base Unit`,
                        listPrice: Number(aiData.listPrice) || 0,
                        vendor_id: equip.vendor_id
                    };
                    await PricingService.updatePricingItem(pItem.id, pItem);
                    results.changes.push(`Mapped Hardware: ${pItem.id} ($${pItem.listPrice})`);
                }

            } catch (aiErr) {
                console.error(`AI pricing sync error for ${equip.id}:`, aiErr);
                results.changes.push(`AI pricing mapping failed`);
            }

            updatedEquipBatch.push(equip);
            syncResults.push(results);
            await new Promise(r => setTimeout(r, 200));
        }

        // 4. Save updates
        if (updatedEquipBatch.length > 0) {
            await EquipmentService.saveEquipmentBatch(updatedEquipBatch);
        }

        return NextResponse.json({
            message: `Hardware Sync complete for ${category}`,
            count: updatedEquipBatch.length,
            details: syncResults
        });

    } catch (error) {
        console.error("Hardware Pricing Sync API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
