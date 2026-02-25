import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { AIPromptConfig, PromptId } from "@/src/lib/types";
import { db, AI_PROMPTS_COLLECTION } from "./config";
import { cleanObject } from "@/src/lib/feature-utils";

export const DEFAULT_AI_PROMPTS: AIPromptConfig[] = [
    {
        id: 'package_selection',
        label: 'Package Selection',
        description: 'Analyzes customer requirements and suggests the best initial package.',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: 'You are a Solutions Architect expert.',
        userPromptTemplate: `Analyze the following Customer Requirements and recommend the BEST fitting package from the available options.

AVAILABLE PACKAGES:
{packageSummaries}

{requirementsTextSection}

Output strictly in JSON format:
{
  "packageId": "string (must match one of the available IDs)",
  "confidence": number (0-100),
  "reasoning": "string (concise explanation)"
}`
    },
    {
        id: 'recommended_design',
        label: 'Recommended Design',
        description: 'Classifies imported sites into standard deployment profiles (SD-WAN & LAN).',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: 'You are a Network Solutions Architect expert specializing in SD-WAN, LAN, and WLAN deployments.',
        userPromptTemplate: `Your task is to classify a list of imported sites into the most appropriate "Site Type" (Deployment Profile) from our catalog.
Specifically, you must provide TWO classifications for each site:
1. An SD-WAN or Branch profile (siteTypeId)
2. A LAN profile (lanSiteTypeId)

CRITICAL REQUIREMENT:
Base your classification PRIMARILY on the "Matching Rules/Constraints" and "Description" provided for each Site Type below. 
If a site definition specifies a user count range or a redundancy model, prioritize that over general assumptions.

AVAILABLE SITE TYPES IN CATALOG:
{siteTypesContext}

SITES TO CLASSIFY:
{sitesToClassify}

GUIDELINES:
1. **Strict Constraint Matching**: If a Site Type has a rule like "userCount min 100", do not assign sites with 20 users to that type.
2. **Redundancy Priority**: If a site's data says "Dual CPE", favor Site Types that default to "Dual CPE" redundancy.
3. **Description Context**: Use the "Description" field to understand the business intent of the profile (e.g., "Critical Data Center hub").
4. **Dual Category Selection**: You MUST pick one SD-WAN/Branch profile AND one LAN profile for each site, looking at the "Category" of the Site Types.
5. **Reasoning**: In your JSON output, explain which specific rule or description lead to your choice.

Output strictly in JSON format as an array of objects:
[
  {
    "siteIndex": number,
    "siteTypeId": "string (must match one of the available IDs for a non-LAN site)",
    "lanSiteTypeId": "string (must match one of the available IDs for a LAN site)",
    "confidence": number (0-100),
    "reasoning": "string (e.g. 'Site has 120 users which matches the Large Office min 100 constraint, and is assigned 3-Tier Campus for LAN')"
  },
  ...
]`
    },
    {
        id: 'bom_generation',
        label: 'Package Chat (Consultant)',
        description: 'Drives the interactive chat assistant that helps select and customize the package.',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        systemInstruction: 'You are an expert Solutions Architect (SA) consultant for a network infrastructure project. Your goal is to help the SA (the user) select the best package and customize it for their customer.',
        userPromptTemplate: `Current Project Context:
- Customer: {customerName}
- Status: {status}
- Requirements Summary: {requirementsSummary}

Available Packages:
{packageList}

Available Services:
{serviceList}

Rules:
1. Be helpful, professional, and concise.
2. Guide the user towards a standard package if possible, but explain trade-offs.
3. If the user asks about specific features (e.g., "Does Meraki support BGP?"), answer based on general knowledge but reference the catalog if needed.
4. If recommending a package, mention WHY it fits the requirements.
5. Do not hallucinate features that don't exist in standard networking equipment.

Current Conversation History:
{history}

User: {message}
Consultant:`
    },
    {
        id: 'hld_generation',
        label: 'HLD Generation',
        description: 'Generates the structured High-Level Design document from the project payload.',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: `You are an expert Technical Document Compiler for an enterprise software architecture firm. 
Your sole responsibility is to take the provided JSON payload and format it into a professional High-Level Design (HLD) document.

You MUST respond in pure JSON format matching this schema:
{
  "executiveSummary": "markdown text",
  "servicesIncluded": "markdown text",
  "bomSummary": "markdown text",
  "conclusion": "markdown text",
  "appendixA": "markdown text",
  "appendixB": "markdown text"
}

RULES:
- Do NOT invent, summarize, or alter the technical descriptions, caveats, or assumptions. Use the text exactly as provided in the JSON.
- For the 'servicesIncluded' field, you MUST separate each service into its own section using Level 3 headers (e.g., ### Managed LAN). Start each service on a new line and separate each service section with a horizontal rule (---) at the bottom. Under each service, include its description as plain text (not bold), followed by clearly labeled subsections (Level 4 headers) for 'Service Options' and 'Design Options'. 
- Do NOT generate a 'Site Profiles', 'Site Types', or 'BOM Summary' section. These are handled deterministically by the UI.
- For 'Design Options', if the options have a "category" field provided in the JSON, you MUST group them by that category. Output the category name on its own line as bold text (e.g., **Topology**). Directly underneath the category name, list the option as a bullet point using bold text for the option name and plain text for its description (e.g., - **Hub and Spoke (Standard)**: Branch MXs establish...). Ensure you include the exact detailed descriptions as provided in the JSON.
- For the 'executiveSummary' field, include a single concluding sentence that summarizes the total equipment scope (e.g., "The solution encompasses a total of X devices across Y sites...").
- In the 'bomSummary' field of the JSON response, provide a brief, high-level narrative of the equipment strategy (e.g., why certain models were chosen). This will be used in the Background context.
- For the 'conclusion' field, provide a professional summary that wraps up the design, reiterates the value proposition for the customer (using the customerName from the payload), and notes that next steps include detailed site surveys and implementation planning. This section should be a draft that the Solutions Architect can then refine.
- In appendixA, state that the detailed BOM is provided as a separate CSV export.
- In appendixB, you MUST aggregate and comprehensively list ALL caveats, assumptions, and site technical constraints provided in the payload. Group them by their source (e.g., by service, feature name, or site type name). Use clear bulleted lists.`,
        userPromptTemplate: 'Please generate the HLD Markdown document based on the following JSON payload:\n\n{payloadJSON}'
    }
];

