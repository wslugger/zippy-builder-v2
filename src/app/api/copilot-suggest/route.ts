import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contextType, promptData } = body;

        if (contextType === "bom_logic_rule") {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const instruction = promptData?.instruction || "Create a standard rule";
            const serviceCategory = promptData?.serviceCategory || "managed_sdwan";

            const schemaPrompt = `
You are an expert network engineer and configuration AI.
Your task is to take a natural language instruction for a BOM (Bill of Materials) logic rule and convert it into a valid JSON object representing the rule data.

Here is the context:
- Service Category: ${serviceCategory}

**Data Schemas to follow:**

1. **Condition (JSON Logic)**
Supported fields: "serviceId", "packageId", "site.category", "site.bandwidthDownMbps", "site.bandwidthUpMbps", "site.userCount", "site.wanLinks", "site.lanPorts", "site.poePorts", "site.indoorAPs", "site.outdoorAPs".
Supported operators: "==", "!=", ">", "<", ">=", "<=", "in".
The condition MUST evaluate to true or false. It typically takes the form: 
{ "==": [{ "var": "field_name" }, value] } 
or for AND operations: 
{ "and": [ { "==": [{"var": "field1"}, value1] }, { ">": [{"var": "field2"}, value2] } ] }

2. **Actions Array**
Each action should have:
  - "type": "select_equipment" | "enable_feature" | "set_configuration" | "set_parameter" | "modify_quantity"
  - "targetId": string (e.g., parameter name like "defaultAccessSpeed" or SKU like "meraki_mx85_sec")
  - "actionValue": string | number | boolean (optional, value to set)
  - "quantity": number (optional, static quantity)
  - "quantityMultiplierField": string (optional, field to multiply by, e.g., "indoorAPs")

**Input Instruction:**
"${instruction}"

Output strictly a JSON object matching this interface:
{
    "name": string (A concise name for the rule),
    "description": string (A plain English explanation explaining EXACTLY what this rule does, e.g., "Requires mGig switches if indoor APs are present"),
    "condition": Record<string, any> (The JSON Logic condition),
    "actions": Array<Action Object>
}
Ensure there is no markdown code block surrounding the JSON, or if there is, I will parse it out. Output ONLY valid JSON.
            `;

            const result = await model.generateContent(schemaPrompt);
            const text = result.response.text();

            // Cleanup markdown code blocks if any
            let jsonString = text.trim();
            if (jsonString.startsWith("\`\`\`json")) {
                jsonString = jsonString.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
            } else if (jsonString.startsWith("\`\`\`")) {
                jsonString = jsonString.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
            }
            try {
                const generatedRule = JSON.parse(jsonString);
                return NextResponse.json(generatedRule);
            } catch (_err) {
                console.error("Failed to parse Gemini rule JSON:", jsonString);
                return NextResponse.json({ error: "Gemini produced invalid JSON" }, { status: 500 });
            }
        }

        // Simulate AI processing latency for mock responses
        await new Promise(resolve => setTimeout(resolve, 800));

        if (contextType === "sa_lan_ports") {
            // Mock reasoning based on selected site type name
            const siteTypeName = promptData?.lanSiteTypeName?.toLowerCase() || "";
            let suggestedPorts = 48; // default

            if (siteTypeName.includes("campus") || siteTypeName.includes("large")) {
                suggestedPorts = 96;
            } else if (siteTypeName.includes("branch") || siteTypeName.includes("small") || siteTypeName.includes("micro")) {
                suggestedPorts = 24;
            }

            return NextResponse.json({
                suggestion: suggestedPorts
            });
        }

        if (contextType === "admin_service_description") {
            const { name, shortDescription, pros, cons } = promptData || {};
            const pText = (pros || []).join(", ");
            const cText = (cons || []).join(", ");

            const suggestion = `The ${name || "Service"} provides ${shortDescription || "robust connectivity"}. Engineered for modern enterprise environments, it maximizes operational efficiency while minimizing downtime. Key advantages include ${pText || "scalability and high availability"}. Technical considerations to review include ${cText || "environmental constraints"}.`;
            return NextResponse.json({
                suggestion
            });
        }

        if (contextType === "triage_criterion") {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const instruction = promptData?.instruction || "Create an extraction rule";

            const schemaPrompt = `
You are an expert Solutions Architect and Data Engineer.
Your task is to take a natural language instruction for an "AI Extraction Rule" (TriageCriterion) and convert it into a valid JSON object.

Extraction rules define what parameters our AI should look for in unstructured customer notes during site triage.

**Data Schema to follow (TriageCriterion):**
{
    "id": string (A camelCase unique identifier, e.g., "requiresLTE", "isOutdoor", "highTrafficCount"),
    "label": string (Friendly display name, e.g., "Outdoor Rated", "High Density"),
    "type": "boolean" | "string" | "number",
    "promptInstruction": string (Detailed instructions for the AI on how to identify this value in notes)
}

**Input Instruction:**
"${instruction}"

Output strictly a JSON object matching the TriageCriterion schema.
Ensure there is no markdown code block surrounding the JSON. Output ONLY valid JSON.
            `;

            const result = await model.generateContent(schemaPrompt);
            const text = result.response.text();

            let jsonString = text.trim();
            if (jsonString.startsWith("\`\`\`json")) {
                jsonString = jsonString.replace(/^\`\`\`json\s*/, '').replace(/\s*\`\`\`$/, '');
            } else if (jsonString.startsWith("\`\`\`")) {
                jsonString = jsonString.replace(/^\`\`\`\s*/, '').replace(/\s*\`\`\`$/, '');
            }
            try {
                const generatedCriterion = JSON.parse(jsonString);
                return NextResponse.json(generatedCriterion);
            } catch (_err) {
                console.error("Failed to parse Gemini triage criterion JSON:", jsonString);
                return NextResponse.json({ error: "Gemini produced invalid JSON" }, { status: 500 });
            }
        }

        return NextResponse.json(
            { error: "Unknown context type" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Copilot API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
