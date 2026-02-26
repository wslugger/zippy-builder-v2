/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

// ============================================================
// Shared Utilities
// ============================================================

/**
 * ISO 8601 timestamps automatically set in the service layer.
 * Optional so existing Firestore records without them remain valid.
 */
export interface Timestamps {
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Equipment Types
// ============================================================

// Valid values for Vendor and Purpose based on implementation plan
export const VENDOR_IDS = ["cisco_catalyst", "meraki", "hpe_aruba_sdwan", "hpe_aruba_sdbranch"] as const;

export const VENDOR_LABELS: Record<typeof VENDOR_IDS[number], string> = {
  cisco_catalyst: "Cisco Catalyst",
  meraki: "Meraki",
  hpe_aruba_sdwan: "HPE Aruba SDWAN",
  hpe_aruba_sdbranch: "HPE Aruba SD BRANCH"
};

export const EQUIPMENT_PURPOSES = ["WAN", "LAN", "WLAN", "Security"] as const;
export const CELLULAR_TYPES = ["LTE", "5G", "LTE/5G"] as const;
export const WIFI_STANDARDS = ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"] as const;
export const EQUIPMENT_STATUSES = ["Supported", "In development", "Not supported", "eos"] as const;

export const EQUIPMENT_ROLES = ["WAN", "LAN", "WLAN", "SECURITY"] as const;
export type EquipmentRole = typeof EQUIPMENT_ROLES[number];

export const WANSpecsSchema = z.object({
  rawFirewallThroughputMbps: z.number(),
  sdwanCryptoThroughputMbps: z.number(),
  advancedSecurityThroughputMbps: z.number(),
  vpn_tunnels: z.number().optional(),
  wanPortCount: z.number().default(0),
  lanPortCount: z.number().default(0),
  sfpPortCount: z.number().optional(),
  // Support mixed WAN/LAN fields often used in compact branches
  ports: z.number().optional(),
  poe_budget: z.number().optional(),
  rack_units: z.number().optional(),
  mounting_options: z.array(z.string()).optional(),
  stacking_supported: z.boolean().optional(),
  stacking_bandwidth_gbps: z.number().optional(),
  forwarding_rate_mpps: z.number().optional(),
  switching_capacity_gbps: z.number().optional(),
  primary_power_supply: z.string().nullish().catch(undefined),
  secondary_power_supply: z.string().nullish().catch(undefined),
  poe_capabilities: z.string().nullish().catch(undefined),
  power_load_max_watts: z.number().nullish().catch(undefined),
  integrated_cellular: z.boolean().nullish().catch(undefined),
  cellular_type: z.enum(CELLULAR_TYPES).nullish().catch(undefined),
  integrated_wifi: z.boolean().nullish().catch(undefined),
  wifi_standard: z.enum(WIFI_STANDARDS).nullish().catch(undefined),
  modular_cellular: z.boolean().nullish().catch(undefined),
}).passthrough();

export const LANSpecsSchema = z.object({
  accessPortCount: z.number().catch(24),
  accessPortType: z.enum(['1G-Copper', 'mGig-Copper', '10G-Copper', '1G-Fiber', '10G-Fiber']).catch('1G-Copper'),
  poeBudgetWatts: z.number().catch(0),
  poeStandard: z.enum(['None', 'PoE+', 'PoE++']).catch('None'),
  uplinkPortCount: z.number().catch(4),
  uplinkPortType: z.enum(['1G-Copper', '1G-Fiber', '10G-Copper', '10G-Fiber', '25G-Fiber', '40G-Fiber', '100G-Fiber']).catch('10G-Fiber'),
  isStackable: z.boolean().catch(false),
}).passthrough();

export const WLANSpecsSchema = z.object({
  wifiStandard: z.enum(['Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7']).catch('Wi-Fi 6'),
  mimoBandwidth: z.enum(['2x2', '4x4']).catch('2x2'),
  powerDrawWatts: z.number().catch(15),
  uplinkType: z.enum(['1G-Copper', 'mGig-Copper', '10G-Copper']).catch('1G-Copper'),
  environment: z.enum(['Indoor', 'Outdoor', 'Hazardous']).catch('Indoor'),
}).passthrough();

const BaseEquipmentSchema = z.object({
  id: z.string().describe("Unique ID: vendor_model_sku (e.g. meraki_mx85)"),
  model: z.string(),
  make: z.string().optional().describe("Manufacturer/Make"),
  active: z.boolean().default(true),
  status: z.enum(EQUIPMENT_STATUSES).default("Supported"),
  vendor_id: z.enum(VENDOR_IDS),
  primary_purpose: z.enum(EQUIPMENT_PURPOSES).default("LAN"),
  additional_purposes: z.array(z.enum(EQUIPMENT_PURPOSES)).catch([]).default([]),
  family: z.string().optional().describe("Product family (e.g. MX, Catalyst 8000)"),
  description: z.string().optional(),
  end_of_life: z.string().optional().describe("ISO Date string or 'Not Announced'"),
  formFactor: z.string().optional(),
  price: z.number().optional(), // Deprecated in favor of pricing object
  listPrice: z.number().optional().describe("Vendor list price from pricing CSV ingest"), // Deprecated in favor of pricing object
  pricing: z.object({
    purchasePrice: z.number(),
    rentalPrice: z.number().optional(),
  }).optional(),
  pricingEffectiveDate: z.string().optional().describe("ISO date when this price became effective"),
  eosDate: z.string().nullable().optional().describe("ISO date of End-of-Sale announcement"),
  datasheet_url: z.string().optional(),
  images: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const EquipmentSchema = z.preprocess(
  (data: unknown) => {
    if (data && typeof data === 'object') {
      const d = data as any;
      const ROLE_MAP: Record<string, string> = { "WAN": "WAN", "LAN": "LAN", "WLAN": "WLAN", "Security": "SECURITY" };

      // Backward compatibility: migrate purpose array to primary/additional
      if (Array.isArray(d.purpose) && !d.primary_purpose) {
        const firstValidPurpose = d.purpose.find((p: string) => ROLE_MAP[p]);
        d.primary_purpose = firstValidPurpose || "LAN";
        d.additional_purposes = d.purpose.filter((p: string) => p !== d.primary_purpose);
      } else if (typeof d.purpose === 'string' && !d.primary_purpose) {
        d.primary_purpose = d.purpose;
        d.additional_purposes = [];
      }

      // Ensure we have a valid role derived from primary_purpose
      const role = ROLE_MAP[d.primary_purpose] || d.role || "LAN";
      return { ...d, role };
    }
    return data;
  },
  z.discriminatedUnion("role", [
    BaseEquipmentSchema.extend({
      role: z.literal("WAN"),
      specs: WANSpecsSchema,
    }),
    BaseEquipmentSchema.extend({
      role: z.literal("LAN"),
      specs: LANSpecsSchema,
    }),
    BaseEquipmentSchema.extend({
      role: z.literal("WLAN"),
      specs: WLANSpecsSchema,
    }),
    BaseEquipmentSchema.extend({
      role: z.literal("SECURITY"),
      specs: z.record(z.string(), z.unknown()),
    }),
  ])
);

export type Equipment = z.infer<typeof EquipmentSchema>;
export type BaseEquipment = z.infer<typeof BaseEquipmentSchema>;
export type WANSpecs = z.infer<typeof WANSpecsSchema>;
export type LANSpecs = z.infer<typeof LANSpecsSchema>;
export type WLANSpecs = z.infer<typeof WLANSpecsSchema>;

// ============================================================
// Service & Package Types
// ============================================================

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

export interface TechnicalFeature extends Timestamps {
  id: string; // e.g. "bgp"
  name: string; // "BGP Routing"
  category: string; // "Routing", "Security", etc.
  status?: typeof EQUIPMENT_STATUSES[number];
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

export interface Package extends Timestamps {
  id: string; // e.g. "cost_centric"
  name: string; // "Cost Centric"
  short_description: string;
  detailed_description: string;
  items: PackageItem[];
  collateral?: PackageCollateral[];
  active: boolean;
  throughput_basis?: "rawFirewallThroughputMbps" | "sdwanCryptoThroughputMbps" | "advancedSecurityThroughputMbps";
  throughput_overhead_mbps?: number; // Base overhead for the package (e.g. VPN overhead)
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
  throughput_overhead_mbps?: number; // Additional bandwidth overhead (e.g. VPN)
  vendor_id?: typeof VENDOR_IDS[number]; // Explicit vendor binding (preferred over string-matching fallback)
}

export interface ServiceOption extends ServiceItem {
  design_options: DesignOption[];
  vendor_id?: typeof VENDOR_IDS[number]; // Explicit vendor binding (preferred over string-matching fallback)
}

export interface Service extends ServiceItem, Timestamps {
  service_options: ServiceOption[];
  active: boolean;
  sortOrder?: number;
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
  name?: string; // Human readable name
  description?: string; // Description of the catalog
  fields: {
    [key: string]: CatalogField;
  };
}

export interface ManagementPricingMatrix {
  [tier: string]: {
    nrc: number;
    mrc: number;
  };
}

export interface PricingSummary {
  totalOTCNet: number;
  totalOTCList: number;
  totalMRCNet: number;
  totalMRCList: number;
}

// ============================================================
// Solutions Architect (SA) Flow Types
// ============================================================

export interface WorkflowStep {
  id: string;
  label: string;
  path: string;
}

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

export interface GeneratedHLD {
  executiveSummary: string;
  servicesIncluded: string;
  bomSummary: string;
  conclusion: string;
  appendixA: string;
  appendixB: string;
}

export interface AIAnalysisResult {
  packageId: string;
  confidence: number;
  reasoning: string;
}

// ============================================================
// AI Prompt Admin Types
// ============================================================

export const PROMPT_IDS = [
  'package_selection',
  'recommended_design',
  'bom_generation',
  'hld_generation',
  'bom_logic_rules',
] as const;

export type PromptId = typeof PROMPT_IDS[number];

export interface AIPromptConfig {
  id: PromptId;
  label: string;
  description: string;
  model: string;           // e.g. "gemini-2.5-flash"
  temperature: number;     // 0.0 – 1.0
  systemInstruction?: string;
  userPromptTemplate: string;
  updatedAt?: string;
}

// ============================================================
// Site Types (formerly site-types.ts)
// ============================================================

export interface SiteConstraint {
  id: string;
  description: string;
  type: string;
  rule?: {
    field: string;
    operator: "equals" | "min" | "max" | "includes" | "distinct";
    value: string | number | boolean | string[];
  };
}

export interface SiteDefault {
  redundancy: {
    cpe: string;
    circuit: string;
  };
  slo: number; // e.g. 99.9 or 99.99
  requiredServices: string[]; // IDs of services that MUST be present (e.g. "managed_sdwan")
}

export interface SiteType extends Timestamps {
  id: string;
  name: string;
  category: "SD-WAN" | "LAN" | "WLAN";
  description: string; // From MD docs
  constraints: SiteConstraint[];
  defaults: SiteDefault;
}

export const SiteTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["SD-WAN", "LAN", "WLAN"]),
  description: z.string(),
  constraints: z.array(z.any()), // Simplified for zod
  defaults: z.object({
    redundancy: z.object({
      cpe: z.string(),
      circuit: z.string()
    }),
    slo: z.number().min(0).max(100),
    requiredServices: z.array(z.string())
  }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// ============================================================
// BOM Types (formerly bom-types.ts)
// ============================================================

// --- Site (individual site from CSV import) ---

export interface EmbeddedEquipmentSnapshot {
  id: string; // The original Equipment document ID
  model: string;
  vendor_id: typeof VENDOR_IDS[number];
  specs_summary: {
    throughput?: number;
    ports?: number;
  };
  addedAt: string; // ISO string of when it was attached to the site
}

export interface EmbeddedServiceSnapshot {
  id: string; // The original Service document ID
  name: string;
  category?: string;
  addedAt: string;
}


export const SiteSchema = z.object({
  id: z.string().optional(), // specific ID if tracking by ID
  siteTypeId: z.string().optional(), // Reference to SiteType
  lanSiteTypeId: z.string().optional(), // Reference to LAN SiteType
  name: z.string(),
  address: z.string(),
  userCount: z.number(),
  bandwidthDownMbps: z.number(),
  bandwidthUpMbps: z.number(),
  redundancyModel: z.string(), // "Dual CPE", "Single CPE"
  wanLinks: z.number(),
  lanPorts: z.number(),
  poePorts: z.number(),
  indoorAPs: z.number(),
  outdoorAPs: z.number(),
  primaryCircuit: z.string(), // "DIA", "Broadband"
  secondaryCircuit: z.string().optional(),
  notes: z.string().optional(),
  accessPortSpeed: z.enum(['1G-Copper', 'mGig-Copper', '10G-Copper', '1G-Fiber', '10G-Fiber']).optional(),
  uplinkPortType: z.enum(['1G-Copper', '1G-Fiber', '10G-Copper', '10G-Fiber', '25G-Fiber', '40G-Fiber', '100G-Fiber']).optional(),
  poeStandard: z.enum(['None', 'PoE+', 'PoE++']).optional(),
  requiredPoePorts: z.number().optional(),
  embeddedEquipment: z.array(z.any()).optional(), // typed as EmbeddedEquipmentSnapshot[] in usage
  embeddedServices: z.array(z.any()).optional(),  // typed as EmbeddedServiceSnapshot[] in usage
});

export type Site = Omit<z.infer<typeof SiteSchema>, 'embeddedEquipment' | 'embeddedServices'> & {
  embeddedEquipment?: EmbeddedEquipmentSnapshot[];
  embeddedServices?: EmbeddedServiceSnapshot[];
};

// --- BOM Logic ---

export type LogicOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in_list";

export interface LogicCondition {
  field: keyof Site | "packageId" | "serviceId" | "designOptionId";
  operator: LogicOperator;
  value: string | number | boolean | string[];
}

export interface SystemParameterDefinition {
  id: string; // e.g. "maxPortUtilization"
  label: string; // "Max Port Utilization (%)"
  description: string;
  type: "number" | "boolean" | "string" | "enum";
  options?: string[]; // Only if type is "enum"
  defaultValue: any;
}

export const SYSTEM_PARAMETERS: SystemParameterDefinition[] = [
  { id: 'defaultAccessSpeed', label: 'Default Access Speed', description: 'The default port speed for LAN access switches.', type: 'enum', options: ['1G-Copper', 'mGig-Copper', '10G-Copper', '1G-Fiber', '10G-Fiber'], defaultValue: '1G-Copper' },
  { id: 'defaultUplinkType', label: 'Default Uplink Type', description: 'The default media type for LAN switch uplinks.', type: 'enum', options: ['1G-Copper', '1G-Fiber', '10G-Copper', '10G-Fiber', '25G-Fiber', '40G-Fiber', '100G-Fiber'], defaultValue: '10G-Fiber' },
  { id: 'poeStandard', label: 'PoE Standard', description: 'Required Power over Ethernet standard.', type: 'enum', options: ['None', 'PoE+', 'PoE++'], defaultValue: 'PoE+' },
  { id: 'maxPortUtilization', label: 'Max Port Utilization (%)', description: 'Target maximum utilization for switch ports before adding another switch.', type: 'number', defaultValue: 100 },
  { id: 'maxStackSize', label: 'Max Stack Size', description: 'Maximum number of switches in a stack.', type: 'number', defaultValue: 8 },
  { id: 'haLanPortMinimum', label: 'HA LAN Port Minimum', description: 'Minimum number of free LAN ports required on a WAN device for HA sync links.', type: 'number', defaultValue: 1 },
  { id: 'fiberTransceiverNote', label: 'Fiber Transceiver Note', description: 'Automatically add a note requiring transceivers when selecting fiber uplinks.', type: 'boolean', defaultValue: true },
  { id: 'throughputBasis', label: 'Throughput Basis', description: 'The performance metric to use when selecting network equipment throughput capabilities.', type: 'enum', options: ['sdwanCryptoThroughputMbps', 'advancedSecurityThroughputMbps', 'rawFirewallThroughputMbps'], defaultValue: 'sdwanCryptoThroughputMbps' },
];

export interface BOMLogicAction {
  type: "select_equipment" | "enable_feature" | "set_configuration" | "set_parameter" | "modify_quantity";
  targetId: string; // SKU, Feature ID, or Parameter Name
  actionValue?: string | number | boolean; // The value to set (e.g. default uplink speed)
  quantity?: number; // Fixed number or derived? (e.g. 1 per site)
  quantityMultiplierField?: keyof Site; // e.g. "indoorAPs" -> 1 per AP count
}

export interface BOMLogicRule {
  id: string;
  name: string;
  priority: number; // Higher number = higher priority
  condition: Record<string, unknown>; // JSON Logic condition
  actions: BOMLogicAction[];
}

// --- BOM Output ---

export interface BOMLineItem {
  id: string;
  siteName: string;
  serviceId: string;
  serviceName: string; // Snapshot
  itemId: string; // Equipment SKU or Feature ID
  itemName: string; // Snapshot
  itemType: "equipment" | "feature" | "license" | "labor";
  quantity: number;
  unitPrice?: number; // Placeholder
  totalPrice?: number; // Placeholder
  reasoning?: string; // Which rule triggered this?
  alternatives?: { itemId: string; itemName: string; reasoning?: string; specSummary?: string }[];
  matchedRules?: { ruleId: string; ruleName: string; description?: string }[];
  unitOTC?: number;
  unitMRC?: number;
  totalOTC?: number;
  totalMRC?: number;
  /** Pricing snapshot captured at BOM generation time. Protects historical BOMs from future price changes. */
  pricing?: {
    listPrice: number; // Legacy
    purchasePrice?: number;
    rentalPrice?: number;
    discountPercent: number;
    netPrice: number;
    effectiveDate?: string;
  };
}

export interface BOM {
  id: string;
  projectId: string;
  createdAt: string;
  items: BOMLineItem[];
  summary: {
    totalOneTimeCost?: number;
    totalMonthlyCost?: number;
    siteCount: number;
  };
  pricingSummary?: PricingSummary;
}

export interface BOMEngineInput {
  projectId: string;
  sites: Site[];
  selectedPackage: Package;
  services: Service[];
  siteTypes: SiteType[];
  equipmentCatalog: Equipment[];
  rules: BOMLogicRule[];
  manualSelections?: Record<string, string>;
  globalParameters?: Record<string, any>;
}

export const SystemConfigSchema = z.object({
  taxonomy: z.object({
    regions: z.array(z.string()).default([]),
    siteTypes: z.array(z.string()).default([]),
    vendors: z.array(z.string()).default([]),
    purposes: z.array(z.string()).default([]),
    cellular_types: z.array(z.string()).default([]),
    wifi_standards: z.array(z.string()).default([]),
    mounting_options: z.array(z.string()).default([]),
    recommended_use_cases: z.array(z.string()).default([]),
    interface_types: z.array(z.string()).default([]),
    feature_categories: z.array(z.string()).default([]),
    service_categories: z.array(z.string()).default([]),
    design_option_categories: z.array(z.string()).default([]),
  }).catchall(z.any()).default({
    regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
    siteTypes: ['Small Branch', 'Medium Branch', 'Large Branch', 'Headquarters', 'Data Center', 'Remote/Home Office'],
    vendors: ['Cisco Catalyst', 'Meraki', 'HPE Aruba'],
    purposes: ['WAN', 'LAN', 'WLAN', 'SECURITY'],
    cellular_types: ['LTE', '5G', 'LTE/5G'],
    wifi_standards: ['Wi-Fi 5', 'Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7'],
    mounting_options: ['Rack', 'Wall', 'Desktop', 'Ceiling'],
    recommended_use_cases: ['High Density', 'Outdoor', 'Harsh Environment', 'Standard Office'],
    interface_types: ['1G-Copper', '10G-Copper', 'mGig-Copper', '1G-Fiber', '10G-Fiber', '25G-Fiber', '40G-Fiber', '100G-Fiber'],
    feature_categories: ['SD-WAN', 'Security', 'Routing', 'Switching', 'Wireless', 'Visibility'],
    service_categories: ['Managed WAN', 'Managed LAN', 'Managed WLAN', 'Managed Security'],
    design_option_categories: ['Redundancy', 'Performance', 'Scale', 'Topology']
  }),
  calculationBaselines: z.object({
    defaultRedundancyFactor: z.number().default(1),
    wanThroughputBuffer: z.number().default(0),
  }).catchall(z.any()).default({ defaultRedundancyFactor: 1, wanThroughputBuffer: 0 }),
  defaults: z.object({
    currency: z.string().default('USD'),
    defaultTermMonths: z.number().default(36),
  }).catchall(z.any()).default({ currency: 'USD', defaultTermMonths: 36 }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).catchall(z.any());

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

