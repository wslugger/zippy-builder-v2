import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are an expert Technical Document Compiler for an enterprise software architecture firm. 
Your sole responsibility is to take the provided JSON payload and format it into a professional High-Level Design (HLD) document.

You MUST respond in pure JSON format matching this schema:
{
  "executiveSummary": "markdown text",
  "servicesIncluded": "markdown text",
  "bomSummary": "markdown text",
  "conclusion": "markdown text",
  "appendixA": "markdown text",
  "appendixB": "markdown text"
}

RULES:
- Do NOT invent, summarize, or alter the technical descriptions, caveats, or assumptions. Use the text exactly as provided in the JSON.
- Do NOT generate a detailed Bill of Materials table in any section. Only include the 'bomSummary' in the bomSummary field.
- In appendixA, state that the detailed BOM is provided as a separate CSV export.
- In appendixB, you MUST aggregate and comprehensively list ALL caveats and assumptions provided across the features, services, service options, and design options in the payload.`,
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
    }
});

export async function POST(req: NextRequest) {
    try {
        const { payload } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const userPrompt = `Please generate the HLD Markdown document based on the following JSON payload:\n\n${JSON.stringify(payload, null, 2)}`;

        const result = await model.generateContent(userPrompt);
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
