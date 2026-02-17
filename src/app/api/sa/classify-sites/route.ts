import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Site } from "@/src/lib/bom-types";
import { SiteType } from "@/src/lib/site-types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
    console.log("classify-sites: POST request received");
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY IS NOT SET IN ENVIRONMENT");
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        let body;
        try {
            body = await req.json();
        } catch (_e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { sites, availableSiteTypes } = body;

        console.log(`Classifying ${sites?.length || 0} sites against ${availableSiteTypes?.length || 0} types`);

        if (!sites || !Array.isArray(sites)) {
            return NextResponse.json({ error: "No sites provided or sites is not an array" }, { status: 400 });
        }

        if (!availableSiteTypes || !Array.isArray(availableSiteTypes)) {
            return NextResponse.json({ error: "No site types provided or site types is not an array" }, { status: 400 });
        }

        const siteTypesContext = (availableSiteTypes as SiteType[]).map(t => {
            const constraintsText = t.constraints?.length > 0
                ? t.constraints.map(c => `    - ${c.description} (Target: ${c.rule?.field} ${c.rule?.operator} ${c.rule?.value})`).join("\n")
                : "    - No specific constraints defined.";

            const defaultsText = `    - Default Redundancy: ${t.defaults?.redundancy?.cpe} CPE / ${t.defaults?.redundancy?.circuit} Circuit
    - Target SLO: ${t.defaults?.slo}%`;

            return `[TYPE: ${t.name}]
  ID: ${t.id}
  Description: ${t.description}
  Category: ${t.category}
  Matching Rules/Constraints:
${constraintsText}
  Standard Configuration Defaults:
${defaultsText}`;
        }).join("\n\n---\n\n");

        const sitesToClassify = (sites as Site[]).map((s, idx) =>
            `SITE #${idx}:
            Name: ${s.name}
            Address: ${s.address}
            Users: ${s.userCount}
            Bandwidth: ${s.bandwidthDownMbps} Mbps Down / ${s.bandwidthUpMbps} Mbps Up
            Redundancy: ${s.redundancyModel}
            WAN Links: ${s.wanLinks}
            Notes: ${s.notes || "N/A"}`
        ).join("\n\n---\n\n");

        const prompt = `
            You are a Network Solutions Architect expert specializing in SD-WAN, LAN, and WLAN deployments.
            
            Your task is to classify a list of imported sites into the most appropriate "Site Type" (Deployment Profile) from our catalog.
            
            CRITICAL REQUIREMENT:
            Base your classification PRIMARILY on the "Matching Rules/Constraints" and "Description" provided for each Site Type below. 
            If a site definition specifies a user count range or a redundancy model, prioritize that over general assumptions.

            AVAILABLE SITE TYPES IN CATALOG:
            ${siteTypesContext}
            
            SITES TO CLASSIFY:
            ${sitesToClassify}
            
            GUIDELINES:
            1. **Strict Constraint Matching**: If a Site Type has a rule like "userCount min 100", do not assign sites with 20 users to that type.
            2. **Redundancy Priority**: If a site's data says "Dual CPE", favor Site Types that default to "Dual CPE" redundancy.
            3. **Description Context**: Use the "Description" field to understand the business intent of the profile (e.g., "Critical Data Center hub").
            4. **Reasoning**: In your JSON output, explain which specific rule or description lead to your choice.
            
            Output strictly in JSON format as an array of objects:
            [
              {
                "siteIndex": number,
                "siteTypeId": "string (must match one of the available IDs)",
                "confidence": number (0-100),
                "reasoning": "string (e.g. 'Site has 120 users which matches the Large Office min 100 constraint')"
              },
              ...
            ]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("AI Raw Response:", text);

        // More robust JSON extraction
        let jsonString = text;
        const jsonMatch = text.match(/\[[\s\S]*\]/); // Look for an array
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        } else {
            // Fallback to simple cleaning
            jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        try {
            const parsed = JSON.parse(jsonString);
            return NextResponse.json(parsed);
        } catch (parseError: unknown) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.error("Failed to parse AI response as JSON:", text);
            return NextResponse.json({
                error: "Invalid AI response format",
                details: errorMessage,
                rawText: text
            }, { status: 500 });
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error("Site Classification Failed:", error);
        return NextResponse.json({
            error: "Classification failed",
            details: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
        }, { status: 500 });
    }
}
