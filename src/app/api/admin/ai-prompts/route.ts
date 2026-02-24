import { NextRequest, NextResponse } from "next/server";
import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";
import { AIPromptConfig } from "@/src/lib/types";

export async function GET() {
    try {
        const configs = await AIPromptsService.getAllPromptConfigs();
        return NextResponse.json(configs);
    } catch (error) {
        console.error("Failed to fetch AI prompts:", error);
        return NextResponse.json({ error: "Failed to fetch AI prompts" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const config = await req.json() as AIPromptConfig;
        if (!config.id) {
            return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 });
        }
        await AIPromptsService.savePromptConfig(config);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to save AI prompt:", error);
        return NextResponse.json({ error: "Failed to save AI prompt" }, { status: 500 });
    }
}
