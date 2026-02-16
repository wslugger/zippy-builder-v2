import { Project, AIAnalysisResult, Package, Service } from "@/src/lib/types";

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
    chatWithConsultant: async (
        message: string,
        context: Project,
        history: { role: string; content: string }[],
        packages: Package[],
        services: Service[]
    ): Promise<string> => {
        try {
            const response = await fetch('/api/sa/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history, context, packages, services })
            });

            if (!response.ok) throw new Error('Chat API call failed');

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error("Chat Error:", error);
            throw error;
        }
    }
};
