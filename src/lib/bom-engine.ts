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
                        reasoning: `Manual Selection`
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

            const parameterActions = matchingRules.flatMap(r => r.actions).filter(a => a.type === "set_parameter");
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
                        reasoning: `Rule Match: ${matchingRules[0].name}${finalQuantity === 2 ? ' (Redundant)' : ''}`
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
                if (requiredPurpose && !e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number])) return false;

                if (!matchesConstraints(e, siteDef.constraints)) return false;

                if (requiredPurpose === "SDWAN") {
                    const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                    const deviceThroughput = e.specs[throughputField] ?? e.specs.vpn_throughput_mbps ?? 0;
                    if (deviceThroughput < requiredThroughput) return false;
                }

                if (requiredPurpose === "LAN") {
                    let requiredSpeed = site.accessPortSpeed;
                    const defaultSpeedParam = parameterActions.find(a => a.targetId === "defaultAccessSpeed")?.actionValue;
                    if (!requiredSpeed && defaultSpeedParam) {
                        requiredSpeed = String(defaultSpeedParam) as NonNullable<Site["accessPortSpeed"]>;
                    }

                    if (requiredSpeed && e.specs.access_speed && e.specs.access_speed !== requiredSpeed) {
                        if (requiredSpeed !== "1GbE" && !e.specs.access_speed?.includes(requiredSpeed.replace("GbE", "G"))) {
                            return false;
                        }
                    }

                    if (site.poeStandard && e.specs.poe_capabilities && !e.specs.poe_capabilities.includes(site.poeStandard)) {
                        return false;
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
                    return requiredPurpose && e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number]);
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
                        const requiredPorts = site.lanPorts || 48;
                        const switchPorts = bestFit.specs.ports || 48;
                        quantity = Math.ceil(requiredPorts / switchPorts);
                    }
                    if (quantity === 0) quantity = 1;
                }

                const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                const deviceThroughput = bestFit.specs[throughputField] || bestFit.specs.vpn_throughput_mbps || 0;

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
    const throughputField = (basis || "vpn_throughput_mbps") as keyof Equipment["specs"];
    const capacity = (equipment.specs[throughputField] as number) || 0;

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
        if (equip?.specs.poe_budget) {
            totalBudget += (equip.specs.poe_budget * item.quantity);
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
    if (e.purpose.includes("LAN")) {
        if (e.specs.ports) parts.push(`${e.specs.ports} Ports`);
        if (e.specs.poe_budget) parts.push(`${e.specs.poe_budget}W PoE`);
        if (e.specs.access_speed) parts.push(`${e.specs.access_speed} Access`);
    } else if (e.purpose.includes("SDWAN")) {
        const throughput = e.specs.vpn_throughput_mbps || 0;
        if (throughput) parts.push(`${throughput}M VPN`);
        if (e.specs.wan_interfaces_count) parts.push(`${e.specs.wan_interfaces_count} WAN`);
    }
    return parts.join(", ");
}
