import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Site } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";

import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    console.log("classify-sites: POST request received");
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY IS NOT SET IN ENVIRONMENT");
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const body = await req.json();
        const { sites, availableSiteTypes } = body;

        if (!sites || !Array.isArray(sites) || !availableSiteTypes || !Array.isArray(availableSiteTypes)) {
            return NextResponse.json({ error: "Invalid input: sites and availableSiteTypes must be arrays" }, { status: 400 });
        }

        const config = await AIPromptsService.getPromptConfig('recommended_design');
        const customModel = genAI.getGenerativeModel({
            model: config.model || "gemini-2.5-flash",
            generationConfig: { temperature: config.temperature },
            systemInstruction: config.systemInstruction
        });

        const siteTypesContext = (availableSiteTypes as SiteType[]).map(t => {
            const constraintsText = t.constraints?.length > 0
                ? t.constraints.map(c => `    - ${c.description} (Target: ${c.rule?.field} ${c.rule?.operator} ${c.rule?.value})`).join("\n")
                : "    - No specific constraints defined.";

            const defaultsText = `    - Default Redundancy: ${t.defaults?.redundancy?.cpe} CPE / ${t.defaults?.redundancy?.circuit} Circuit
    - Target SLO: ${t.defaults?.slo}%`;

            return `[TYPE: ${t.name}]
  ID: ${t.id}
  Description: ${t.description}
  Category: ${t.category}
  Matching Rules/Constraints:
${constraintsText}
  Standard Configuration Defaults:
${defaultsText}`;
        }).join("\n\n---\n\n");

        const sitesToClassify = (sites as Site[]).map((s, idx) =>
            `SITE #${idx}:
            Name: ${s.name}
            Address: ${s.address}
            Users: ${s.userCount}
            Bandwidth: ${s.bandwidthDownMbps} Mbps Down / ${s.bandwidthUpMbps} Mbps Up
            Redundancy: ${s.redundancyModel}
            WAN Links: ${s.wanLinks}
            Notes: ${s.notes || "N/A"}`
        ).join("\n\n---\n\n");

        const prompt = config.userPromptTemplate
            .replace('{siteTypesContext}', siteTypesContext)
            .replace('{sitesToClassify}', sitesToClassify);

        const result = await customModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("AI Raw Response:", text);

        // More robust JSON extraction
        let jsonString = text;
        const jsonMatch = text.match(/\[[\s\S]*\]/); // Look for an array
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        } else {
            // Fallback to simple cleaning
            jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        try {
            const parsed = JSON.parse(jsonString);
            return NextResponse.json(parsed);
        } catch (parseError: unknown) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.error("Failed to parse AI response as JSON:", text);
            return NextResponse.json({
                error: "Invalid AI response format",
                details: errorMessage,
                rawText: text
            }, { status: 500 });
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("Site Classification Failed:", error);
        return NextResponse.json({
            error: "Classification failed",
            details: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        }, { status: 500 });
    }
}
