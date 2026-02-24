import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Package } from "@/src/lib/types";
import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { requirementsText, fileBase64, mimeType, availablePackages } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const config = await AIPromptsService.getPromptConfig('package_selection');
        const customModel = genAI.getGenerativeModel({
            model: config.model || "gemini-2.5-flash",
            generationConfig: { temperature: config.temperature }
        });

        const packageSummaries = (availablePackages as Package[]).map(p =>
            `- ID: ${p.id}\n  Name: ${p.name}\n  Description: ${p.short_description}`
        ).join("\n\n");

        const requirementsTextSection = requirementsText
            ? `CUSTOMER REQUIREMENTS:\n"${requirementsText}"`
            : 'Analyze the attached document containing Customer Requirements.';

        const prompt = config.userPromptTemplate
            .replace('{packageSummaries}', packageSummaries)
            .replace('{requirementsTextSection}', requirementsTextSection);

        let result;
        if (fileBase64 && mimeType) {
            result = await customModel.generateContent([
                prompt,
                {
                    inlineData: {
                        data: fileBase64,
                        mimeType: mimeType
                    }
                }
            ]);
        } else {
            result = await customModel.generateContent(prompt);
        }

        const response = await result.response;
        const text = response.text();

        // Clean JSON response
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonString);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Server AI Analysis Failed:", error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}
