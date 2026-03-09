import { Package, Equipment, PricingItem, EQUIPMENT_PURPOSES, INTERFACE_TYPES, POE_CAPABILITIES, Site, SiteType, BOMLineItem } from "@/src/lib/types";
/**
 * Shared BOM utility functions.
 * 
 * These pure functions contain business logic used by both the BOM engine
 * and the BOM builder UI. Keeping them in one place prevents logic drift.
 */





/**
 * Canonical service ID normalization.
 * 
 * This map handles legacy/alternative IDs from external data sources (CSV imports,
 * Firestore migration artifacts, etc.) and normalizes them to canonical IDs used
 * throughout the codebase.
 * 
 * This should be applied at data boundaries (import, API ingestion) rather than
 * deep in business logic. The BOM engine calls this once per service during
 * processing as a safety net.
 * 
 * MIGRATION NOTE: Once all Firestore data and seed files use canonical IDs,
 * the non-identity entries (like "sd_wan_service") can be removed.
 */
const SERVICE_ID_ALIASES: Record<string, string> = {
    // Canonical IDs (new)
    "sdwan": "sdwan",
    "lan": "lan",
    "wlan": "wlan",
    // Legacy aliases — kept for backward compatibility with Firestore docs and in-flight data
    "managed_sdwan": "sdwan",
    "sd_wan_service": "sdwan",
    "sdwan_service": "sdwan",
    "managed_lan": "lan",
    "managed_wifi": "wlan",
    "managed_wlan": "wlan",
    "managed_circuit": "sdwan",
    "broadband": "sdwan"
};

export function normalizeServiceId(id: string): string {
    if (!id) return id;
    let normalized = id.toLowerCase().trim();
    
    // Remove common prefixes used in legacy IDs
    if (normalized.startsWith("zippy_")) normalized = normalized.replace("zippy_", "");
    if (normalized.startsWith("managed_")) normalized = normalized.replace("managed_", "");
    
    // Legacy specific mappings
    if (normalized === "sd_wan_service" || normalized === "sdwan_service") return "sdwan";
    if (normalized === "wifi" || normalized === "managed_wifi") return "wlan";
    if (normalized === "circuit" || normalized === "broadband") return "sdwan";

    return SERVICE_ID_ALIASES[normalized] || normalized;
}

/**
 * Consistent key generator for manual selections.
 * Trims and normalizes inputs to prevent mismatches.
 */
export function getSelectionKey(siteName: string, serviceId: string): string {
    return `${(siteName || "").trim()}:${normalizeServiceId(serviceId)}`;
}

// ============================================================
// Purpose Mapping
// ============================================================

/** Maps canonical service IDs to the equipment purpose categories */
export const SERVICE_TO_PURPOSE: Record<string, (typeof EQUIPMENT_PURPOSES)[number]> = {
    "sdwan": "WAN",
    "lan": "LAN",
    "wlan": "WLAN",
};

// ============================================================
// Vendor Resolution
// ============================================================

/**
 * Determines the vendor for a given service based on Package configuration.
 * 
 * Resolution priority:
 * 1. Explicit `vendor_id` on the DesignOption or ServiceOption (data-driven, preferred)
 * 2. String-matching heuristic on option IDs (legacy fallback)
 * 3. Default to "meraki"
 * 
 * @param pkg - The selected package
 * @param serviceId - The service ID to resolve vendor for
 * @param services - Optional service catalog for looking up DesignOption vendor_id
 */
export function resolveVendorForService(
    pkg: Package,
    serviceId: string,
    services?: { id: string; service_options: { id: string; vendor_id?: string; design_options: { id: string; vendor_id?: string }[] }[] }[]
): string {
    const normalizedId = normalizeServiceId(serviceId);
    const pkgItem = pkg.items.find(i => normalizeServiceId(i.service_id) === normalizedId);

    // 1. Try explicit vendor_id from design option data
    if (pkgItem?.design_option_id && services) {
        const service = services.find(s => normalizeServiceId(s.id) === normalizedId);
        const designOption = service?.service_options
            .flatMap(so => so.design_options)
            .find(d => d.id === pkgItem.design_option_id);
        if (designOption?.vendor_id) return designOption.vendor_id;
    }

    // 2. Try explicit vendor_id from service option data
    if (pkgItem?.service_option_id && services) {
        const service = services.find(s => normalizeServiceId(s.id) === normalizedId);
        const serviceOption = service?.service_options.find(so => so.id === pkgItem.service_option_id);
        if (serviceOption?.vendor_id) return serviceOption.vendor_id;
    }

    // 3. Legacy fallback: string-match on option IDs
    const optionId = (pkgItem?.design_option_id || pkgItem?.service_option_id || "").toLowerCase();
    if (optionId.includes("meraki")) return "meraki";
    if (optionId.includes("cisco") || optionId.includes("catalyst")) return "cisco_catalyst";
    if (optionId.includes("fortinet")) return "fortinet";
    if (optionId.includes("palo_alto") || optionId.includes("paloalto")) return "palo_alto";

    // 4. Default
    return "meraki";
}

