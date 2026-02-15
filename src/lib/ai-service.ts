import { Project, AIAnalysisResult, Package } from "@/src/lib/types";

export const AIService = {
    /**
     * Analyzes requirements from a file (PDF, image, text) and suggests a package via Server API.
     */
    analyzeWithFile: async (fileBase64: string, mimeType: string, availablePackages: Package[]): Promise<AIAnalysisResult> => {
        try {
            const response = await fetch('/api/sa/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileBase64, mimeType, availablePackages })
            });

            if (!response.ok) throw new Error("Server analysis failed");
            return await response.json();
        } catch (error) {
            console.error("Multimodal AI Analysis Failed:", error);
            throw error;
        }
    },

    /**
     * Analyzes text requirements and suggests a package via Server API.
     */
    analyzeRequirements: async (requirementsText: string, availablePackages: Package[]): Promise<AIAnalysisResult> => {
        try {
            const response = await fetch('/api/sa/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requirementsText, availablePackages })
            });

            if (!response.ok) throw new Error("Server analysis failed");
            return await response.json();
        } catch (error) {
            console.error("AI Analysis Failed:", error);
            throw error;
        }
    },

    /**
     * Chat with a consultant context.
     * NOTE: This is still client-side or needs a similar API wrapper if we want to secure the key.
     * For now, keep as is or convert to server call if requested.
     */
    chatWithConsultant: async (_message: string, _projectContext: Project, _history: { role: 'user' | 'model', parts: string }[]) => {
        // Placeholder or future implementation via Server Action/API
        return "I am currently being upgraded to use a secure server-side connection. Please try selection for now!";
    }
};
