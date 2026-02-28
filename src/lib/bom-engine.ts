/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonLogic from "json-logic-js";
import { Site, BOM, BOMLineItem, BOMEngineInput } from "./types";
import { Equipment } from "./types";
import { VENDOR_LABELS } from "./types";
import { SiteType } from "./site-types";
import { SYSTEM_PARAMETERS } from "./types";
import {
    normalizeServiceId,
    SERVICE_TO_PURPOSE,
    resolveVendorForService,
    calculateCPEQuantity,
    getEquipmentPerformanceValue,
    getEquipmentRole
} from "./bom-utils";
import {
    ExtractedSiteRequirements,
    TriageCriterion,
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

/**
 * Evaluates the complexity of a site to determine the UX route.
 */
export function evaluateSiteComplexity(site: ExtractedSiteRequirements, activeCriteria: TriageCriterion[]): TriagedSite {
    const defaultRoute: 'FAST_TRACK' | 'GUIDED_FLOW' = 'FAST_TRACK';
    const result: TriagedSite = {
        ...site,
        uxRoute: defaultRoute,
        triageReason: '',
    };

    if (site.estimatedUsers > 15) {
        result.uxRoute = 'GUIDED_FLOW';
        result.triageReason = 'User count exceeds standard branch limit';
        return result;
    }

    for (const criterion of activeCriteria) {
        if (criterion.forcesGuidedFlow) {
            const hasAttribute = site.dynamicAttributes && site.dynamicAttributes[criterion.id];

            // Evaluates to true if boolean true, string 'true', or non-zero positive numeric conditions.
            // Simplified here per instruction: "evaluates to true".
            if (hasAttribute === true || (typeof hasAttribute === 'string' && hasAttribute.toLowerCase() === 'true')) {
                result.uxRoute = 'GUIDED_FLOW';
                result.triageReason = `Requires custom handling for: ${criterion.label}`;
                return result;
            }
        }
    }

    result.triageReason = 'Standard site complexity';
    return result;
}

/**
 * Build a pricing snapshot from catalog equipment data.
 * Defaults discountPercent to 0 so netPrice equals listPrice.
 */
function makePricingSnapshot(equip: Equipment): BOMLineItem['pricing'] | undefined {
    const purchase = equip.pricing?.purchasePrice ?? equip.listPrice ?? equip.price ?? 0;
    const rental = equip.pricing?.rentalPrice ?? 0;

    if (!purchase && !rental) return undefined;

    return {
        listPrice: purchase, // Legacy fallback
        purchasePrice: purchase,
        rentalPrice: rental,
        discountPercent: 0,
        netPrice: purchase,
        effectiveDate: equip.pricingEffectiveDate,
    };
}

/**
 * PoE Standard hierarchy for comparison.
 * Higher number = more capable. A switch is compatible if its level >= the required level.
 */
const POE_HIERARCHY: Record<string, number> = {
    'none': 0,
    'poe': 1,
    'poe+': 2,
    'poe++': 3,
    'upoe': 3,
    'upoe+': 4
};

function poeLevel(standard: string): number {
    return POE_HIERARCHY[(standard || 'none').toLowerCase()] ?? 0;
}

/**
 * Normalizes port speed strings for comparison.
 * Handles variations: '1G' → '1g-copper', '10G-Copper' → '10g-copper', 'mGig' → 'mgig-copper'.
 * Returns lowercase canonical form for reliable matching.
 */
function normalizePortSpeed(speed: string): string {
    if (!speed) return '';
    const s = speed.toLowerCase().trim();
    // Already fully qualified (e.g., '1g-copper', '10g-fiber')
    if (s.includes('-')) return s;
    // Map common shorthand to canonical
    if (s === 'mgig' || s === 'multigig') return 'mgig-copper';
    // Pure speed values like '1g', '10g', '25g' — default to copper
    if (/^\d+g$/.test(s)) return `${s}-copper`;
    return s;
}

/**
 * Checks if equipment port type matches the required type.
 * Uses fuzzy matching to handle database inconsistencies.
 */
function portSpeedMatches(equipmentPortType: string, requiredPortType: string): boolean {
    // If no requirement specified, match everything
    if (!requiredPortType) return true;
    const normEquip = normalizePortSpeed(equipmentPortType);
    const normRequired = normalizePortSpeed(requiredPortType);
    // If equipment has no port type set, it should still match the default
    if (!normEquip) return true;
    return normEquip === normRequired;
}

export function calculateBOM(input: BOMEngineInput): BOM {
    const { projectId, sites, selectedPackage, services, siteTypes, equipmentCatalog, manualSelections = {}, globalParameters = {} } = input;

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
                    requiredServices: ["managed_sdwan"]
                }
            } as SiteType;
        }

        // Initialize dynamic parameters for this site
        const siteParameters: Record<string, any> = {};
        for (const param of SYSTEM_PARAMETERS) {
            siteParameters[param.id] = globalParameters[param.id] !== undefined ? globalParameters[param.id] : param.defaultValue;
        }

        // 1. Process Services in Package (Sorted to ensure dependencies like WLAN are processed before LAN)
        const sortedPackageItems = [...selectedPackage.items].sort((a, b) => {
            const order = ["managed_wifi", "managed_lan", "managed_sdwan"];
            const indexA = order.indexOf(normalizeServiceId(a.service_id));
            const indexB = order.indexOf(normalizeServiceId(b.service_id));
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        const processedServices = new Set<string>();
        for (const pkgItem of sortedPackageItems) {
            const service = services.find(s => s.id === pkgItem.service_id);
            if (!service) continue;

            const canonicalServiceId = normalizeServiceId(service.id);
            if (processedServices.has(canonicalServiceId)) {
                console.log(`[BOMEngine] Skipping duplicate service ${canonicalServiceId} in package for site ${site.name}`);
                continue;
            }
            processedServices.add(canonicalServiceId);

            const selectionKey = `${site.name}:${canonicalServiceId}`;
            const manualOverrideId = manualSelections[selectionKey];

            // TODO: Remove this guard once WLAN features and equipment catalog are built out.
            // Currently managed_wifi service exists in packages but WLAN equipment/logic is incomplete.
            if (canonicalServiceId === "managed_wifi") {
                continue;
            }

            // Guard: Skip LAN if site has no users, no APs, and no LAN ports
            if (canonicalServiceId === "managed_lan") {
                const totalEndpoints = (Number(site.userCount) || 0) + (Number(site.indoorAPs) || 0) + (Number(site.outdoorAPs) || 0) + (Number(site.lanPorts) || 0);
                if (totalEndpoints === 0 && !manualOverrideId) {
                    console.log(`[BOMEngine] Skipping managed_lan for ${site.name}: no endpoints configured`);
                    continue;
                }
            }

            // A. Evaluate Rules Engine for this service context
            const matchingRules = rules.filter(rule => {
                const throughputOverhead = siteParameters['throughput_overhead_mbps'] ?? selectedPackage.throughput_overhead_mbps ?? 0;
                const aggregateThroughput = (Number(site.bandwidthDownMbps) || 0) + (Number(site.bandwidthUpMbps) || 0) + (Number(throughputOverhead) || 0);

                const context = {
                    site: {
                        ...site,
                        bandwidthDownMbps: aggregateThroughput // Legacy rules expect this to be the aggregate
                    },
                    packageId: selectedPackage.id,
                    serviceId: canonicalServiceId
                };
                return jsonLogic.apply(rule.condition, context);
            });

            // B. Apply "set_parameter" actions to site context
            matchingRules.flatMap(r => r.actions)
                .filter(a => a.type === "set_parameter")
                .forEach(a => {
                    siteParameters[a.targetId] = a.actionValue;
                });

            if (manualOverrideId) {
                const equip = equipmentCatalog.find(e => e.id === manualOverrideId);
                if (equip) {
                    let quantity = 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        quantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                    }

                    console.log(`[BOMEngine] Manual override found: ${equip.model}`);
                    bomItems.push({
                        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                        siteName: site.name,
                        serviceId: canonicalServiceId,
                        serviceName: service.name,
                        itemId: equip.id,
                        itemName: `${(VENDOR_LABELS as Record<string, string>)[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                        itemType: "equipment",
                        quantity: quantity,
                        reasoning: `Manual Selection`,
                        matchedRules: [{ ruleId: 'manual', ruleName: 'Manual Override', description: 'User manually selected this equipment' }],
                        pricing: makePricingSnapshot(equip),
                    });
                    continue;
                }
            }

            // C. Calculate Required Throughput (with possible rule override)
            let throughputOverhead = siteParameters['throughput_overhead_mbps'] ?? 0;
            if (siteParameters['throughput_overhead_mbps'] === undefined) {
                throughputOverhead = selectedPackage.throughput_overhead_mbps || 0;
                if (pkgItem.design_option_id) {
                    const designOption = service.service_options
                        .flatMap(so => so.design_options)
                        .find(d => d.id === pkgItem.design_option_id);

                    if (designOption?.throughput_overhead_mbps) {
                        throughputOverhead += designOption.throughput_overhead_mbps;
                    }
                }
            }

            const requiredThroughput = (Number(site.bandwidthDownMbps) || 0) + (Number(site.bandwidthUpMbps) || 0) + (Number(throughputOverhead) || 0);



            // D. Check for explicit "select_equipment" action
            const equipmentAction = matchingRules.flatMap(r => r.actions).find(a => a.type === "select_equipment");

            if (equipmentAction) {
                const equip = equipmentCatalog.find(e => e.id === equipmentAction.targetId);
                if (equip) {
                    let finalQuantity = equipmentAction.quantity || 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        finalQuantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                    }

                    if (equipmentAction.quantityMultiplierField) {
                        const multiplier = site[equipmentAction.quantityMultiplierField as keyof Site] as number;
                        if (typeof multiplier === 'number') {
                            finalQuantity *= multiplier;
                        }
                    }

                    console.log(`[BOMEngine] Rule selected equip: ${equip.model}, qty: ${finalQuantity}`);
                    bomItems.push({
                        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                        siteName: site.name,
                        serviceId: canonicalServiceId,
                        serviceName: service.name,
                        itemId: equip.id,
                        itemName: `${(VENDOR_LABELS as Record<string, string>)[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                        itemType: "equipment",
                        quantity: finalQuantity,
                        reasoning: `Rule Match: ${matchingRules[0].name}${finalQuantity === 2 ? ' (Redundant)' : ''}`,
                        matchedRules: matchingRules.map(r => ({
                            ruleId: r.id,
                            ruleName: r.name,
                            description: `Condition: ${JSON.stringify(r.condition)}`
                        })),
                        pricing: makePricingSnapshot(equip),
                    });
                    continue;
                } else {
                    console.warn(`[BOMEngine] Rule target equipment not found in catalog: ${equipmentAction.targetId}`);
                }
            }

            // E. Dynamic Match Logic (Fallback if no explicit rule match)
            const vendorId = resolveVendorForService(selectedPackage, service.id);

            // Determine Throughput Metric based on Security Architecture
            let isDistributedSecurity = false;
            for (const item of selectedPackage.items) {
                if (item.design_option_id) {
                    const svc = services.find(s => s.id === item.service_id);
                    if (svc) {
                        const dOpt = svc.service_options.flatMap(so => so.design_options).find(d => d.id === item.design_option_id);
                        if (dOpt && dOpt.name && dOpt.name.toLowerCase().includes("distributed")) {
                            isDistributedSecurity = true;
                        }
                    }
                }
            }
            const defaultMetric = isDistributedSecurity ? "advancedSecurityThroughputMbps" : "sdwanCryptoThroughputMbps";
            const activeThroughputField = selectedPackage.throughput_basis || siteParameters['throughputBasis'] || defaultMetric;

            const candidates = equipmentCatalog.filter(e => {
                if (e.vendor_id !== vendorId) return false;

                const role = getEquipmentRole(e);
                const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                if (requiredPurpose) {
                    const roleMap: Record<string, string> = { "WAN": "WAN", "LAN": "LAN", "WLAN": "WLAN" };
                    if (role !== roleMap[requiredPurpose]) return false;
                }

                if (!matchesConstraints(e, siteDef.constraints)) return false;

                const specs = e.specs as any;
                if (requiredPurpose === "WAN" && role === 'WAN') {
                    const throughputField = activeThroughputField;
                    const deviceThroughput = Number(specs[throughputField] ?? 0);
                    if (deviceThroughput < requiredThroughput) return false;

                    const cpeQuantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                    const haLanPortMinimum = siteParameters['haLanPortMinimum'] ?? 1;
                    if (cpeQuantity > 1 && (specs.lanPortCount || 0) < haLanPortMinimum) {
                        return false;
                    }
                }

                if (requiredPurpose === "LAN" && role === 'LAN') {
                    // --- LAN Preferences (data-driven from UI dropdowns) ---
                    const lanPrefs = site.lanPreferences;

                    // Extract WLAN requirements from already processed items for this site
                    const wlanItem = bomItems.find(item => item.siteName === site.name && normalizeServiceId(item.serviceId) === 'managed_wifi');
                    let requiredAccessPortType = siteParameters['defaultAccessSpeed'] || '1G-Copper';
                    let totalRequiredPoEWatts = 0;
                    let requiredPoeStandard = 'None';

                    // LAN Preferences override defaults when set
                    if (lanPrefs?.accessPortSpeedId) {
                        requiredAccessPortType = lanPrefs.accessPortSpeedId;
                    } else if (wlanItem) {
                        const apEquip = equipmentCatalog.find(eq => eq.id === wlanItem.itemId);
                        if (apEquip && getEquipmentRole(apEquip) === 'WLAN') {
                            const apSpecs = apEquip.specs as any;
                            requiredAccessPortType = apSpecs.uplinkType || siteParameters['defaultAccessSpeed'] || '1G-Copper';
                            totalRequiredPoEWatts = (apSpecs.powerDrawWatts || 0) * ((site.indoorAPs || 0) + (site.outdoorAPs || 0));
                        }
                    }

                    if (lanPrefs?.poeRequirementId) {
                        requiredPoeStandard = lanPrefs.poeRequirementId;
                    }

                    console.log(`[BOMEngine:LAN] Evaluating ${e.model} (vendor=${e.vendor_id}, accessPortType=${specs.accessPortType} [normalized: ${normalizePortSpeed(specs.accessPortType || '')}], poeStandard=${specs.poeStandard}) against required: accessPortType=${requiredAccessPortType} [normalized: ${normalizePortSpeed(requiredAccessPortType)}], poeStandard=${requiredPoeStandard}`);

                    // 1. Media Type Match – equipment accessPortType must match required speed (fuzzy)
                    if (!portSpeedMatches(specs.accessPortType || '', requiredAccessPortType)) {
                        console.log(`[BOMEngine:LAN] REJECTED ${e.model}: accessPortType mismatch '${specs.accessPortType}' (norm: ${normalizePortSpeed(specs.accessPortType || '')}) !== '${requiredAccessPortType}' (norm: ${normalizePortSpeed(requiredAccessPortType)})`);
                        return false;
                    }

                    // 2. PoE Standard Match – equipment must meet or exceed the required PoE level
                    if (poeLevel(specs.poeStandard || 'None') < poeLevel(requiredPoeStandard)) {
                        console.log(`[BOMEngine:LAN] REJECTED ${e.model}: poeStandard '${specs.poeStandard}' (level ${poeLevel(specs.poeStandard || 'None')}) < required '${requiredPoeStandard}' (level ${poeLevel(requiredPoeStandard)})`);
                        return false;
                    }

                    const portUtilization = (siteParameters['maxPortUtilization'] || 100) / 100;
                    const portDensity = lanPrefs?.portDensity || 0;
                    const totalRequiredPorts = portDensity > 0
                        ? portDensity
                        : (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0);
                    const effectiveRequiredPorts = Math.ceil(totalRequiredPorts / portUtilization);

                    // 3. Capacity Check (Non-stackable must meet requirements alone)
                    if (!specs.isStackable) {
                        if ((specs.accessPortCount || 0) < effectiveRequiredPorts) {
                            console.log(`[BOMEngine:LAN] REJECTED ${e.model}: non-stackable capacity ${specs.accessPortCount} < ${effectiveRequiredPorts} required ports`);
                            return false;
                        }
                        if ((specs.poeBudgetWatts || 0) < totalRequiredPoEWatts) {
                            console.log(`[BOMEngine:LAN] REJECTED ${e.model}: poeBudget ${specs.poeBudgetWatts} < ${totalRequiredPoEWatts}W required`);
                            return false;
                        }
                    }

                    // 4. Stacking Limit Check (configurable max units per stack)
                    if (specs.isStackable) {
                        const maxStackSize = siteParameters['maxStackSize'] ?? 8;
                        const maxStackPorts = (specs.accessPortCount || 0) * maxStackSize;
                        const maxStackPoE = (specs.poeBudgetWatts || 0) * maxStackSize;
                        if (maxStackPorts < effectiveRequiredPorts) return false;
                        if (maxStackPoE < totalRequiredPoEWatts) return false;
                    }

                    console.log(`[BOMEngine:LAN] ACCEPTED ${e.model}`);
                }

                return true;
            });

            const sortedCandidates = candidates.sort((a, b) => {
                // For LAN, prioritize minimizing the number of units (prefer one 48p over two 24p)
                if (canonicalServiceId === "managed_lan") {
                    const getPotentialQty = (equip: Equipment) => {
                        const portUtilization = (siteParameters['maxPortUtilization'] || 100) / 100;
                        const totalRequiredPorts = (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0) || 48;
                        const specs = equip.specs as any;
                        const switchPorts = specs.accessPortCount || 48;
                        const effectiveSwitchPorts = Math.floor(switchPorts * portUtilization);
                        return Math.ceil(totalRequiredPorts / effectiveSwitchPorts);
                    };
                    const qtyA = getPotentialQty(a);
                    const qtyB = getPotentialQty(b);
                    if (qtyA !== qtyB) return qtyA - qtyB;
                }

                return getEquipmentPerformanceValue(a, activeThroughputField) - getEquipmentPerformanceValue(b, activeThroughputField);
            });

            let bestFit = sortedCandidates[0];
            let matchType = "Dynamic match";
            let alternatives: { itemId: string; itemName: string; reasoning?: string; specSummary?: string }[] = [];

            if (sortedCandidates.length > 1) {
                alternatives = sortedCandidates.slice(1, 6).map(e => ({
                    itemId: e.id,
                    itemName: `${(VENDOR_LABELS as Record<string, string>)[e.vendor_id] || e.vendor_id} ${e.model}`,
                    reasoning: `Alternative option.`,
                    specSummary: getEquipmentSpecSummary(e)
                }));
            }

            if (!bestFit) {
                const allPurposeCandidates = equipmentCatalog.filter(e => {
                    if (e.vendor_id !== vendorId) return false;
                    const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                    if (!requiredPurpose) return true;
                    const candidatePurposes = [e.primary_purpose, ...(e.additional_purposes || [])];
                    return candidatePurposes.includes(requiredPurpose as any);
                });

                const sortedFallbackCandidates = allPurposeCandidates.sort((a, b) => {
                    return getEquipmentPerformanceValue(b, activeThroughputField) - getEquipmentPerformanceValue(a, activeThroughputField);
                });

                bestFit = sortedFallbackCandidates[0];

                if (bestFit) {
                    matchType = "Fallback (Best available effort)";
                    if (sortedFallbackCandidates.length > 1) {
                        alternatives = sortedFallbackCandidates.slice(1, 6).map(e => ({
                            itemId: e.id,
                            itemName: `${(VENDOR_LABELS as Record<string, string>)[e.vendor_id] || e.vendor_id} ${e.model}`,
                            reasoning: `Fallback alternative.`,
                            specSummary: getEquipmentSpecSummary(e)
                        }));
                    }
                }
            }

            if (bestFit) {
                let quantity = 1;
                if (canonicalServiceId === "managed_sdwan") {
                    quantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                } else if (canonicalServiceId === "managed_lan") {
                    const quantityAction = matchingRules.flatMap(r => r.actions).find(a => a.type === "modify_quantity");

                    if (quantityAction) {
                        if (quantityAction.quantity) {
                            quantity = quantityAction.quantity;
                        } else if (quantityAction.quantityMultiplierField) {
                            const multiplier = site[quantityAction.quantityMultiplierField as keyof Site] as number;
                            if (typeof multiplier === 'number') {
                                if (quantityAction.actionValue) {
                                    quantity = Math.ceil(multiplier / Number(quantityAction.actionValue));
                                } else {
                                    quantity = Math.ceil(multiplier);
                                }
                            }
                        }
                    } else {
                        // LAN Sizing Math: Max(Port-Count Sizing, PoE Budget Sizing)
                        const portUtilization = (siteParameters['maxPortUtilization'] || 100) / 100;
                        const totalRequiredPorts = (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0) || 48;
                        const wlanItem = bomItems.find(item => item.siteName === site.name && normalizeServiceId(item.serviceId) === 'managed_wifi');
                        let totalRequiredPoEWatts = 0;
                        if (wlanItem) {
                            const apEquip = equipmentCatalog.find(eq => eq.id === wlanItem.itemId);
                            if (apEquip && getEquipmentRole(apEquip) === 'WLAN') {
                                totalRequiredPoEWatts = ((apEquip.specs as any).powerDrawWatts || 0) * ((site.indoorAPs || 0) + (site.outdoorAPs || 0));
                            }
                        }

                        const switchSpecs = bestFit.specs as any;
                        const switchPorts = bestFit.role === 'LAN' ? (switchSpecs.accessPortCount || 48) : 48;
                        const switchPoE = bestFit.role === 'LAN' ? (switchSpecs.poeBudgetWatts || 0) : 0;

                        // Effective switch capacity based on utilization factor
                        const effectiveSwitchPorts = Math.floor(switchPorts * portUtilization);

                        const qtyByPorts = Math.ceil(totalRequiredPorts / effectiveSwitchPorts);
                        const qtyByPoE = (switchPoE > 0 && totalRequiredPoEWatts > 0) ? Math.ceil(totalRequiredPoEWatts / switchPoE) : 1;

                        quantity = Math.max(qtyByPorts, qtyByPoE);
                    }
                    if (quantity === 0) quantity = 1;
                }

                const throughputField = activeThroughputField;
                const deviceThroughput = getEquipmentPerformanceValue(bestFit, throughputField);

                let reasoning: string;
                if (canonicalServiceId === 'managed_lan' && bestFit.role === 'LAN') {
                    // LAN-specific reasoning based on catalog specs
                    const lanSpecs = bestFit.specs as any;
                    const specParts: string[] = [];
                    if (lanSpecs.accessPortType) specParts.push(`Access: ${lanSpecs.accessPortType}`);
                    if (lanSpecs.poeStandard && lanSpecs.poeStandard !== 'None') specParts.push(`PoE: ${lanSpecs.poeStandard} (${lanSpecs.poeBudgetWatts || 0}W)`);
                    if (lanSpecs.poeStandard === 'None' || !lanSpecs.poeStandard) specParts.push('PoE: None');
                    if (lanSpecs.accessPortCount) specParts.push(`${lanSpecs.accessPortCount} Ports`);
                    if (lanSpecs.uplinkPortType) specParts.push(`Uplink: ${lanSpecs.uplinkPortCount || 0}x ${lanSpecs.uplinkPortType}`);
                    if (lanSpecs.isStackable) specParts.push('Stackable');
                    reasoning = `${matchType}: ${specParts.join(', ')}.`;

                    // Add Transceiver note for Fiber uplinks
                    if (siteParameters['fiberTransceiverNote'] !== false && lanSpecs.uplinkPortType?.toLowerCase().includes('fiber')) {
                        reasoning += ` NOTE: Requires ${lanSpecs.uplinkPortCount || 0}x Fiber Transceivers for uplinks.`;
                    }
                } else {
                    // WAN/other reasoning (throughput-based)
                    reasoning = `${matchType}: Vendor=${vendorId}, ${throughputField.replace(/_/g, ' ').toUpperCase()}=${deviceThroughput} Mbps. ${deviceThroughput < requiredThroughput ? 'Warning: Load exceeds capacity.' : ''}`;
                }

                bomItems.push({
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                    siteName: site.name,
                    serviceId: canonicalServiceId,
                    serviceName: service.name,
                    itemId: bestFit.id,
                    itemName: `${(VENDOR_LABELS as Record<string, string>)[bestFit.vendor_id] || bestFit.vendor_id} ${bestFit.model}`,
                    itemType: "equipment",
                    quantity: quantity,
                    reasoning: reasoning,
                    matchedRules: matchingRules.length > 0 ? matchingRules.map(r => ({
                        ruleId: r.id,
                        ruleName: r.name,
                        description: `Condition: ${JSON.stringify(r.condition)}`
                    })) : [
                        {
                            ruleId: 'dynamic_match',
                            ruleName: matchType,
                            description: `Selected based on Vendor (${vendorId}) and Throughput (${deviceThroughput} Mbps >= ${Math.round(requiredThroughput)} Mbps required).`
                        }
                    ],
                    alternatives: alternatives.length > 0 ? alternatives : undefined,
                    pricing: makePricingSnapshot(bestFit),
                });
            }
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

function matchesConstraints(equipment: Equipment, constraints: { type: string; description?: string }[]): boolean {
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

function getEquipmentSpecSummary(e: Equipment): string {
    const parts: string[] = [];
    if (e.role === 'LAN') {
        const totalPorts = e.specs.accessPortCount || 0;
        if (totalPorts) parts.push(`${totalPorts} Ports`);
        if (e.specs.poeBudgetWatts) parts.push(`${e.specs.poeBudgetWatts}W PoE`);
    } else if (e.role === 'WAN') {
        const specs = e.specs as any;
        const throughput = specs.sdwanCryptoThroughputMbps || 0;
        if (throughput) parts.push(`${throughput}M VPN`);
        if (specs.wanPortCount) parts.push(`${specs.wanPortCount} WAN`);
    }
    return parts.join(", ");
}

export interface HardwareSKU {
    sku: string;
    quantity: number;
    reasoning?: string;
}