// ============================================================
// CPE Quantity / Redundancy
// ============================================================

/**
 * Determines the number of CPE devices required for a site.
 * Priority: SiteType defaults > site-level override > fallback to 1
 */
export function calculateCPEQuantity(site: Site, siteDef: SiteType): number {
    const siteModel = (site.redundancyModel || "").toLowerCase();
    const profileRedundancy = (siteDef.defaults.redundancy?.cpe || "").toLowerCase();

    // 1. Explicit Site-level override (e.g. from CSV)
    if (isDualRedundancy(siteModel)) return 2;
    if (siteModel.includes("single")) return 1;

    // 2. If SiteType is NOT generic, it should be the primary hint for unspecified sites
    if (siteDef.id !== "generic" && profileRedundancy) {
        if (isDualRedundancy(profileRedundancy)) return 2;
        if (profileRedundancy.includes("single")) return 1;
    }

    return 1; // Default to single
}

/**
 * Checks if a redundancy string indicates dual/HA configuration.
 * Used by both CPE badge display and engine quantity calculation.
 */
export function isDualRedundancy(value: string): boolean {
    const lower = value.toLowerCase();
    return lower.includes("dual") || lower.includes("ha") || lower.includes("redundant") || lower.includes("active");
}

/**
 * Checks if a circuit string indicates dual/diverse configuration.
 */
export function isDualCircuit(value: string): boolean {
    const lower = value.toLowerCase();
    return lower.includes("dual") || lower.includes("diverse") || lower.includes("hybrid") || lower.includes("multi");
}

// ============================================================
// Throughput Overhead
// ============================================================

/**
 * Calculates the total throughput overhead for a package item,
 * including base package overhead and design option overhead.
 */
export function calculateThroughputOverhead(
    pkg: Package,
    serviceId: string,
    services: { id: string; service_options: { design_options: { id: string; throughput_overhead_mbps?: number }[] }[] }[]
): number {
    let overhead = pkg.throughput_overhead_mbps || 0;

    const pkgItem = pkg.items.find(i => i.service_id === serviceId);
    if (pkgItem?.design_option_id) {
        const service = services.find(s => s.id === serviceId);
        const designOption = service?.service_options
            .flatMap(so => so.design_options)
            .find(d => d.id === pkgItem.design_option_id);

        if (designOption?.throughput_overhead_mbps) {
            overhead += designOption.throughput_overhead_mbps;
        }
    }

    return overhead;
}

// ============================================================
// Equipment Sorting
// ============================================================

/**
 * Returns true if the equipment has the given purpose as primary or additional.
 * Use this for multi-purpose equipment filtering (e.g. WAN+WLAN router).
 */
export function hasEquipmentPurpose(equip: Equipment, purpose: string): boolean {
    const targetPurpose = purpose.toUpperCase();
    const purposes = [
        String(equip.primary_purpose || "").toUpperCase(),
        ...(equip.additional_purposes || []).map(p => String(p).toUpperCase()),
    ];
    return purposes.some(p => p === targetPurpose || p.includes(targetPurpose));
}

/**
 * Detects the primary functional role of a device using fuzzy matching on
 * purpose strings (to handle Firestore's multi-purpose labels).
 */
export function getEquipmentRole(equip: Equipment): "WAN" | "LAN" | "WLAN" | "Other" {
    const raw = equip as Record<string, unknown>;
    const r = String(raw.role || "");
    const pp = String(raw.primary_purpose || "");
    const p = Array.isArray(raw.purpose) ? String(raw.purpose[0] || "") : String(raw.purpose || "");

    if (r === "WAN" || pp === "WAN" || p === "WAN") return "WAN";
    if (r === "WLAN" || pp === "WLAN" || p === "WLAN") return "WLAN";
    if (r === "LAN" || pp === "LAN" || p === "LAN") return "LAN";

    // Fallback to fuzzy includes — WLAN must be checked before WAN (WLAN contains "WAN")
    if (pp.includes("WLAN") || p.includes("WLAN")) return "WLAN";
    if ((pp.includes("WAN") && !pp.includes("WLAN")) || (p.includes("WAN") && !p.includes("WLAN"))) return "WAN";
    if (pp.includes("LAN") || p.includes("LAN")) return "LAN";

    return "Other";
}

