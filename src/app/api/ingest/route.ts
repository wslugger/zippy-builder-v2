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
      1. For Cisco Catalyst: Look at "Forwarding (512B)" for ngfw_throughput_mbps.
      2. For Cisco Catalyst: Look at "Threat protection (EMIX)" for adv_sec_throughput_mbps.
      3. For Cisco Catalyst: Look at "IPsec (512B)" for vpn_throughput_mbps.
      4. For Cisco Catalyst: If a value like "1.2 Gbps" is found, convert to Mbps (1200).
            `
            : `
      1. For Meraki MX: Look at "NGFW Throughput" for ngfw_throughput_mbps.
      2. For Meraki MX: Look at "Advanced security services throughput" for adv_sec_throughput_mbps.
      3. For Meraki MX: Look at "Maximum site-to-site VPN throughput" for vpn_throughput_mbps.
      4. For Meraki MX: Extract interface descriptions exactly (e.g., "1x GbE RJ45").
      5. For Meraki MX: For "Power load", split "Idle/Max" (e.g. 5W/14W) into power_load_idle_watts=5 and power_load_max_watts=14.
            `;

        const prompt = `
      You are an expert Network Engineer and Data Analyst.
      Your task is to extract technical specifications for ALL equipment models listed in the provided datasheet.
      
      Target Vendor: ${vendorId}
      
      The datasheet may contain multiple models in tables. Please extract each unique model as a separate object.
      Return a JSON array of objects adhering to this schema:
      {
        "items": [
          {
            "model": "Model Name (e.g. MX85)",
            "description": "Short description of the device",
            "purpose": ["SDWAN", "WLAN"] (Array of: ${activePurposes.join(", ")}),
            "family": "Product Family (e.g. MX, Catalyst 8000)",
            "specs": {
              "ngfw_throughput_mbps": Number (NGFW Forwarding),
              "adv_sec_throughput_mbps": Number (Advanced Security/SD-WAN),
              "vpn_throughput_mbps": Number (Site-to-Site VPN),
              "vpn_tunnels": Number (Max VPN Tunnels),
              "wan_interfaces_desc": String (e.g. "1x GbE RJ45", use types from: ${activeInterfaceTypes.join(", ")}),
              "lan_interfaces_desc": String (e.g. "4x GbE RJ45", use types from: ${activeInterfaceTypes.join(", ")}),
              "convertible_interfaces_desc": String (e.g. "1x GbE RJ45", use types from: ${activeInterfaceTypes.join(", ")}),
              "integrated_cellular": Boolean (True if LTE/SIM slot present),
              "modular_cellular": Boolean (True if supports Pluggable Interface Modules/PIM),
              "cellular_type": "${activeCellularTypes.join(", ")}",
              "integrated_wifi": Boolean (True if Wi-Fi/802.11 present),
              "wifi_standard": "${activeWifiStandards.join(", ")}",
              "power_supply_watts": Number (Power supply wattage),
              "power_load_max_watts": Number (Max power load),
              "power_load_idle_watts": Number (Idle power load),
              "recommended_use_case": String (Extract from datasheet or suggest from: ${activeUseCases.join(", ")}),
              "ports": Number (Total LAN interfaces),
              "poe_budget": Number (if applicable),
              "rack_units": Number (e.g. 1, only if 'Rack' mounting is supported),
              "mounting_options": [${activeMountingOptions.map(m => `"${m}"`).join(", ")}] (Array of supported mounting types)
            }
          }
        ]
      }

      CRITICAL INSTRUCTIONS:
      ${vendorSpecificInstructions}
      6. Return ONLY the JSON object. No markdown.
      7. For "mounting_options": Check datasheet for "Mounting", "Form Factor", or installation guides. If it fits in a rack, add "Rack". If it's desktop, add "Desktop". If wall mountable, add "Wall".
      8. Detect Integrated Features: If the device has an integrated LTE/4G/5G modem or SIM slot, set "integrated_cellular": true.
      9. Detect Modular Cellular: If the device supports "PIM", "Pluggable Interface Module", or has a "NIM" slot for cellular, set "modular_cellular": true.
      10. If either integrated or modular cellular is present, determine "cellular_type" (${activeCellularTypes.join(", ")}).
      11. If it has integrated Wi-Fi (802.11), set "integrated_wifi": true and determine "wifi_standard" (${activeWifiStandards.join(", ")}).
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

            const finalItems = items.map((item: { model: string } & Record<string, unknown>) => {
                const activeId = `${vendorId}_${item.model.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
                return {
                    ...item,
                    id: activeId,
                    vendor_id: vendorId,
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
