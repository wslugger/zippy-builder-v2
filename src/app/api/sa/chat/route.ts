import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Package, Project, Service } from '@/src/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, history, context, packages, services } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        const project = context as Project;
        const availablePackages = packages as Package[];
        const availableServices = services as Service[];

        // Construct System Prompt
        const systemPrompt = `
You are an expert Solutions Architect (SA) consultant for a network infrastructure project.
Your goal is to help the SA (the user) select the best package and customize it for their customer: ${project.customerName}.

Current Project Context:
- Customer: ${project.customerName}
- Status: ${project.status}
- Requirements Summary: ${project.requirementsText || "No requirements uploaded yet."}

Available Packages:
${availablePackages.map(p => `- ${p.name}: ${p.short_description}`).join('\n')}

Available Services:
${availableServices.map(s => `- ${s.name}`).join('\n')}

Rules:
1. Be helpful, professional, and concise.
2. Guide the user towards a standard package if possible, but explain trade-offs.
3. If the user asks about specific features (e.g., "Does Meraki support BGP?"), answer based on general knowledge but reference the catalog if needed.
4. If recommending a package, mention WHY it fits the requirements.
5. Do not hallucinate features that don't exist in standard networking equipment.

Current Conversation History:
${history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'User' : 'Consultant'}: ${h.content}`).join('\n')}

User: ${message}
Consultant:
`;

        const result = await model.generateContent(systemPrompt);
        const response = result.response.text();

        return NextResponse.json({ response });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
    }
}
