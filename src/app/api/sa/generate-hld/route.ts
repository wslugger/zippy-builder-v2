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
- For the 'servicesIncluded' field, you MUST separate each service into its own section using Level 3 headers (e.g., ### Managed LAN). Start each service on a new line and separate each service section with a horizontal rule (---) at the bottom. Under each service, include its description as plain text (not bold), followed by clearly labeled subsections (Level 4 headers) for 'Service Options' and 'Design Options'. 
- Do NOT generate a 'Site Profiles' or 'Site Types' section. This is handled deterministically by the UI.
- For 'Design Options', if the options have a "category" field provided in the JSON, you MUST group them by that category. Output the category name on its own line as bold text (e.g., **Topology**). Directly underneath the category name, list the option as a bullet point using bold text for the option name and plain text for its description (e.g., - **Hub and Spoke (Standard)**: Branch MXs establish...). Ensure you include the exact detailed descriptions as provided in the JSON.
- Do NOT generate a detailed Bill of Materials table in any section. Only include the 'bomSummary' in the bomSummary field.
- In appendixA, state that the detailed BOM is provided as a separate CSV export.
- In appendixB, you MUST aggregate and comprehensively list ALL caveats, assumptions, and site technical constraints provided in the payload. Group them by their source (e.g., by service, feature name, or site type name). Use clear bulleted lists.`,
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
