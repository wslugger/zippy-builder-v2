import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        temperature: 0.1,
    }
});

export async function POST(req: NextRequest) {
    try {
        const { originalPayload, editedMarkdown } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const systemPrompt = `
You are a strict QA Technical Auditor. Your job is to compare the provided 'Edited Markdown' against the 'Original JSON Payload'. 

Identify any technical contradictions. Examples of contradictions: 
- changing hardware models
- altering quantities
- removing critical caveats
- changing SLA guarantees. 

Ignore formatting changes or stylistic text additions. 

You MUST respond in pure JSON format matching this schema: 
{ 
  "isAligned": boolean, 
  "discrepancies": string[] 
}
`;

        const userPrompt = `
Original JSON Payload:
${JSON.stringify(originalPayload, null, 2)}

Edited Markdown:
${editedMarkdown}
`;

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: userPrompt }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean JSON response
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonString);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Server HLD Audit Failed:", error);
        return NextResponse.json({ error: "Audit failed" }, { status: 500 });
    }
}
