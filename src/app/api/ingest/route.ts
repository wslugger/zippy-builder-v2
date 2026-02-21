/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { MetadataService } from "@/src/lib/firebase";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const vendorId = formData.get("vendorId") as string;
    const purposesJson = formData.get("purposes") as string;
    const userSelectedPurposes = purposesJson ? JSON.parse(purposesJson) : null;

    if (!file || !vendorId) {
      return NextResponse.json({ error: "File and Vendor ID are required" }, { status: 400 });
    }
    const metadata = await MetadataService.getCatalogMetadata("equipment_catalog");
    const activePurposes = metadata?.fields?.purposes?.values || EQUIPMENT_PURPOSES;
    const activeCellularTypes = metadata?.fields?.cellular_types?.values || ["LTE", "5G", "LTE/5G"];
    const activeWifiStandards = metadata?.fields?.wifi_standards?.values || ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"];
    const activeMountingOptions = metadata?.fields?.mounting_options?.values || ["Rack", "Wall", "Desktop", "DIN rail"];
    const activeUseCases = metadata?.fields?.recommended_use_cases?.values || ["Small branch"];
    const activeInterfaceTypes = metadata?.fields?.interface_types?.values || ["1GE RJ45", "10GE SFP+"];

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const vendorSpecificInstructions = vendorId === "cisco_catalyst"
      ? `
      1. For Cisco Catalyst Switches (9200/9300): Set "performance_rating" to "Wire Rate".
      2. For Cisco Catalyst Switches: Locate "Network Modules" or "Uplink Modules" tables. Extract part numbers, descriptions, port counts, and speeds (e.g. C9300-NM-4G, 4x 1G).
      3. For Cisco Catalyst Switches: Locate "Power Supplies" tables. Extract part numbers, wattages, and the PoE budget they provide (important for BOM sizing).
      4. For Cisco Catalyst Switches: Locate "Stacking" accessories. Extract cables and kit part numbers.
      5. For Cisco Catalyst: Focus on port density (24/48), PoE standard (PoE+, UPOE), and uplink flexibility.
            `
      : vendorId === "meraki"
        ? `
      1. For Meraki Switches (MS Series): Set "performance_rating" to "Wire Rate".
      2. For Meraki Switches: Extract SFP/SFP+ uplink module compatibility if listed.
      3. For Meraki Switches: Extract power supply part numbers and PoE budgets.
      4. For Meraki Switches: If it's an MX Security appliance, use the previous logic: Look at "NGFW Throughput" for ngfw_throughput_mbps, etc.
            `
        : `
      1. Extract performance metrics as found in documentation.
            `;

    const prompt = `
      You are an expert Network Engineer and Data Analyst.
      Your task is to extract technical specifications for ALL equipment models listed in the provided datasheet.
      
      Target Vendor: ${vendorId}
      ${userSelectedPurposes && userSelectedPurposes.length > 0 ? `The items in this document are categorized for the following purposes: ${userSelectedPurposes.join(", ")}. Please prioritize extracting technical specs.` : ''}
      
      The datasheet may contain multiple models in tables. Please extract each unique model as a separate object.
      Return a JSON array of objects adhering to this schema:
      {
        "items": [
          {
            "model": "Model Name (e.g. C9200-24T)",
            "description": "Short description",
            "primary_purpose": "LAN",
            "additional_purposes": [],
            "family": "Product Family (e.g. Catalyst 9200)",
            "specs": {
              "performance_rating": "Wire Rate",
              "ports": Number,
              "poe_budget": Number,
              "poe_capabilities": String (e.g. "PoE+", "UPOE"),
              "wan_interfaces_desc": String,
              "lan_interfaces_desc": String,
              "rack_units": Number,
              "stacking_supported": Boolean,
              "stacking_bandwidth_gbps": Number,
              "compatible_uplink_modules": [
                { "part_number": String, "description": String, "ports": Number, "speed": String }
              ],
              "compatible_power_supplies": [
                { "part_number": String, "description": String, "wattage": Number, "poe_budget": Number }
              ],
              "compatible_stacking_options": [
                { "part_number": String, "description": String, "length_cm": Number }
              ]
            }
          }
        ]
      }

      CRITICAL INSTRUCTIONS:
      ${vendorSpecificInstructions}
      6. Return ONLY the JSON object. No markdown.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown code blocks
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

    console.log("Gemini Raw Response:", jsonString);

    try {
      const parsedResponse = JSON.parse(jsonString);
      const items = parsedResponse.items || [parsedResponse]; // Fallback to single object if not in array

      const finalItems = items.map((item: any) => {
        const activeId = `${vendorId}_${item.model.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
        const finalPurpose = (userSelectedPurposes && userSelectedPurposes.length > 0) ? userSelectedPurposes : (item.purpose || (item.primary_purpose ? [item.primary_purpose, ...(item.additional_purposes || [])] : ["LAN"]));

        const ROLE_MAP: Record<string, string> = { "SDWAN": "WAN", "LAN": "LAN", "WLAN": "WLAN", "Security": "SECURITY" };
        const primary = finalPurpose.find((p: string) => ROLE_MAP[p]) || finalPurpose[0] || "LAN";
        const additional = finalPurpose.filter((p: string) => p !== primary);

        return {
          ...item,
          id: activeId,
          vendor_id: vendorId,
          primary_purpose: primary,
          additional_purposes: additional,
          active: true,
          status: "Supported"
        };
      });

      return NextResponse.json({ data: finalItems });

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return NextResponse.json({ error: "Failed to parse Gemini response", raw: text }, { status: 500 });
    }

  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
