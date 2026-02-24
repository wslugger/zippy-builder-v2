import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SystemConfigService } from "@/src/lib/firebase/system-config-service";

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

        const config = await SystemConfigService.getConfig();
        const activeCategories = (config?.taxonomy as Record<string, string[]>)?.service_categories || [
            "Connectivity", "Cybersecurity", "Cloud", "Professional Services", "Managed Services"
        ];

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");

        const prompt = `
      You are an expert Solutions Architect and Product Manager in the Telecommunications and Managed Services industry.
      Your task is to analyze the provided service description/specification document and extract it into a structured JSON format.
      
      Target Data Structure:
      {
        "name": "Main Service Name",
        "short_description": "2-3 sentence summary",
        "detailed_description": "Full technical and business description including all key features that are NOT selectable options.",
        "metadata": {
            "category": "One of: ${activeCategories.join(", ")}"
        },
        "caveats": ["specific restriction 1", "restriction 2"],
        "assumptions": ["assumption 1", "assumption 2"],
        "service_options": [
            {
                "name": "Option/Tier Name (e.g. Business Fiber 100Mbps, Standard Tier)",
                "short_description": "Brief summary",
                "detailed_description": "Technical details of this specific tier",
                "caveats": [],
                "assumptions": [],
                "design_options": [
                    {
                        "name": "Selectable Configuration (e.g. Hub and Spoke, Local Breakout)",
                        "short_description": "Brief summary",
                        "detailed_description": "Full technical details explaining how this option works in depth",
                        "category": "The category this design option belongs to. Must be one of: Topology, East-West Security, Internet Breakout. Choose the best match.",
                        "decision_driver": "Why would a customer choose this specific option?",
                        "pros": ["benefit of this specific choice"],
                        "cons": ["drawback of this specific choice"],
                        "caveats": [],
                        "assumptions": []
                    }
                ]
            }
        ]
      }

      CRITICAL EXTRACTION RULES:
      1. IDENTIFY CHOICES: 'service_options' and 'design_options' MUST represent actual choices or configurations a customer must select.
      2. MERGE INHERENT FEATURES: Do NOT create options for "Key Features", "Standard Capabilities", or "Service Benefits" if they are inherent to the service and not a selectable choice. Instead, incorporate these into the 'detailed_description' or 'short_description' of the main service.
      3. Tiers vs Features: 'service_options' should usually be physical or logical logical "Tiers", "Speeds", or "Service Levels".
      4. Selectable Configurations: 'design_options' should be "Add-ons", "Optional Features", or "Configurations" that can be toggled on/off or selected.
      5. Extraction depth: If a feature is standard across all tiers, do NOT make it a design option; describe it in the main service description.
      
      Return ONLY the JSON object.
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

        console.log("Service Gemini Raw Response:", jsonString);

        try {
            const parsedService = JSON.parse(jsonString);

            // Add required internal fields
            const serviceId = parsedService.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

            const finalService = {
                ...parsedService,
                id: serviceId,
                active: true,
                service_options: (parsedService.service_options || []).map((o: { design_options?: unknown[] }) => ({
                    ...o,
                    id: crypto.randomUUID(),
                    design_options: (Array.isArray(o.design_options) ? o.design_options : []).map((d: unknown) => ({
                        ...(typeof d === 'object' && d !== null ? d : {}),
                        id: crypto.randomUUID()
                    }))
                }))
            };

            return NextResponse.json({ data: finalService });

        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            return NextResponse.json({ error: "Failed to parse Gemini response", raw: text }, { status: 500 });
        }

    } catch (error) {
        console.error("Service Ingestion Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
