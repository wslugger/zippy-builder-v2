/**
 * Shared BOM utility functions.
 * 
 * These pure functions contain business logic used by both the BOM engine
 * and the BOM builder UI. Keeping them in one place prevents logic drift.
 */

import { Package, Equipment, EQUIPMENT_PURPOSES } from "./types";
import { Site } from "./bom-types";
import { SiteType } from "./site-types";

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
    "sd_wan_service": "managed_sdwan",  // Legacy alias from early prototype
    "managed_sdwan": "managed_sdwan",
    "managed_lan": "managed_lan",
    "managed_wifi": "managed_wifi",
};

export function normalizeServiceId(id: string): string {
    return SERVICE_ID_ALIASES[id] || id;
}

// ============================================================
// Purpose Mapping
// ============================================================

/** Maps canonical service IDs to the equipment purpose categories */
export const SERVICE_TO_PURPOSE: Record<string, (typeof EQUIPMENT_PURPOSES)[number]> = {
    "managed_sdwan": "SDWAN",
    "managed_lan": "LAN",
    "managed_wifi": "WLAN",
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
    const pkgItem = pkg.items.find(i => i.service_id === serviceId);

    // 1. Try explicit vendor_id from design option data
    if (pkgItem?.design_option_id && services) {
        const service = services.find(s => s.id === serviceId);
        const designOption = service?.service_options
            .flatMap(so => so.design_options)
            .find(d => d.id === pkgItem.design_option_id);
        if (designOption?.vendor_id) return designOption.vendor_id;
    }

    // 2. Try explicit vendor_id from service option data
    if (pkgItem?.service_option_id && services) {
        const service = services.find(s => s.id === serviceId);
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

    // 1. If SiteType is NOT generic, it should be the primary source of truth
    if (siteDef.id !== "generic" && profileRedundancy) {
        if (isDualRedundancy(profileRedundancy)) return 2;
        if (profileRedundancy.includes("single")) return 1;
    }

    // 2. Explicit Site-level override (e.g. from CSV)
    if (isDualRedundancy(siteModel)) return 2;
    if (siteModel.includes("single")) return 1;

    // 3. Last fallback: Check if profile has anything at all
    if (isDualRedundancy(profileRedundancy)) return 2;

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
 * Sort key for equipment by performance (throughput or ports).
 * Used in both primary candidate ranking and fallback selection.
 */
export function getEquipmentPerformanceValue(equip: Equipment, throughputBasis?: string): number {
    if (equip.role === 'WAN') {
        const throughputField = throughputBasis || "vpn_throughput_mbps";
        return (equip.specs[throughputField as keyof typeof equip.specs] as number) ?? equip.specs.vpn_throughput_mbps ?? 0;
    } else if (equip.role === 'LAN') {
        return equip.specs.switching_capacity_gbps ??
            (equip.specs.accessPortCount || 0);
    } else if (equip.role === 'WLAN') {
        return equip.specs.max_concurrent_clients ?? 0;
    }
    return 0;
}
