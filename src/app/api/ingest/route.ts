import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EQUIPMENT_PURPOSES } from "@/src/lib/types";
import { SystemConfigService } from "@/src/lib/firebase/system-config-service";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
      5. For Cisco Catalyst Routers (C8000 series): 
         - Check if the device has an integrated cellular radio or supports PIM (Pluggable Interface Modules).
         - Models with integrated cellular should set "integrated_cellular": true.
         - Models with PIM slots should set "modular_cellular": true.
      6. For Cisco Catalyst 8000 Series THROUGHPUT MAPPING:
         - Map "Forwarding (512B)" to rawFirewallThroughputMbps.
         - Map "IPsec (512B)" to sdwanCryptoThroughputMbps (e.g. 1.5 Gbps -> 1500).
         - Map "SD-WAN (512B)" to advancedSecurityThroughputMbps (e.g. 900 Mbps -> 900). 
         - If a value is "-" or missing, set the corresponding Mbps to 0.
      7. For Cisco Catalyst: Focus on port density (24/48), PoE standard (PoE+, UPOE), and uplink flexibility.
            `
      : vendorId === "meraki"
        ? `
      1. For Meraki Switches (MS Series): Set "performance_rating" to "Wire Rate".
      2. For Meraki Switches: Extract SFP/SFP+ uplink module compatibility if listed.
      3. For Meraki Switches: Extract power supply part numbers and PoE budgets.
      4. For Meraki Security appliances (MX):
         - Look for models ending in "CW" (e.g., MX68CW) which indicate "integrated_cellular": true and "cellular_type": "LTE" or "5G".
         - Terminology Mapping:
           - Map "Stateful Firewall Throughput" or "NGFW Throughput" to rawFirewallThroughputMbps.
           - Map "Maximum Site-to-Site VPN Throughput" (Auto VPN) to sdwanCryptoThroughputMbps.
           - Map "Advanced Security Services Throughput" to advancedSecurityThroughputMbps.
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
            "primary_purpose": "WAN | LAN | WLAN | Security",
            "additional_purposes": ["WAN", "Security", etc],
            "family": "Product Family (e.g. Catalyst 9200, Meraki MX)",
            "managementSize": "'X-Small' | 'Small' | 'Medium' | 'Large' | 'X-Large' | 'None'",
            "mapped_services": ["String of Service names this equipment supports, e.g. 'Managed SD-WAN', 'Managed LAN', 'Managed Wi-Fi'"],
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
              "usage": String,
              "radioSpecification": String,
              "spatialStreams": String,
              "aggregateFrame": String,
              "interfaces": String,
              "management": String,
              "power": String,
              "rawFirewallThroughputMbps": Number,
              "sdwanCryptoThroughputMbps": Number,
              "advancedSecurityThroughputMbps": Number,
              "integrated_cellular": Boolean,
              "modular_cellular": Boolean,
              "cellular_type": "LTE | 5G | LTE/5G",
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
      6. MAPPING THROUGHPUT METRICS (Units MUST be In Mbps, e.g. "1.5 Gbps" -> 1500):
         - rawFirewallThroughputMbps: "Forwarding (512B)" [Cisco] OR "Stateful Firewall" [Meraki].
         - sdwanCryptoThroughputMbps: "IPsec (512B)" [Cisco] OR "Site-to-Site VPN" [Meraki].
         - advancedSecurityThroughputMbps: "SD-WAN (512B)" [Cisco] OR "Advanced Security" [Meraki].
      7. ESTIMATING MANAGEMENT SIZE:
         - If access switch ports < 8 or micro firewall: "X-Small".
         - If access switch ports < 24 or small firewall: "Small".
         - If access switch ports >= 24 or medium firewall: "Medium".
         - If large core switch / chassis or high-end border router: "Large" or "X-Large".
         - If accessory: "None".
      8. Return ONLY the JSON object. No markdown.
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

        // Normalize mapped_services to array if string, or use empty
        let mappedServices = itemObj.mapped_services;
        if (typeof mappedServices === 'string') {
          mappedServices = [mappedServices];
        } else if (!Array.isArray(mappedServices)) {
          mappedServices = [];
        }

        return {
          ...itemObj,
          id: activeId,
          vendor_id: vendorId,
          primary_purpose: primary,
          additional_purposes: additional,
          mapped_services: mappedServices,
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
