import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Package } from "@/src/lib/types";

// Server-side Gemini initialization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
    try {
        const { requirementsText, fileBase64, mimeType, availablePackages } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const packageSummaries = (availablePackages as Package[]).map(p =>
            `- ID: ${p.id}\n  Name: ${p.name}\n  Description: ${p.short_description}`
        ).join("\n\n");

        const prompt = `
            You are a Solutions Architect expert.
            
            Analyze the following Customer Requirements and recommend the BEST fitting package from the available options.
            
            AVAILABLE PACKAGES:
            ${packageSummaries}
            
            ${requirementsText ? `CUSTOMER REQUIREMENTS:\n"${requirementsText}"` : 'Analyze the attached document containing Customer Requirements.'}
            
            Output strictly in JSON format:
            {
              "packageId": "string (must match one of the available IDs)",
              "confidence": number (0-100),
              "reasoning": "string (concise explanation)"
            }
        `;

        let result;
        if (fileBase64 && mimeType) {
            result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: fileBase64,
                        mimeType: mimeType
                    }
                }
            ]);
        } else {
            result = await model.generateContent(prompt);
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
