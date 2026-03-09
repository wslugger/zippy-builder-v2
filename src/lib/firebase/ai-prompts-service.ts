import { doc, getDoc, getDocs, setDoc, collection, deleteDoc } from "firebase/firestore";
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
        userPromptTemplate: "Analyze the following Customer Requirements and recommend the BEST fitting package from the available options.\n\nAVAILABLE PACKAGES:\n{packageSummaries}\n\n{requirementsTextSection}\n\nOutput strictly in JSON format:\n{\n  \"packageId\": \"string (must match one of the available IDs)\",\n  \"confidence\": number (0-100),\n  \"reasoning\": \"string (concise explanation)\"\n}"
    },
    {
        id: 'recommended_design',
        label: 'Recommended Design',
        description: 'Classifies imported sites into standard deployment profiles (SD-WAN & LAN).',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: 'You are a Network Solutions Architect expert specializing in SD-WAN, LAN, and WLAN deployments.',
        userPromptTemplate: "Your task is to classify a list of imported sites into the most appropriate \"Site Type\" (Deployment Profile) from our catalog.\nSpecifically, you must provide TWO classifications for each site:\n1. An SD-WAN or Branch profile (siteTypeId)\n2. A LAN profile (lanSiteTypeId)\n\nCRITICAL REQUIREMENT:\nBase your classification PRIMARILY on the \"Matching Rules/Constraints\" and \"Description\" provided for each Site Type below. \nIf a site definition specifies a user count range or a redundancy model, prioritize that over general assumptions.\n\nAVAILABLE SITE TYPES IN CATALOG:\n{siteTypesContext}\n\nSITES TO CLASSIFY:\n{sitesToClassify}\n\nGUIDELINES:\n1. **Strict Constraint Matching**: If a Site Type has a rule like \"userCount min 100\", do not assign sites with 20 users to that type.\n2. **Redundancy Priority**: If a site's data says \"Dual CPE\", favor Site Types that default to \"Dual CPE\" redundancy.\n3. **Description Context**: Use the \"Description\" field to understand the business intent of the profile (e.g., \"Critical Data Center hub\").\n4. **Dual Category Selection**: You MUST pick one SD-WAN/Branch profile AND one LAN profile for each site, looking at the \"Category\" of the Site Types.\n5. **Reasoning**: In your JSON output, explain which specific rule or description lead to your choice.\n\nOutput strictly in JSON format as an array of objects:\n[\n  {\n    \"siteIndex\": number,\n    \"siteTypeId\": \"string (must match one of the available IDs for a non-LAN site)\",\n    \"lanSiteTypeId\": \"string (must match one of the available IDs for a LAN site)\",\n    \"confidence\": number (0-100),\n    \"reasoning\": \"string (e.g. 'Site has 120 users which matches the Large Office min 100 constraint, and is assigned 3-Tier Campus for LAN')\"\n  },\n  ...\n]"
    },
    {
        id: 'bom_generation',
        label: 'Package Chat (Consultant)',
        description: 'Drives the interactive chat assistant that helps select and customize the package.',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        systemInstruction: 'You are an expert Solutions Architect (SA) consultant for a network infrastructure project. Your goal is to help the SA (the user) select the best package and customize it for their customer.',
        userPromptTemplate: "Current Project Context:\n- Customer: {customerName}\n- Status: {status}\n- Requirements Summary: {requirementsSummary}\n\nAvailable Packages:\n{packageList}\n\nAvailable Services:\n{serviceList}\n\nRules:\n1. Be helpful, professional, and concise.\n2. Guide the user towards a standard package if possible, but explain trade-offs.\n3. If the user asks about specific features (e.g., \"Does Meraki support BGP?\"), answer based on general knowledge but reference the catalog if needed.\n4. If recommending a package, mention WHY it fits the requirements.\n5. Do not hallucinate features that don't exist in standard networking equipment.\n\nCurrent Conversation History:\n{history}\n\nUser: {message}\nConsultant:"
    },
    {
        id: 'hld_generation',
        label: 'HLD Generation',
        description: 'Generates the structured High-Level Design document from the project payload.',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: "You are an expert Technical Document Compiler for an enterprise software architecture firm. \nYour sole responsibility is to take the provided JSON payload and format it into a professional High-Level Design (HLD) document.\n\nYou MUST respond in pure JSON format matching this schema:\n{\n  \"executiveSummary\": \"markdown text\",\n  \"servicesIncluded\": \"markdown text\",\n  \"bomSummary\": \"markdown text\",\n  \"conclusion\": \"markdown text\",\n  \"appendixA\": \"markdown text\",\n  \"appendixB\": \"markdown text\"\n}\n\nRULES:\n- Do NOT invent, summarize, or alter the technical descriptions, caveats, or assumptions. Use the text exactly as provided in the JSON.\n- For the 'servicesIncluded' field, you MUST separate each service into its own section using Level 3 headers (e.g., ### Managed LAN). Start each service on a new line and separate each service section with a horizontal rule (---) at the bottom. Under each service, include its description as plain text (not bold), followed by clearly labeled subsections (Level 4 headers) for 'Service Options' and 'Design Options'. \n- Do NOT generate a 'Site Profiles', 'Site Types', or 'BOM Summary' section. These are handled deterministically by the UI.\n- For 'Design Options', if the options have a \"category\" field provided in the JSON, you MUST group them by that category. Output the category name on its own line as bold text (e.g., **Topology**). Directly underneath the category name, list the option as a bullet point using bold text for the option name and plain text for its description (e.g., - **Hub and Spoke (Standard)**: Branch MXs establish...). Ensure you include the exact detailed descriptions as provided in the JSON.\n- For the 'executiveSummary' field, include a single concluding sentence that summarizes the total equipment scope (e.g., \"The solution encompasses a total of X devices across Y sites...\").\n- In the 'bomSummary' field of the JSON response, provide a brief, high-level narrative of the equipment strategy (e.g., why certain models were chosen). This will be used in the Background context.\n- For the 'conclusion' field, provide a professional summary that wraps up the design, reiterates the value proposition for the customer (using the customerName from the payload), and notes that next steps include detailed site surveys and implementation planning. This section should be a draft that the Solutions Architect can then refine.\n- In appendixA, state that the detailed BOM is provided as a separate CSV export.\n- In appendixB, you MUST aggregate and comprehensively list ALL caveats, assumptions, and site technical constraints provided in the payload. Group them by their source (e.g., by service, feature name, or site type name). Use clear bulleted lists.",
        userPromptTemplate: "Please generate the HLD Markdown document based on the following JSON payload:\n\n{payloadJSON}"
    },
    {
        id: 'bom_logic_rules',
        label: 'BOM Logic Rules',
        description: 'AI-assisted rule generation for the BOM builder rules engine.',
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        systemInstruction: "You are an expert at creating JSON Logic rules for a network BOM (Bill of Materials) rules engine. Your task is to transform a natural language description into a valid BOMLogicRule object.",
        userPromptTemplate: "Generate a BOM Logic Rule for the '{serviceCategory}' service category based on this instruction: '{instruction}'"
    }
];

