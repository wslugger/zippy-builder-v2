import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { SystemConfigService } from "@/src/lib/firebase/system-config-service";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const vendorId = formData.get("vendorId") as string;
    const purposesJson = formData.get("purposes") as string;
    const userSelectedPurposes = purposesJson ? JSON.parse(purposesJson) : null;

    if (!file || !vendorId) {
      return NextResponse.json({ error: "File and Vendor ID are required" }, { status: 400 });
    }
    const config = await SystemConfigService.getConfig();
    const taxonomy = (config?.taxonomy as Record<string, string[]>) || {};
    const activePurposes = taxonomy.purposes || EQUIPMENT_PURPOSES;
    const activeCellularTypes = taxonomy.cellular_types || ["LTE", "5G", "LTE/5G"];
    const activeWifiStandards = taxonomy.wifi_standards || ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"];
    const activeMountingOptions = taxonomy.mounting_options || ["Rack", "Wall", "Desktop", "DIN rail"];
    const activeUseCases = taxonomy.recommended_use_cases || ["Small branch"];
    const activeInterfaceTypes = taxonomy.interface_types || ["1GE RJ45", "10GE SFP+"];

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
      4. For Meraki Switches: If it's an MX Security appliance, look at "Stateful Firewall Throughput" for rawFirewallThroughputMbps, "VPN Throughput" for sdwanCryptoThroughputMbps, and "Advanced Security Throughput" for advancedSecurityThroughputMbps.
            `
        : `
      1. Extract performance metrics as found in documentation.
            `;

    const prompt = `
      You are an expert Network Engineer and Data Analyst.
      Your task is to extract technical specifications for ALL equipment models listed in the provided datasheet.
      
      Target Vendor: ${vendorId}
      ${userSelectedPurposes && userSelectedPurposes.length > 0 ? `HINT: The items in this document likely fall under: ${userSelectedPurposes.join(", ")}. However, prioritize the actual configuration and role found in the datasheet.` : ''}
      
      The datasheet may contain multiple models in tables. Please extract each unique model as a separate object.
      Return a JSON array of objects adhering to this schema:
      {
        "items": [
          {
            "model": "Model Name (e.g. C9200-24T, MX85)",
            "description": "Short description",
            "primary_purpose": "SDWAN | LAN | WLAN | Security",
            "additional_purposes": ["SDWAN", "Security", etc],
            "family": "Product Family (e.g. Catalyst 9200, Meraki MX)",
            "specs": {
              "performance_rating": "Wire Rate | etc",
              "ports": Number (Total),
              "poe_budget": Number (Watts),
              "wanPortCount": Number (WAN-dedicated interfaces),
              "lanPortCount": Number (LAN-dedicated interfaces),
              "accessPortCount": Number (LAN access ports),
              "uplinkPortCount": Number (Uplink/SFP ports),
              "poe_capabilities": String (e.g. "PoE+", "UPOE"),
              "rack_units": Number,
              "stacking_supported": Boolean,
              "wifi_standard": "Wi-Fi 6 | Wi-Fi 6E | Wi-Fi 7",
              "rawFirewallThroughputMbps": Number,
              "sdwanCryptoThroughputMbps": Number,
              "advancedSecurityThroughputMbps": Number,
              "compatible_uplink_modules": [
                { "part_number": String, "description": String, "ports": Number, "speed": String }
              ],
              "compatible_power_supplies": [
                { "part_number": String, "description": String, "wattage": Number, "poe_budget": Number }
              ]
            }
          }
        ]
      }

      CRITICAL INSTRUCTIONS:
      ${vendorSpecificInstructions}
      6. MAPPING THROUGHPUT METRICS:
         - rawFirewallThroughputMbps: Plain stateful firewall / NAT / Forwarding. (Used for DIA-only sites with no advanced security or tunnels).
         - sdwanCryptoThroughputMbps: IPsec + SD-WAN routing. (Used for sites sending traffic to a Hub/SASE where security is handled off-box).
         - advancedSecurityThroughputMbps: IPsec + SD-WAN + IDS/IPS/Malware. (Used for sites doing on-box advanced threat protection).
      7. Return ONLY the JSON object. No markdown.
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
      const items = parsedResponse.items || (Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse]);

      const finalItems = items.map((item: unknown) => {
        const itemObj = item as Record<string, unknown>;
        const modelName = String(itemObj.model || "");
        const activeId = `${vendorId}_${modelName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

        // If Gemini didn't provide purposes, fallback to user selection or LAN
        const primary = (itemObj.primary_purpose as string) || (userSelectedPurposes?.[0] || "LAN");
        const additional = (itemObj.additional_purposes as string[]) || (userSelectedPurposes?.length > 1 ? userSelectedPurposes.slice(1) : []);

        return {
          ...itemObj,
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
