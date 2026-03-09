/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonLogic from "json-logic-js";
import { Site, BOM, BOMLineItem, BOMEngineInput, Package, BOMLogicRule, SiteLANRequirements } from "./types";
import { Equipment } from "./types";
import { SiteType } from "./site-types";
import { SYSTEM_PARAMETERS } from "./types";
import {
    normalizeServiceId,
    SERVICE_TO_PURPOSE,
    getEquipmentPerformanceValue
} from "./bom-utils";
import {
    TriagedSite
} from "./types";

/**
 * Generates a Bill of Materials based on pure JSON input via a declarative Rules Engine.
 */

// Add custom logic operators
jsonLogic.add_operation("contains", (string, substring) => {
    if (typeof string !== "string") return false;
    return string.toLowerCase().includes(String(substring).toLowerCase());
});

jsonLogic.add_operation("includes", (array, value) => {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
});

jsonLogic.add_operation("max", (...args) => Math.max(...args));
jsonLogic.add_operation("min", (...args) => Math.min(...args));

/**
 * Evaluates the complexity of a site to determine the UX route using the JSON rules engine.
 * Also applies the Smart Defaults Engine: simple sites (userCount <= 15) receive
 * auto-filled LAN requirements; complex sites are flagged for manual SA review.
 */
export function evaluateSiteComplexity(
    site: Site,
    rules: BOMLogicRule[],
    selectedPackage: Package
): TriagedSite {
    const result: TriagedSite = {
        ...site,
        triageFlags: [],
    };

    // Evaluation context for triage rules
    const context = {
        site: site,
        packageId: selectedPackage.id
    };

    // Sort rules by priority descending
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
        if (jsonLogic.apply(rule.condition, context)) {
            const triageActions = rule.actions.filter(a => a.type === 'require_triage');
            if (triageActions.length > 0) {
                triageActions.forEach(action => {
                    result.triageFlags.push({
                        ruleName: rule.name,
                        reason: action.reason || 'Manual review required',
                        resolutionPaths: action.resolutionPaths || []
                    });
                });
            }
        }
    }

    // --- Smart Defaults Engine ---
    // Preserve any previously set SA overrides; only auto-fill when not already defined.
    if (!result.lanRequirements) {
        result.lanRequirements = applySmartLANDefaults(site);
    }

    return result;
}

/**
 * Applies safe LAN topology defaults for simple sites.
 * - Small branch (userCount <= 15): auto-fill 1G-Copper access, 10G-Fiber uplink, PoE+ capabilities.
 * - Complex site: flag for manual SA review via LANRequirementsEditor.
 */
function applySmartLANDefaults(site: Site): SiteLANRequirements {
    const needsPoe = (site.poePorts && site.poePorts > 0) || (site.indoorAPs && site.indoorAPs > 0) || (site.outdoorAPs && site.outdoorAPs > 0);
    return {
        accessPortType: '1G-Copper',
        uplinkPortType: '10G-Fiber',
        poeCapabilities: needsPoe ? 'PoE+' : 'None',
        isStackable: false,
        isRugged: false,
        needsManualReview: false,
    };
}

import { calculateWANBOM } from "./bom-modules/wan-logic";
import { calculateLANBOM } from "./bom-modules/lan-logic";
import { calculateWLANBOM } from "./bom-modules/wlan-logic";

