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
    getEquipmentPerformanceValue
} from "./bom-utils";

/**
 * Generates a Bill of Materials based on pure JSON input via a declarative Rules Engine.
 */
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

        // 1. Process Services in Package
        for (const pkgItem of selectedPackage.items) {
            const service = services.find(s => s.id === pkgItem.service_id);
            if (!service) continue;

            const canonicalServiceId = normalizeServiceId(service.id);
            const selectionKey = `${site.name}:${canonicalServiceId}`;
            const manualOverrideId = manualSelections[selectionKey];

            if (manualOverrideId) {
                const equip = equipmentCatalog.find(e => e.id === manualOverrideId);
                if (equip) {
                    let quantity = 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        quantity = calculateCPEQuantity(site, siteDef);
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

            let throughputOverhead = selectedPackage.throughput_overhead_mbps || 0;
            if (pkgItem.design_option_id) {
                const designOption = service.service_options
                    .flatMap(so => so.design_options)
                    .find(d => d.id === pkgItem.design_option_id);

                if (designOption?.throughput_overhead_mbps) {
                    throughputOverhead += designOption.throughput_overhead_mbps;
                }
            }

            const requiredThroughput = (Number(site.bandwidthDownMbps) || 0) + (Number(site.bandwidthUpMbps) || 0) + throughputOverhead;

            const ruleEvaluationSite = {
                ...site,
                bandwidthDownMbps: requiredThroughput
            };

            // Evaluate Rules Engine
            const matchingRules = rules.filter(rule => {
                const context = {
                    site: ruleEvaluationSite,
                    packageId: selectedPackage.id,
                    serviceId: canonicalServiceId
                };
                return jsonLogic.apply(rule.condition, context);
            });


            const equipmentAction = matchingRules.flatMap(r => r.actions).find(a => a.type === "select_equipment");

            if (equipmentAction) {
                const equip = equipmentCatalog.find(e => e.id === equipmentAction.targetId);
                if (equip) {
                    let finalQuantity = equipmentAction.quantity || 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        finalQuantity = calculateCPEQuantity(site, siteDef);
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

            const vendorId = resolveVendorForService(selectedPackage, service.id);

            const candidates = equipmentCatalog.filter(e => {
                if (e.vendor_id !== vendorId) return false;

                const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                if (requiredPurpose) {
                    const candidatePurposes = [e.primary_purpose, ...(e.additional_purposes || [])];
                    if (!candidatePurposes.includes(requiredPurpose as any)) return false;
                }

                if (!matchesConstraints(e, siteDef.constraints)) return false;

                if (requiredPurpose === "SDWAN" && e.role === 'WAN') {
                    const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                    const deviceThroughput = (e.specs[throughputField as keyof typeof e.specs] as number) ?? e.specs.vpn_throughput_mbps ?? 0;
                    if (deviceThroughput < requiredThroughput) return false;

                    const cpeQuantity = calculateCPEQuantity(site, siteDef);
                    if (cpeQuantity > 1 && (e.specs.lanPortCount || 0) < 1) {
                        return false;
                    }
                }

                if (requiredPurpose === "LAN" && e.role === 'LAN') {
                    if (site.poeStandard && e.specs.poe_budget_watts && e.specs.poe_budget_watts === 0) {
                        return false;
                    }

                    const totalRequiredPorts = (site.userCount || 0) + (site.indoorAPs || 0) + (site.outdoorAPs || 0);
                    const maxPorts = e.specs.stackable ? (e.specs.accessPortCount || 0) * 8 : (e.specs.accessPortCount || 0);
                    if (maxPorts < totalRequiredPorts) {
                        return false;
                    }

                    const wlanItem = bomItems.find(item => item.siteName === site.name && item.serviceId === 'managed_wlan');
                    if (wlanItem) {
                        const apEquip = equipmentCatalog.find(eq => eq.id === wlanItem.itemId);
                        if (apEquip && apEquip.role === 'WLAN' && apEquip.specs.uplinkPortType === 'mGig') {
                            if (e.specs.accessPortType !== 'mGig') return false;
                        }
                    }
                }

                return true;
            });

            const sortedCandidates = candidates.sort((a, b) => {
                return getEquipmentPerformanceValue(a, selectedPackage.throughput_basis) - getEquipmentPerformanceValue(b, selectedPackage.throughput_basis);
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
                    return getEquipmentPerformanceValue(b, selectedPackage.throughput_basis) - getEquipmentPerformanceValue(a, selectedPackage.throughput_basis);
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
                    quantity = calculateCPEQuantity(site, siteDef);
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

                const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
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

    const siteLoad = (site.bandwidthDownMbps || 0) + (site.bandwidthUpMbps || 0) + overhead;
    return Math.round((siteLoad / capacity) * 100);
}

export function validatePOE(site: Site, bomItems: BOMLineItem[], equipmentCatalog: Equipment[]): string[] {
    const warnings: string[] = [];
    let totalBudget = 0;

    for (const item of bomItems) {
        if (item.siteName !== site.name) continue;
        const equip = equipmentCatalog.find(e => e.id === item.itemId);
        if (equip?.role === 'LAN' && equip.specs.poe_budget_watts) {
            totalBudget += (equip.specs.poe_budget_watts * item.quantity);
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
        if (e.specs.poe_budget_watts) parts.push(`${e.specs.poe_budget_watts}W PoE`);
    } else if (e.role === 'WAN') {
        const throughput = e.specs.vpn_throughput_mbps || 0;
        if (throughput) parts.push(`${throughput}M VPN`);
        if (e.specs.wanPortCount) parts.push(`${e.specs.wanPortCount} WAN`);
    }
    return parts.join(", ");
}
