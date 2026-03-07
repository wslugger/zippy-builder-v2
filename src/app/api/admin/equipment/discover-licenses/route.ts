import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '@/src/lib/firebase/config';
import { PRICING_COLLECTION } from '@/src/lib/firebase/pricing-service';

export async function POST(request: Request) {
    try {
        const { equipmentId, model, vendor_id } = await request.json();

        if (!model && !equipmentId) {
            return NextResponse.json({ error: "Model or Equipment ID is required" }, { status: 400 });
        }

        const target = (model || equipmentId).split('_').pop() || ""; // Extract model part if it's like vendor_model

        // 1. Initial broad search in Firestore
        // We search for SKUs that contain the model name. 
        // Firestore doesn't support 'contains' natively for strings, so we fetch a broader set or use '>= and <' trick if prefixed.
        // For now, we fetch items where the ID starts with vendor prefix OR contains the model.
        // Since Firestore is limited, we might just fetch the most recent 1000 pricing items and filter in-memory if we don't have a search engine.
        // BETTER: Use a simple keyword search if model is specific enough.

        const q = query(collection(db, PRICING_COLLECTION), limit(2000));
        const snapshot = await getDocs(q);
        const allPricing = snapshot.docs.map(doc => {
            const data = doc.data() as { id?: string, description?: string };
            return { ...data, id: (data.id || doc.id) as string };
        });

        // Filter for potential candidates in-memory
        const candidates = allPricing.filter(p => {
            const id = p.id.toLowerCase();
            const m = target.toLowerCase();
            // Look for SKUs that contain the model number
            return id.includes(m);
        }).slice(0, 50); // Send max 50 to Gemini to stay within context/token limits and speed up

        if (candidates.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        // 2. Ask Gemini to filter and categorize
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
You are an expert in IT hardware licensing and support (Cisco, Meraki, HPE, Fortinet, etc.).
Given a hardware model "${model}" (Vendor: ${vendor_id}) and a list of potential pricing SKUs, 
identify which SKUs are valid licensing, software subscriptions, or support contracts that explicitly apply to this hardware.

For each valid match, extract:
- id: The exact SKU
- tier: The capability level (e.g. "Advanced Security", "Enterprise", "Premier", "DNA Advantage", "Secure SD-WAN")
- termLength: The duration (e.g. "1YR", "3YR", "5YR", "1D", "7YR")

Potential SKUs:
${candidates.map(c => `- ${c.id}: ${c.description || 'No description'}`).join('\n')}

Output strictly a JSON array of objects:
[
  { "id": "SKU", "tier": "Tier Name", "termLength": "Term" },
  ...
]
If no valid licenses are found, return an empty array [].
DO NOT include hardware itself (the model itself). ONLY licenses/support.
Output ONLY valid JSON. No markdown.
`;

        const result = await aiModel.generateContent(prompt);
        const text = result.response.text();

        // Cleanup markdown code blocks if any
        let jsonString = text.trim();
        if (jsonString.startsWith("```json")) {
            jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonString.startsWith("```")) {
            jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        try {
            const suggestions = JSON.parse(jsonString);
            return NextResponse.json({ suggestions });
        } catch (err) {
            console.error("Failed to parse Gemini license JSON:", jsonString);
            return NextResponse.json({ error: "AI produced invalid response formatting" }, { status: 500 });
        }

    } catch (error) {
        console.error("Discover Licenses API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
