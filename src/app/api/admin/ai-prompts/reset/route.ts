import { NextRequest, NextResponse } from "next/server";
import { AIPromptsService } from "@/src/lib/firebase/ai-prompts-service";
import { PromptId } from "@/src/lib/types";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id') as PromptId;

        if (!id) {
            return NextResponse.json({ error: "Prompt ID is required" }, { status: 400 });
        }

        await AIPromptsService.resetToDefault(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reset AI prompt:", error);
        return NextResponse.json({ error: "Failed to reset AI prompt" }, { status: 500 });
    }
}
