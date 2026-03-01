import { Project, AIAnalysisResult, Package, Service, GeneratedHLD, TriageCriterion, TriagedSite, BOMLogicRule } from "@/src/lib/types";
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
     * Triage logic: Extracts site requirements from raw notes and routes them.
     */
    triageSites: async (rawInput: string): Promise<TriagedSite[]> => {
        try {
            const response = await fetch('/api/sa/classify-sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawInput })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || "Triage failed");
            }
            return await response.json();
        } catch (error) {
            console.error("AI Site Triage Failed:", error);
            throw error;
        }
    },

    /**
     * Sends the HLD Payload to the LLM to generate a structured JSON document.
     */
    generateHLDDocument: async (payload: HLDPayload): Promise<GeneratedHLD> => {
        try {
            // Strip detailedBom to save tokens as requested
            const { detailedBom: _detailedBom, ...aiPayload } = payload;

            const response = await fetch('/api/sa/generate-hld', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: aiPayload })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.details ? `${errorData.error}: ${errorData.details} ` : (errorData.error || "HLD Generation failed");
                throw new Error(message);
            }

            const data = await response.json();
            // The API now returns { markdown: { executiveSummary: "...", ... } }
            // Wait, actually I should check the API implementation again.
            // In generate-hld/route.ts, it returns NextResponse.json({ markdown: text });
            // Since I set responseMimeType: "application/json", 'text' is the JSON string.
            return JSON.parse(data.markdown);
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
                const message = errorData.details ? `${errorData.error}: ${errorData.details} ` : (errorData.error || "HLD Audit failed");
                throw new Error(message);
            }

            return await response.json();
        } catch (error) {
            console.error("HLD Document Audit Failed:", error);
            throw error;
        }
    },

    /**
     * AI-assisted rule generation via the copilot-suggest API.
     */
    generateBOMLogicRule: async (instruction: string, serviceCategory: string): Promise<Partial<BOMLogicRule>> => {
        try {
            const response = await fetch('/api/copilot-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contextType: 'bom_logic_rule',
                    promptData: { instruction, serviceCategory }
                })
            });

            if (!response.ok) throw new Error("Failed to generate rule logic");
            return await response.json();
        } catch (error) {
            console.error("Rule Copilot Error:", error);
            throw error;
        }
    },

    /**
     * AI-assisted triage criterion generation via the copilot-suggest API.
     */
    generateTriageCriterion: async (instruction: string): Promise<Partial<TriageCriterion>> => {
        try {
            const response = await fetch('/api/copilot-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contextType: 'triage_criterion',
                    promptData: { instruction }
                })
            });

            if (!response.ok) throw new Error("Failed to generate extraction rule");
            return await response.json();
        } catch (error) {
            console.error("Triage Copilot Error:", error);
            throw error;
        }
    },

    /**
     * Builds a dynamic system prompt for the AI Triage "Schema as Data" pipeline.
     */
    buildDynamicTriagePrompt: (rawCustomerInput: string, activeCriteria: TriageCriterion[]): string => {
        const dynamicSchemaMap = activeCriteria.map(criterion => {
            return `"${criterion.id}": <${criterion.type} > - ${criterion.promptInstruction} `;
        }).join('\n  ');

        return `You are an Expert Network Solutions Architect AI.
Your objective is to read the unstructured customer input regarding their network site requirements and extract the parameters into a strictly formatted JSON array.

REQUIRED SCHEMA FORMAT FOR EACH SITE IN THE ARRAY:
{
    "siteName": <string>- The name or location of the site,
        "estimatedUsers": <number>- The approximate number of users or employees at the site,
            "sqFt": <number | null>- The square footage of the site, if provided(else null),
                "rawNotes": <string>- A brief summary or raw copy of the notes for this site,
                    "dynamicAttributes": {
                        "address": <string>- The street address or city / state,
                            "bandwidthDownMbps": <number>- Download speed in Mbps,
                                "bandwidthUpMbps": <number>- Upload speed in Mbps,
                                    "primaryCircuit": <string>- e.g.DIA, Broadband, LTE, Fiber,
                                        "secondaryCircuit": <string | null>- Secondary circuit type if HA is required,
                                            "redundancyModel": <string>- e.g.Single CPE, Dual CPE,
                                                "wanLinks": <number>- Number of WAN links / circuits,
                                                    "lanPorts": <number>- Number of copper LAN ports needed,
                                                        "poePorts": <number>- Number of PoE ports needed,
                                                            "indoorAPs": <number>- Count of indoor access points,
                                                                "outdoorAPs": <number>- Count of outdoor access points,
                                                                    ${dynamicSchemaMap}
                    }
}

You MUST output ONLY a valid JSON array matching the schema above.
Do not include markdown blocks like \`\`\`json. Output ONLY the raw JSON string.

CUSTOMER INPUT:
${rawCustomerInput}`;
    }
};
