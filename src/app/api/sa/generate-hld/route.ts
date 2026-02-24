import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { payload } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const config = await AIPromptsService.getPromptConfig('hld_generation');
        const customModel = genAI.getGenerativeModel({
            model: config.model || "gemini-2.5-flash",
            systemInstruction: config.systemInstruction,
            generationConfig: {
                temperature: config.temperature,
                responseMimeType: "application/json",
            }
        });

        const userPrompt = config.userPromptTemplate.replace('{payloadJSON}', JSON.stringify(payload, null, 2));

        const result = await customModel.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ markdown: text });

    } catch (error: unknown) {
        console.error("Server HLD Generation Failed:", error);
        return NextResponse.json({
            error: "HLD Generation failed",
            details: error instanceof Error ? error.message : "Unknown error occurred"
        }, { status: 500 });
    }
}