/**
 * Sort key for equipment by performance (throughput or ports).
 * Used in both primary candidate ranking and fallback selection.
 */
export function getEquipmentPerformanceValue(equip: Equipment, throughputBasis?: string): number {
    const role = getEquipmentRole(equip);

    if (role === "WAN") {
        const throughputField = throughputBasis || "sdwanCryptoThroughputMbps";
        const specs = equip.specs as Record<string, unknown>;
        const val = specs[throughputField] ?? specs.sdwanCryptoThroughputMbps ?? 0;
        return Number(val) || 0;
    } else if (role === "LAN") {
        const specs = equip.specs as Record<string, unknown>;
        return Number(specs.accessPortCount ?? 0);
    } else if (role === "WLAN") {
        const specs = equip.specs as Record<string, unknown>;
        return Number(specs.powerDrawWatts ?? 0);
    }
    return 0;
}

// ============================================================
// LAN Taxonomy Extraction
// ============================================================

/**
 * Derives the available LAN filter options directly from the active equipment catalog.
 * All dropdown options in LANRequirementsEditor are populated from this function to ensure
 * they always reflect what's actually selectable — no hardcoded enums.
 */
export interface LANTaxonomy {
    accessPortTypes: string[];
    uplinkPortTypes: string[];
    poeCapabilities: string[];
}

export function extractLANTaxonomy(catalog: Equipment[]): LANTaxonomy {
    const catalogAccessPortTypes = new Set<string>();
    const catalogUplinkPortTypes = new Set<string>();
    const catalogPoeCapabilities = new Set<string>();

    catalog
        .filter(e => e.role === 'LAN' && e.active !== false)
        .forEach(e => {
            const specs = e.specs as Record<string, unknown>;
            if (typeof specs.accessPortType === 'string' && specs.accessPortType) {
                catalogAccessPortTypes.add(specs.accessPortType);
            }
            if (typeof specs.uplinkPortType === 'string' && specs.uplinkPortType) {
                catalogUplinkPortTypes.add(specs.uplinkPortType);
            }
            if (typeof specs.poe_capabilities === 'string' && specs.poe_capabilities) {
                catalogPoeCapabilities.add(specs.poe_capabilities);
            }
        });

    // Start with the canonical list (from types.ts constants) as the authoritative base.
    // This ensures all options are always visible even when catalog coverage is sparse.
    // Then append any catalog-only custom values not already in the canonical list.
    const mergeWithBase = (base: readonly string[], catalogValues: Set<string>): string[] => {
        const result = [...base];
        catalogValues.forEach(v => {
            if (!result.includes(v)) result.push(v);
        });
        return result;
    };

    return {
        accessPortTypes: mergeWithBase(INTERFACE_TYPES, catalogAccessPortTypes),
        uplinkPortTypes: mergeWithBase(INTERFACE_TYPES, catalogUplinkPortTypes),
        poeCapabilities: mergeWithBase(POE_CAPABILITIES, catalogPoeCapabilities),
    };
}



/**
 * Exports detailed BOM items to a CSV file and triggers a browser download.
 * Maps SKU, Item Name, Type, Quantity, Site, Service, and Reasoning.
 */
