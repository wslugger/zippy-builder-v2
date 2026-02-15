import { z } from "zod";

// Valid values for Vendor and Purpose based on implementation plan
export const VENDOR_IDS = ["cisco_catalyst", "meraki", "hpe_aruba_sdwan", "hpe_aruba_sdbranch"] as const;

export const VENDOR_LABELS: Record<typeof VENDOR_IDS[number], string> = {
  cisco_catalyst: "Cisco Catalyst",
  meraki: "Meraki",
  hpe_aruba_sdwan: "HPE Aruba SDWAN",
  hpe_aruba_sdbranch: "HPE Aruba SD BRANCH"
};

export const EQUIPMENT_PURPOSES = ["SDWAN", "LAN", "WLAN", "Security"] as const;
export const CELLULAR_TYPES = ["LTE", "5G", "LTE/5G"] as const;
export const WIFI_STANDARDS = ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"] as const;
export const EQUIPMENT_STATUSES = ["Supported", "In development", "Not supported"] as const;

export const EquipmentSchema = z.object({
  id: z.string().describe("Unique ID: vendor_model_sku (e.g. meraki_mx85)"),
  model: z.string(),
  active: z.boolean().default(true),
  status: z.enum(EQUIPMENT_STATUSES).default("Supported"),
  vendor_id: z.enum(VENDOR_IDS),
  purpose: z.array(z.enum(EQUIPMENT_PURPOSES)),
  family: z.string().optional().describe("Product family (e.g. MX, Catalyst 8000)"),
  description: z.string().optional(),
  end_of_life: z
    .string()
    .optional()
    .describe("ISO Date string or 'Not Announced'"),
  specs: z.object({
    ngfw_throughput_mbps: z.number().optional(),
    adv_sec_throughput_mbps: z.number().optional(),
    vpn_throughput_mbps: z.number().optional(),
    vpn_tunnels: z.number().optional(),
    wan_interfaces_count: z.number().optional(), // numeric sum
    wan_interfaces_desc: z.string().optional(), // "1x GbE RJ45"
    lan_interfaces_count: z.number().optional(),
    lan_interfaces_desc: z.string().optional(),
    convertible_interfaces_desc: z.string().optional(),
    integrated_cellular: z.boolean().optional(),
    modular_cellular: z.boolean().optional().describe("Supports Pluggable Interface Modules (PIM)"),
    cellular_type: z.enum(CELLULAR_TYPES).optional(),
    integrated_wifi: z.boolean().optional(),
    wifi_standard: z.enum(WIFI_STANDARDS).optional(),
    power_supply_watts: z.number().optional(),
    power_load_idle_watts: z.number().optional(),
    power_load_max_watts: z.number().optional(),
    recommended_use_case: z.string().optional(),
    ports: z.number().optional(),
    poe_budget: z.number().optional(),
    power_rating_watts: z.number().optional(),
    rack_units: z.number().optional(),
    mounting_options: z.array(z.string()).optional(),
    max_clients: z.number().optional(),
    power_connector_type: z.string().optional(),
  }),
  images: z.array(z.string()).optional(),
  datasheet_url: z.string().optional(),
});

export type Equipment = z.infer<typeof EquipmentSchema>;



export const SERVICE_CATEGORIES = [
  "Fiber",
  "Broadband",
  "Satellite",
  "Wireless",
  "Cybersecurity",
  "Managed Services",
] as const;

export const DESIGN_OPTION_CATEGORIES = [
  "Topology",
  "East-West Security",
  "Internet Breakout",
] as const;

export interface TechnicalFeature {
  id: string; // e.g. "bgp"
  name: string; // "BGP Routing"
  category: string; // "Routing", "Security", etc.
  description: string;
  caveats?: string[];
  assumptions?: string[];
}

export type InclusionType = 'required' | 'standard' | 'optional';

export interface PackageCollateral {
  id: string;
  name: string;
  type: 'solution_brief' | 'technical_reference' | 'diagram' | 'other';
  url: string;
  file_name: string;
  uploaded_at: string;
}

export interface PackageFeature {
  feature_id: string;
  inclusion_type: InclusionType;
}

export interface PackageItem {
  service_id: string; // Reference to Service.id
  service_option_id?: string; // Reference to ServiceOption.id
  design_option_id?: string; // Reference to DesignOption.id
  enabled_features: PackageFeature[]; // List of enabled features with inclusion rules
  inclusion_type: InclusionType;
}

export interface Package {
  id: string; // e.g. "cost_centric"
  name: string; // "Cost Centric"
  short_description: string;
  detailed_description: string;
  items: PackageItem[];
  collateral?: PackageCollateral[];
  active: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  caveats: string[];
  assumptions: string[];
  supported_features?: string[]; // IDs of features this service supports
}

export interface DesignOption extends ServiceItem {
  id: string; // Ensure ID is mandatory
  category?: string;
  decision_driver?: string;
  pros?: string[];
  cons?: string[];
}

export interface ServiceOption extends ServiceItem {
  design_options: DesignOption[];
}

export interface Service extends ServiceItem {
  service_options: ServiceOption[];
  active: boolean;
  metadata?: {
    category?: string;
    [key: string]: unknown;
  };
}

export interface CatalogField {
  label: string;
  values: string[];
}

export interface CatalogMetadata {
  id: string; // The catalog ID, e.g., 'service_catalog'
  fields: {
    [key: string]: CatalogField;
  };
}

// --- Solutions Architect (SA) Flow Types ---

export interface Project {
  id: string; // UUID
  userId: string; // Owner (SA)
  name: string;
  customerName: string;
  description?: string;
  status: 'draft' | 'package_selection' | 'customizing' | 'completed';
  currentStep: number; // 1-5 (mapped to UI steps)

  // Step 2: Package Selection
  selectedPackageId?: string;
  packageConfidenceScore?: number; // 0-100
  packageReasoning?: string;

  // Requirements (Gemini Analysis Context)
  requirementsFiles?: string[]; // URLs to storage
  requirementsText?: string; // Extracted text or summary from files

  // Step 4: Customizations
  // We store differences from the base package to allow "reset to default" logic
  selectedFeatures?: string[]; // IDs of selected features (both standard and optional)
  selectedDesignOptions?: Record<string, string>; // categoryId -> designOptionId (e.g. "internet_breakout" -> "local_breakout")

  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string

  // Full snapshot of the configuration (Service/Option/Design/Features)
  // Initialized from Package.items, then modified by SA
  customizedItems?: PackageItem[];
}

export interface AIAnalysisResult {
  packageId: string;
  confidence: number;
  reasoning: string;
}
