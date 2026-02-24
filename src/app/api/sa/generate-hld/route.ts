import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are an expert Technical Document Compiler for an enterprise software architecture firm. Your sole responsibility is to take the provided JSON payload and format it into a professional, cohesive High-Level Design (HLD) Markdown document. RULES: - Do NOT invent, summarize, or alter the technical descriptions, caveats, or assumptions. Use the text exactly as provided in the JSON. - Do NOT generate a detailed Bill of Materials table in any section. Only include the 'bomSummary' in Section 3. - You may write brief, professional transition sentences to connect sections logically. - The final output MUST strictly adhere to the following structure: 1. Executive Summary, 2. Services Included (incorporating service and design options), 3. BOM Summary, 4. Conclusion, 5. Appendix A: Detailed BOM (State that the detailed BOM is provided as a separate CSV export), 6. Appendix B: Assumptions and Caveats (You MUST aggregate and comprehensively list ALL caveats and assumptions provided across the features, services, service options, and design options in the payload).",
    generationConfig: {
        temperature: 0.1,
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
