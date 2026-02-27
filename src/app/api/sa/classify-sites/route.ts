import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIService } from "@/src/lib/ai-service";
import { evaluateSiteComplexity } from "@/src/lib/bom-engine";
import { TriageCriterion, ExtractedSiteRequirements } from "@/src/lib/types";
import { BOMService } from "@/src/lib/firebase/bom-service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    console.log("classify-sites: POST request received for Site Triage Pipeline");
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY IS NOT SET IN ENVIRONMENT");
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const body = await req.json();
        const { rawInput } = body;

        if (!rawInput || typeof rawInput !== 'string') {
            return NextResponse.json({ error: "Invalid input: rawInput string is required" }, { status: 400 });
        }

        // 2. Fetch live Triage Criteria from Firestore via BOMService
        let criteria: TriageCriterion[] = [];
        try {
            criteria = await BOMService.fetchTriageCriteria();
            if (criteria.length === 0) {
                console.warn("classify-sites: No Triage Criteria found in Firestore. Running with basic base schema extraction.");
            }
        } catch (fbError) {
            console.error("classify-sites: Failed to fetch active criteria from Firebase", fbError);
            return NextResponse.json({ error: "Configuration database unavailable. Please try again later." }, { status: 500 });
        }

        // 3. Build the prompt
        const systemInstruction = AIService.buildDynamicTriagePrompt(rawInput, criteria);

        // 4. Call LLM (Using gemini-2.5-flash)
        const customModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { temperature: 0.1 }, // Low temp for extraction consistency
            systemInstruction: systemInstruction
        });

        const result = await customModel.generateContent(
            "Extract the site requirements from the provided CUSTOMER INPUT into the mandatory JSON array format."
        );
        const response = await result.response;
        const text = response.text();

        console.log("AI Raw Extraction Response:", text);

        let jsonString = text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        } else {
            jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        let extractedArray: ExtractedSiteRequirements[];
        try {
            extractedArray = JSON.parse(jsonString);
            if (!Array.isArray(extractedArray)) {
                throw new Error("Parsed JSON is not an array");
            }
        } catch (parseError: unknown) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.error("Failed to parse AI response as JSON array:", text);
            return NextResponse.json({
                error: "Invalid AI response format: Expected JSON array",
                details: errorMessage,
                rawText: text
            }, { status: 500 });
        }

        // 5. Evaluate complexity
        const triagedSites = extractedArray.map(site => evaluateSiteComplexity(site, criteria));

        // 6. Return response
        return NextResponse.json(triagedSites);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("Site Triage Pipeline Failed:", error);
        return NextResponse.json({
            error: "Triage execution failed",
            details: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        }, { status: 500 });
    }
}
