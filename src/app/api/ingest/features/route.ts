import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const prompt = `
            You are an expert Network Architect.
            Your task is to extract "Technical Features" from the provided document.
            
            A "Technical Feature" is a specific capability, protocol, or standard (e.g., "BGP", "OSPF", "IPsec", "HA", "Application Awareness").
            
            For each feature found, extract the following:
            - Feature Name (e.g. "BGP Routing")
            - Description (A clear, concise explanation of what it does)
            - Category (e.g., "Routing", "Security", "Management", "SD-WAN")
            - Caveats (List of limitations, prerequisites, or constraints mentioned)
            - Assumptions (List of assumptions made for this feature to work)

            Return a JSON array of objects adhering to this exact schema:
            {
                "items": [
                    {
                        "id": "generated_id_placeholder",
                        "name": "Feature Name",
                        "category": "Category",
                        "description": "Description text",
                        "caveats": ["Caveat 1", "Caveat 2"],
                        "assumptions": ["Assumption 1", "Assumption 2"]
                    }
                ]
            }

            CRITICAL INSTRUCTIONS:
            1. Return ONLY the JSON object. No markdown.
            2. Generate a URL-friendly 'id' from the name (e.g. "BGP Routing" -> "bgp_routing").
            3. Ensure 'caveats' and 'assumptions' are arrays of strings. If none found, return empty arrays.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("Gemini Raw Response (Features):", jsonString);

        try {
            interface ExtractedFeature {
                id?: string;
                name: string;
                category: string;
                description: string;
                caveats: string[];
                assumptions: string[];
            }

            const parsedResponse = JSON.parse(jsonString);
            const items: ExtractedFeature[] = parsedResponse.items || [parsedResponse];

            const finalItems = items.map((item: ExtractedFeature) => ({
                ...item,
                id: item.id || item.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
            }));

            return NextResponse.json({ data: finalItems });

        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            return NextResponse.json({ error: "Failed to parse Gemini response", raw: text }, { status: 500 });
        }

    } catch (error) {
        console.error("Feature Ingestion Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
