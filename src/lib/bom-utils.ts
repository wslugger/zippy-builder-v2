/**
 * Shared BOM utility functions.
 * 
 * These pure functions contain business logic used by both the BOM engine
 * and the BOM builder UI. Keeping them in one place prevents logic drift.
 */

import { Package, Equipment, EQUIPMENT_PURPOSES } from "./types";
import { Site } from "./bom-types";
import { SiteType } from "./site-types";

// ============================================================
// Service ID Normalization
// ============================================================

/** Maps alternative/Firestore service IDs to canonical IDs used in rules */
const SERVICE_ID_ALIASES: Record<string, string> = {
    "sd_wan_service": "managed_sdwan",
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
 * Inspects the design_option_id and service_option_id for vendor keywords.
 */
export function resolveVendorForService(pkg: Package, serviceId: string): string {
    const pkgItem = pkg.items.find(i => i.service_id === serviceId);

    // Determine from option IDs first (design option or service option)
    const optionId = (pkgItem?.design_option_id || pkgItem?.service_option_id || "").toLowerCase();

    if (optionId.includes("meraki")) return "meraki";
    if (optionId.includes("cisco") || optionId.includes("catalyst")) return "cisco_catalyst";
    if (optionId.includes("fortinet")) return "fortinet";
    if (optionId.includes("palo_alto") || optionId.includes("paloalto")) return "palo_alto";

    // Fallback or default
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
    const throughputField = throughputBasis || "vpn_throughput_mbps";
    return (equip.specs[throughputField as keyof Equipment["specs"]] as number ?? equip.specs.vpn_throughput_mbps ?? 0) || equip.specs.ports || 0;
}
