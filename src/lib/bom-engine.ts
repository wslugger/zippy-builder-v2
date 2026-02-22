/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonLogic from "json-logic-js";
import { Site, BOM, BOMLineItem, BOMEngineInput } from "./types";
import { Equipment, EQUIPMENT_PURPOSES } from "./types";
import { VENDOR_LABELS } from "./types";
import { SiteType } from "./site-types";
import {
    normalizeServiceId,
    SERVICE_TO_PURPOSE,
    resolveVendorForService,
    calculateCPEQuantity,
    getEquipmentPerformanceValue,
    getEquipmentRole
} from "./bom-utils";

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

export function calculateBOM(input: BOMEngineInput): BOM {
    const { projectId, sites, selectedPackage, services, siteTypes, equipmentCatalog, manualSelections = {} } = input;

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

        // 1. Process Services in Package
        for (const pkgItem of selectedPackage.items) {
            const service = services.find(s => s.id === pkgItem.service_id);
            if (!service) continue;

            const canonicalServiceId = normalizeServiceId(service.id);
            const selectionKey = `${site.name}:${canonicalServiceId}`;
            const manualOverrideId = manualSelections[selectionKey];

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
                        itemName: `${VENDOR_LABELS[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                        itemType: "equipment",
                        quantity: quantity,
                        reasoning: `Manual Selection`,
                        matchedRules: [{ ruleId: 'manual', ruleName: 'Manual Override', description: 'User manually selected this equipment' }]
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

            // Create evaluation context for equipment selection (with adjusted throughput)
            const ruleEvaluationSite = {
                ...site,
                bandwidthDownMbps: requiredThroughput
            };

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
                        itemName: `${VENDOR_LABELS[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                        itemType: "equipment",
                        quantity: finalQuantity,
                        reasoning: `Rule Match: ${matchingRules[0].name}${finalQuantity === 2 ? ' (Redundant)' : ''}`,
                        matchedRules: matchingRules.map(r => ({
                            ruleId: r.id,
                            ruleName: r.name,
                            description: `Condition: ${JSON.stringify(r.condition)}`
                        }))
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
            const activeThroughputField = selectedPackage.throughput_basis || (isDistributedSecurity ? "advancedSecurityThroughputMbps" : "sdwanCryptoThroughputMbps");

            const candidates = equipmentCatalog.filter(e => {
                if (e.vendor_id !== vendorId) return false;

                const role = getEquipmentRole(e);
                const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                if (requiredPurpose) {
                    const roleMap: Record<string, string> = { "SDWAN": "WAN", "LAN": "LAN", "WLAN": "WLAN" };
                    if (role !== roleMap[requiredPurpose]) return false;
                }

                if (!matchesConstraints(e, siteDef.constraints)) return false;

                const specs = e.specs as any;
                if (requiredPurpose === "SDWAN" && role === 'WAN') {
                    const throughputField = activeThroughputField;
                    const deviceThroughput = Number(specs[throughputField] ?? 0);
                    if (deviceThroughput < requiredThroughput) return false;

                    const cpeQuantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                    if (cpeQuantity > 1 && (specs.lanPortCount || 0) < 1) {
                        return false;
                    }
                }

                if (requiredPurpose === "LAN" && role === 'LAN') {
                    if (site.poeStandard && (specs.poeStandard === 'None' || !specs.poeBudgetWatts)) {
                        return false;
                    }

                    const totalRequiredPorts = (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0);
                    const maxPorts = specs.isStackable ? (specs.accessPortCount || 0) * 8 : (specs.accessPortCount || 0);
                    if (maxPorts < totalRequiredPorts) {
                        return false;
                    }

                    const wlanItem = bomItems.find(item => item.siteName === site.name && item.serviceId === 'managed_wlan');
                    if (wlanItem) {
                        const apEquip = equipmentCatalog.find(eq => eq.id === wlanItem.itemId);
                        if (apEquip && getEquipmentRole(apEquip) === 'WLAN' && (apEquip.specs as any).uplinkType === 'mGig-Copper') {
                            if (specs.accessPortType !== 'mGig-Copper') return false;
                        }
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
                    itemName: `${VENDOR_LABELS[e.vendor_id] || e.vendor_id} ${e.model}`,
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
                            itemName: `${VENDOR_LABELS[e.vendor_id] || e.vendor_id} ${e.model}`,
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
                        const requiredPorts = site.lanPorts || (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0) || 48;
                        const switchPorts = bestFit.role === 'LAN' ? (bestFit.specs.accessPortCount || 48) : 48;
                        quantity = Math.ceil(requiredPorts / switchPorts);
                    }
                    if (quantity === 0) quantity = 1;
                }

                const throughputField = activeThroughputField;
                const deviceThroughput = getEquipmentPerformanceValue(bestFit, throughputField);

                bomItems.push({
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                    siteName: site.name,
                    serviceId: service.id,
                    serviceName: service.name,
                    itemId: bestFit.id,
                    itemName: `${VENDOR_LABELS[bestFit.vendor_id] || bestFit.vendor_id} ${bestFit.model}`,
                    itemType: "equipment",
                    quantity: quantity,
                    reasoning: `${matchType}: Vendor=${vendorId}, ${throughputField.replace(/_/g, ' ').toUpperCase()}=${deviceThroughput} Mbps. ${deviceThroughput < requiredThroughput ? 'Warning: Load exceeds capacity.' : ''}`,
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
                    alternatives: alternatives.length > 0 ? alternatives : undefined
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
