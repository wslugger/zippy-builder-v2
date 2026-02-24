import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Package, Project, Service } from '@/src/lib/types';

import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

        const config = await AIPromptsService.getPromptConfig('bom_generation');
        const customModel = genAI.getGenerativeModel({
            model: config.model || "gemini-2.5-flash",
            systemInstruction: config.systemInstruction,
            generationConfig: { temperature: config.temperature }
        });

        // Construct System Prompt
        const packageList = availablePackages.map(p => `- ${p.name}: ${p.short_description}`).join('\n');
        const serviceList = availableServices.map(s => `- ${s.name}`).join('\n');
        const conversationHistory = history.map((h: { role: string; content: string }) => `${h.role === 'user' ? 'User' : 'Consultant'}: ${h.content}`).join('\n');

        const prompt = config.userPromptTemplate
            .replace('{customerName}', project.customerName)
            .replace('{status}', project.status)
            .replace('{requirementsSummary}', project.requirementsText || "No requirements uploaded yet.")
            .replace('{packageList}', packageList)
            .replace('{serviceList}', serviceList)
            .replace('{history}', conversationHistory)
            .replace('{message}', message);

        const result = await customModel.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ response });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
    }
}