export function exportBomToCsv(bomData: BOMLineItem[], projectName: string) {
    if (!bomData || bomData.length === 0) {
        console.warn("[bom-utils] No BOM data available to export.");
        return;
    }

    // Define CSV headers
    const headers = ["SKU", "Item Name", "Type", "Quantity", "Site Name", "Service", "Reasoning"];

    // Map data to rows, ensuring we handle quotes and commas for clean CSV
    const rows = bomData.map(item => [
        `"${item.itemId || ''}"`,
        `"${item.itemName || ''}"`,
        `"${item.itemType || ''}"`,
        item.quantity,
        `"${item.siteName || ''}"`,
        `"${item.serviceId || ''}"`,
        `"${(item.reasoning || '').replace(/"/g, '""')}"`
    ]);

    // Construct CSV content
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    // Trigger download in browser
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${projectName.replace(/\s+/g, '_')}_detailed_bom.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Build a pricing snapshot from catalog equipment data or independent Pricing Catalog.
 * Defaults discountPercent to 0 so netPrice equals listPrice.
 * 
 * Lookup Logic:
 * 1. If pricingSku is set on equipment, look it up in pricingCatalog.
 * 2. If not found, try looking up equipment ID in pricingCatalog.
 * 3. If still not found, fallback to legacy fields on the Equipment object itself.
 */
export function makePricingSnapshot(
    equip: Equipment,
    pricingCatalog?: PricingItem[]
): BOMLineItem['pricing'] | undefined {
    let purchase = 0;
    let rental = 0;
    let effectiveDate = "";

    // 1. Try Pricing Catalog Lookup
    if (pricingCatalog) {
        const lookupId = equip.pricingSku || equip.id;
        const pricingItem = pricingCatalog.find(p => p.id === lookupId);

        if (pricingItem) {
            purchase = pricingItem.listPrice || 0;
            rental = pricingItem.rentalPrice || 0;
            // Overrides from pricing item if available
            if (pricingItem.purchasePrice) purchase = pricingItem.purchasePrice;
            if (pricingItem.eosDate) effectiveDate = `EoS: ${pricingItem.eosDate}`;
        }
    }

    // 2. Return snapshot if match found
    if (!purchase && !rental) return undefined;

    return {
        purchasePrice: purchase,
        rentalPrice: rental,
        discountPercent: 0,
        netPrice: purchase,
        effectiveDate: effectiveDate || "Current",
    };
}

export function matchesConstraints(equipment: Equipment, constraints: { type: string; description?: string }[]): boolean {
    for (const constraint of constraints) {
        const type = (constraint.type || "").toLowerCase();
        if (type === "hardware") {
            const desc = (constraint.description || "").toLowerCase();
            if (desc.includes("rugged") && !equipment.description?.toLowerCase().includes("rugged")) return false;
            if (desc.includes("virtual") && !equipment.model.toLowerCase().includes("v")) return false;
        }
    }
    return true;
}

/**
 * Translates a JSON Logic condition object into a human-readable English string.
 * Used for admin displays and audit logs.
 */
export function formatLogicCondition(condition: unknown): string {
    if (!condition || typeof condition !== 'object' || Object.keys(condition).length === 0) return 'Always fires';

    const operators: Record<string, string> = {
        '==': 'is',
        '===': 'is',
        '!=': 'is not',
        '!==': 'is not',
        '>': 'is greater than',
        '<': 'is less than',
        '>=': 'is at least',
        '<=': 'is at most',
        'in': 'is in',
        'contains': 'contains',
    };

    const fieldLabels: Record<string, string> = {
        'serviceId': 'Service',
        'packageId': 'Package',
        'site.category': 'Site Category',
        'site.userCount': 'User Count',
        'site.bandwidthDownMbps': 'Download Speed',
        'site.bandwidthUpMbps': 'Upload Speed',
        'site.wanLinks': 'WAN Links',
        'site.redundancyModel': 'Redundancy',
        'site.lanPorts': 'LAN Ports',
        'site.poePorts': 'PoE Ports',
        'site.indoorAPs': 'Indoor APs',
        'site.outdoorAPs': 'Outdoor APs',
        'site.lanRequirements.poeCapabilities': 'PoE Capability',
        'site.lanRequirements.accessPortType': 'Access Port Type',
        'site.lanRequirements.uplinkPortType': 'Uplink Port Type',
        'site.lanRequirements.isStackable': 'Stackable Required',
        'site.lanRequirements.isRugged': 'Rugged / Industrial',
    };

    const formatVar = (v: unknown): string => {
        if (typeof v === 'object' && v !== null && 'var' in v) {
            const varName = (v as { var: string }).var;
            return fieldLabels[varName] || varName;
        }
        return JSON.stringify(v);
    };

    const walk = (node: unknown): string => {
        if (!node || typeof node !== 'object') return String(node);

        const op = Object.keys(node)[0];
        const args = (node as Record<string, unknown>)[op];

        if (op === 'and' && Array.isArray(args)) {
            return args.map(walk).join(' AND ');
        }
        if (op === 'or' && Array.isArray(args)) {
            return `(${args.map(walk).join(' OR ')})`;
        }

        if (operators[op] && Array.isArray(args) && args.length === 2) {
            const left = formatVar(args[0]);
            const right = formatVar(args[1]);
            return `${left} ${operators[op]} ${right}`;
        }

        return JSON.stringify(node);
    };

    try {
        return walk(condition);
    } catch {
        return 'Complex Logic';
    }
}