export function calculateBOM(input: BOMEngineInput): BOM {
    const { projectId, sites, selectedPackage, services, siteTypes, equipmentCatalog, pricingCatalog, manualSelections = {}, globalParameters = {} } = input;

    // Sort rules by priority descending
    const rules = [...input.rules].sort((a, b) => b.priority - a.priority);

    const bomItems: BOMLineItem[] = [];

    for (const site of sites) {
        console.log(`[BOMEngine] Processing site: ${site.name}`, { siteTypeId: site.siteTypeId });
        let siteDef = siteTypes.find(t => t.id === site.siteTypeId);

        // Fallback to a generic site definition if not found or not provided
        if (!siteDef) {
            console.warn(`[BOMEngine] Site definition not found for ID: ${site.siteTypeId}. Using generic.`);
            siteDef = {
                id: "generic",
                name: "Generic Branch",
                category: "SD-WAN",
                description: "Generic fallback profile",
                constraints: [],
                defaults: {
                    redundancy: { cpe: "Single", circuit: "Single" },
                    slo: 99.9,
                    requiredServices: ["sdwan"]
                }
            } as SiteType;
        }

        // Initialize dynamic parameters for this site
        const siteParameters: Record<string, any> = {};
        for (const param of SYSTEM_PARAMETERS) {
            siteParameters[param.id] = globalParameters[param.id] !== undefined ? globalParameters[param.id] : param.defaultValue;
        }
        siteParameters.manualSelections = manualSelections; // Pass it down for manual overrides 

        // 1. Process Services in Package
        const sortedPackageItems = selectedPackage.items;

        const processedServices = new Set<string>();
        for (const pkgItem of sortedPackageItems) {
            const service = services.find(s => normalizeServiceId(s.id) === normalizeServiceId(pkgItem.service_id));
            if (!service) {
                console.warn(`[BOMEngine] Service definition not found for ID: ${pkgItem.service_id} (Site: ${site.name}). Skipping.`);
                continue;
            }

            const canonicalServiceId = normalizeServiceId(pkgItem.service_id);
            if (processedServices.has(canonicalServiceId)) {
                console.log(`[BOMEngine] Skipping duplicate service ${canonicalServiceId} in package for site ${site.name}`);
                continue;
            }
            processedServices.add(canonicalServiceId);

            // Attachment services produce a managed_service line item, not equipment
            if (service.is_attachment) {
                const tier = service.service_options?.find(o => o.id === pkgItem.service_option_id);
                bomItems.push({
                    id: `${site.name}_${canonicalServiceId}_${pkgItem.service_option_id || 'default'}`,
                    siteName: site.name,
                    serviceId: canonicalServiceId,
                    serviceName: service.name,
                    itemId: pkgItem.service_option_id || canonicalServiceId,
                    itemName: tier?.name || service.name,
                    itemType: "managed_service",
                    quantity: 1,
                    reasoning: `${service.name} — ${tier?.name || 'default tier'} for ${site.name}`,
                } as BOMLineItem);
                continue;
            }

            const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];

            const moduleInput = {
                projectId,
                site,
                siteDef,
                selectedPackage,
                service,
                canonicalServiceId,
                equipmentCatalog,
                pricingCatalog,
                rules,
                siteParameters,
                pkgItem
            };

            let items: BOMLineItem[] = [];
            if (requiredPurpose === "WAN") {
                items = calculateWANBOM(moduleInput);
            } else if (requiredPurpose === "LAN") {
                items = calculateLANBOM(moduleInput);
            } else if (requiredPurpose === "WLAN") {
                items = calculateWLANBOM(moduleInput);
            } else {
                console.warn(`[BOMEngine] Unsupported equipment purpose: ${requiredPurpose}`);
            }

            // Inject matching licenses for calculated hardware items
            const licenseItems: BOMLineItem[] = [];
            for (const item of items) {
                if (item.itemType === "equipment") {
                    const eq = equipmentCatalog.find(e => e.id === item.itemId);
                    if (eq && eq.licenses && eq.licenses.length > 0) {
                        const requiredTier = pkgItem.required_license_tier?.toLowerCase();

                        let matchedLicense = requiredTier
                            ? eq.licenses.find(l => l.tier.toLowerCase() === requiredTier)
                            : eq.licenses[0];

                        // Fallback to first license if requested tier doesn't exist on this hardware
                        if (requiredTier && !matchedLicense) {
                            console.warn(`[BOMEngine] Requested license tier '${requiredTier}' not found on equipment '${eq.model}'. Falling back to default.`);
                            matchedLicense = eq.licenses[0];
                        }

                        if (matchedLicense) {
                            licenseItems.push({
                                id: `${item.id}_license_${matchedLicense.id}`,
                                siteName: item.siteName,
                                serviceId: item.serviceId,
                                serviceName: item.serviceName,
                                itemId: matchedLicense.id, // Vendor Pricing SKU
                                itemName: `${eq.make ? eq.make + ' ' : ''}${eq.model} ${matchedLicense.tier.toUpperCase()} License (${matchedLicense.termLength})`,
                                itemType: "license",
                                quantity: item.quantity,
                                reasoning: `Associated license for ${eq.model} (Tier: ${matchedLicense.tier.toUpperCase()})`,
                            });
                        }
                    }
                }
            }
            items.push(...licenseItems);

            bomItems.push(...items);
        }
    }

    return {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
        projectId,
        createdAt: new Date().toISOString(),
        items: bomItems,
        summary: {
            siteCount: sites.length,
        }
    };
}

export function calculateUtilization(site: Site, equipment: Equipment, basis?: string, overhead: number = 0): number {
    const capacity = getEquipmentPerformanceValue(equipment, basis);

    if (!capacity) return 0;

    const siteLoad = (Number(site.bandwidthDownMbps) || 0) + (Number(site.bandwidthUpMbps) || 0) + (Number(overhead) || 0);
    return capacity > 0 ? Math.round((siteLoad / capacity) * 100) : 0;
}

export function validatePOE(site: Site, bomItems: BOMLineItem[], equipmentCatalog: Equipment[]): string[] {
    const warnings: string[] = [];
    let totalBudget = 0;

    for (const item of bomItems) {
        if (item.siteName !== site.name) continue;
        const equip = equipmentCatalog.find(e => e.id === item.itemId);
        if (equip?.role === 'LAN' && equip.specs.poeBudgetWatts) {
            totalBudget += (equip.specs.poeBudgetWatts * item.quantity);
        }
    }

    const estimatedLoad = (site.indoorAPs + site.outdoorAPs) * 15;

    if (estimatedLoad > totalBudget) {
        warnings.push(`POE Budget Deficiency: Requires ${estimatedLoad}W (APs: ${estimatedLoad}W), Available ${totalBudget}W.`);
    }

    return warnings;
}


export interface HardwareSKU {
    sku: string;
    quantity: number;
    reasoning?: string;
}
