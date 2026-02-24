import { Project, AIAnalysisResult, Package, Service } from "@/src/lib/types";
import { Site } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";
import { HLDPayload } from "./hld-generator";

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
    },

    /**
     * Classifies a list of sites into Site Types using Gemini.
     */
    classifySites: async (sites: Site[], availableSiteTypes: SiteType[]): Promise<{ siteIndex: number, siteTypeId: string, lanSiteTypeId?: string, confidence: number, reasoning: string }[]> => {
        try {
            const response = await fetch('/api/sa/classify-sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sites, availableSiteTypes })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || "Classification failed");
            }
            return await response.json();
        } catch (error) {
            console.error("AI Site Classification Failed:", error);
            throw error;
        }
    },

    /**
     * Sends the HLD Payload to the LLM to generate a Markdown document.
     */
    generateHLDDocument: async (payload: HLDPayload): Promise<string> => {
        try {
            const response = await fetch('/api/sa/generate-hld', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || "HLD Generation failed");
                throw new Error(message);
            }

            const data = await response.json();
            return data.markdown;
        } catch (error) {
            console.error("HLD Document Generation Failed:", error);
            throw error;
        }
    },

    /**
     * Audits an edited HLD document against the original payload.
     */
    auditHLDDocument: async (originalPayload: HLDPayload, editedMarkdown: string): Promise<{ isAligned: boolean; discrepancies: string[] }> => {
        try {
            const response = await fetch('/api/sa/audit-hld', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalPayload, editedMarkdown })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || "HLD Audit failed");
                throw new Error(message);
            }

            return await response.json();
        } catch (error) {
            console.error("HLD Document Audit Failed:", error);
            throw error;
        }
    }
};