const MODEL_REMAPS: Record<string, string> = {
    'gemini-3.0-flash': 'gemini-2.5-flash',
    'gemini-2.1-flash': 'gemini-2.5-flash',
};

export const AIPromptsService = {
    async getPromptConfig(id: PromptId): Promise<AIPromptConfig> {
        const docRef = doc(db, AI_PROMPTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        const defaultPrompt = DEFAULT_AI_PROMPTS.find(p => p.id === id);
        if (!defaultPrompt) throw new Error(`Prompt ID not found: ${id}`);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let model = data.model || defaultPrompt.model;
            if (MODEL_REMAPS[model]) model = MODEL_REMAPS[model];
            return { ...defaultPrompt, ...data, id, model };
        }
        return defaultPrompt;
    },
    async savePromptConfig(config: AIPromptConfig): Promise<void> {
        const { id, ...rest } = config;
        const docRef = doc(db, AI_PROMPTS_COLLECTION, id);
        await setDoc(docRef, cleanObject(rest), { merge: true });
    },

    async resetToDefault(id: PromptId): Promise<void> {
        const docRef = doc(db, AI_PROMPTS_COLLECTION, id);
        await deleteDoc(docRef);
    },

    async getAllPromptConfigs(): Promise<AIPromptConfig[]> {
        const snapshot = await getDocs(collection(db, AI_PROMPTS_COLLECTION));
        const customPrompts = snapshot.docs.reduce((acc, doc) => {
            acc[doc.id] = doc.data();
            return acc;
        }, {} as Record<string, Partial<AIPromptConfig>>);

        return DEFAULT_AI_PROMPTS.map(def => {
            const custom = customPrompts[def.id];
            if (!custom) return def;
            let model = custom.model || def.model;
            if (MODEL_REMAPS[model]) model = MODEL_REMAPS[model];
            return {
                ...def,
                ...custom,
                id: def.id as PromptId,
                model
            };
        });
    }
};
