/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonLogic from "json-logic-js";
import { Site, BOM, BOMLineItem, BOMEngineInput, Package, BOMLogicRule, SiteLANRequirements } from "./types";
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
        uxRoute: 'FAST_TRACK',
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
                result.uxRoute = 'GUIDED_FLOW';
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
 * - Complex site: flag for manual SA review via GuidedLANReview.
 */
function applySmartLANDefaults(site: Site): SiteLANRequirements {
    const isSmallBranch = (site.userCount || 0) <= 15;

    if (isSmallBranch) {
        return {
            accessPortType: '1G-Copper',
            uplinkPortType: '10G-Fiber',
            poeCapabilities: 'PoE+',
            isStackable: false,
            isRugged: false,
            needsManualReview: false,
        };
    }

    // Complex site — leave topology fields undefined; SA must review via GuidedLANReview
    return {
        needsManualReview: true,
    };
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

        // 1. Process Services in Package
        const sortedPackageItems = selectedPackage.items;

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
            const manualOverrideRaw = manualSelections[selectionKey];

            // Normalize manualOverrideRaw into an array of selections [{ itemId, quantity }]
            let selections: Array<{ itemId: string; quantity?: number }> = [];

            if (Array.isArray(manualOverrideRaw)) {
                selections = manualOverrideRaw.map(s => (typeof s === 'string' ? { itemId: s } : s));
            } else if (typeof manualOverrideRaw === 'string') {
                selections = [{ itemId: manualOverrideRaw }];
            } else if (manualOverrideRaw && typeof manualOverrideRaw === 'object') {
                const overrideObj = manualOverrideRaw as any;
                selections = [{ itemId: overrideObj.itemId, quantity: overrideObj.quantity }];
            }


            if (canonicalServiceId === "managed_lan" && selections.length === 0 && site.lanRequirements?.needsManualReview === true) {
                // Site is flagged for manual LAN review — skip auto-selection until the SA resolves it
                continue;
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
                    const throughputOverhead = siteParameters['throughput_overhead_mbps'] ?? selectedPackage.throughput_overhead_mbps ?? 0;
                    const aggregateThroughput = (Number(site.bandwidthDownMbps) || 0) + (Number(site.bandwidthUpMbps) || 0) + (Number(throughputOverhead) || 0);

                    const context = {
                        site: {
                            ...site,
                            bandwidthDownMbps: aggregateThroughput
                        },
                        packageId: selectedPackage.id,
                        serviceId: canonicalServiceId
                    };

                    const val = (a.actionValue && typeof a.actionValue === 'object')
                        ? jsonLogic.apply(a.actionValue as any, context)
                        : a.actionValue;

                    siteParameters[a.targetId] = val;
                });

            if (selections.length > 0) {
                let processedAny = false;
                for (const selection of selections) {
                    const equip = equipmentCatalog.find(e => e.id === selection.itemId);
                    if (equip) {
                        let quantity = selection.quantity ?? 1;
                        if (canonicalServiceId === "managed_sdwan" && !selection.quantity) {
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
                        processedAny = true;
                    }
                }
                if (processedAny) continue;
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
                    const minPorts = siteParameters['minAccessPorts'] || site.lanPorts || 0;
                    const minPoe = siteParameters['required_poe_watts'] || 0;
                    const specs = e.specs as any;

                    // Filter out switches that don't meet port density or PoE budget
                    if ((specs.accessPortCount || 0) < minPorts) return false;
                    if ((specs.poeBudgetWatts || 0) < minPoe) return false;

                    // Strict matching against SiteLANRequirements (data-driven, from catalog taxonomy)
                    const req = site.lanRequirements;
                    if (req && !req.needsManualReview) {
                        if (req.accessPortType && specs.accessPortType !== req.accessPortType) return false;
                        if (req.uplinkPortType && specs.uplinkPortType !== req.uplinkPortType) return false;
                        if (req.poeCapabilities && req.poeCapabilities !== 'None') {
                            // Require PoE capability to be present if non-None is requested
                            if (!specs.poe_capabilities || specs.poe_capabilities === 'None') return false;
                        }
                        if (req.totalPoeBudgetWatts && (specs.poeBudgetWatts || 0) < req.totalPoeBudgetWatts) return false;
                        if (req.isStackable === true && !specs.isStackable) return false;
                    }
                }



                return true;
            });

            const sortedCandidates = candidates.sort((a, b) => {
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
                }

                const throughputField = activeThroughputField;
                const deviceThroughput = getEquipmentPerformanceValue(bestFit, throughputField);

                let reasoning: string;
                if (canonicalServiceId === 'managed_lan' && bestFit.role === 'LAN') {
                    // LAN-specific reasoning based on catalog specs
                    const lanSpecs = bestFit.specs as any;
                    const specParts: string[] = [];
                    if (lanSpecs.accessPortType) specParts.push(`Access: ${lanSpecs.accessPortType}`);
                    if (lanSpecs.poe_capabilities && lanSpecs.poe_capabilities !== 'None') specParts.push(`PoE: ${lanSpecs.poe_capabilities} (${lanSpecs.poeBudgetWatts || 0}W)`);
                    if (lanSpecs.poe_capabilities === 'None' || !lanSpecs.poe_capabilities) specParts.push('PoE: None');
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