const MODEL_REMAPS: Record<string, string> = {
    'gemini-3.0-flash': 'gemini-2.5-flash',
    'gemini-3.1-pro': 'gemini-3.1-pro-preview',
    'gemini-3-pro': 'gemini-3-pro-preview',
    'gemini-3-flash': 'gemini-3-flash-preview',
    'gemini-2.5-flash-live': 'gemini-2.5-flash',
};

function sanitizeModelName(model: string | undefined): string | undefined {
    if (!model) return undefined;
    if (MODEL_REMAPS[model]) return MODEL_REMAPS[model];
    // If it starts with gemini- but isn't in our stable/preview list, default to stable flash
    const validModels = [
        'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
        'gemini-3.1-pro-preview', 'gemini-3-pro-preview', 'gemini-3-flash-preview'
    ];
    if (model.startsWith('gemini-') && !validModels.includes(model)) {
        return 'gemini-2.5-flash';
    }
    return model;
}

export const AIPromptsService = {
    getPromptConfig: async (id: PromptId): Promise<AIPromptConfig> => {
        const docRef = doc(db, AI_PROMPTS_COLLECTION, id);
        const snapshot = await getDoc(docRef);

        const defaultValue = DEFAULT_AI_PROMPTS.find(p => p.id === id)!;

        if (snapshot.exists()) {
            const data = snapshot.data() as Partial<AIPromptConfig>;
            if (data.model) data.model = sanitizeModelName(data.model);
            return {
                ...defaultValue,
                ...data,
            };
        }

        return defaultValue;
    },

    getAllPromptConfigs: async (): Promise<AIPromptConfig[]> => {
        const colRef = collection(db, AI_PROMPTS_COLLECTION);
        const snapshot = await getDocs(colRef);

        const firestoreConfigs: Record<string, AIPromptConfig> = {};
        snapshot.forEach(doc => {
            const data = doc.data() as AIPromptConfig;
            if (data.model) data.model = sanitizeModelName(data.model) || data.model;
            firestoreConfigs[doc.id] = data;
        });

        return DEFAULT_AI_PROMPTS.map(def => ({
            ...def,
            ...(firestoreConfigs[def.id] || {}),
        }));
    },

    savePromptConfig: async (config: AIPromptConfig): Promise<void> => {
        const docRef = doc(db, AI_PROMPTS_COLLECTION, config.id);
        const cleaned = cleanObject({
            ...config,
            updatedAt: new Date().toISOString(),
        });
        await setDoc(docRef, cleaned, { merge: true });
    },

    resetToDefault: async (id: PromptId): Promise<void> => {
        const docRef = doc(db, AI_PROMPTS_COLLECTION, id);
        const defaultValue = DEFAULT_AI_PROMPTS.find(p => p.id === id)!;
        await setDoc(docRef, cleanObject(defaultValue));
    }
};
