import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MetadataService } from "@/src/lib/firebase";

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

        const metadata = await MetadataService.getCatalogMetadata("service_catalog");
        const activeCategories = metadata?.fields?.service_categories?.values || [
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
        "detailed_description": "Full technical and business description",
        "metadata": {
            "category": "One of: ${activeCategories.join(", ")}"
        },
        "caveats": ["specific restriction 1", "restriction 2"],
        "assumptions": ["assumption 1", "assumption 2"],
        "service_options": [
            {
                "name": "Option/Tier Name (e.g. Business Fiber 100Mbps)",
                "short_description": "Brief summary",
                "detailed_description": "Technical details",
                "caveats": [],
                "assumptions": [],
                "design_options": [
                    {
                        "name": "Design Configuration (e.g. Static IP, Managed Router)",
                        "short_description": "Brief summary",
                        "detailed_description": "Technical details",
                        "decision_driver": "Why select this?",
                        "pros": ["benefit 1"],
                        "cons": ["drawback 1"],
                        "caveats": [],
                        "assumptions": []
                    }
                ]
            }
        ]
      }

      CRITICAL INSTRUCTIONS:
      1. Hierarchical Extraction: Identify physical/logical "Tiers", "Speeds", or "Editions" as 'service_options'.
      2. Nested Design Options: Identify "Features", "Add-ons", or "Configurations" that are specific to a tier (or generally available) and nest them under the relevant 'service_option'. If a design option applies to all, duplicate it across service options for now.
      3. For Design Options: Extract "Decision Drivers", "Pros", and "Cons".
      4. Caveats & Assumptions: Look for restrictions or prerequisites.
      5. Return ONLY the JSON object.
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
                service_options: (parsedService.service_options || []).map((o: any) => ({
                    ...o,
                    id: crypto.randomUUID(),
                    design_options: (o.design_options || []).map((d: any) => ({
                        ...d,
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
