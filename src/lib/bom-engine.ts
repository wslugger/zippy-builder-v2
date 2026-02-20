import { Site, BOMLogicRule, BOM, BOMLineItem, LogicCondition } from "./bom-types";
import { Package, Equipment, Service, EQUIPMENT_PURPOSES } from "./types";
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
 * Generates a Bill of Materials based on Sites, Package configuration, and Rules.
 */

export class BOMEngine {
    private rules: BOMLogicRule[];
    private equipmentCatalog: Equipment[];

    constructor(rules: BOMLogicRule[], equipmentCatalog: Equipment[]) {
        this.rules = rules.sort((a, b) => b.priority - a.priority); // High priority first
        this.equipmentCatalog = equipmentCatalog;
    }

    public generateBOM(projectId: string, sites: Site[], selectedPackage: Package, services: Service[], siteTypes: SiteType[], manualSelections: Record<string, string> = {}): BOM {
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

                // Normalize the service ID so rules work with both Firestore and seed IDs
                const canonicalServiceId = normalizeServiceId(service.id);

                // --- 0. CHECK MANUAL SELECTION ---
                const selectionKey = `${site.name}:${canonicalServiceId}`;
                const manualOverrideId = manualSelections[selectionKey];

                if (manualOverrideId) {
                    const equip = this.equipmentCatalog.find(e => e.id === manualOverrideId);
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

                // --- 0.5 CALCULATE THROUGHPUT REQUIREMENT ---
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

                // --- 1. TRY RULES ENGINE FIRST ---
                const matchingRules = this.findMatchingRules(ruleEvaluationSite, selectedPackage.id, canonicalServiceId);

                const equipmentAction = matchingRules
                    .flatMap(r => r.actions)
                    .find(a => a.type === "select_equipment");

                if (equipmentAction) {
                    const equip = this.equipmentCatalog.find(e => e.id === equipmentAction.targetId);
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
                        continue; // Skip fallback
                    } else {
                        console.warn(`[BOMEngine] Rule target equipment not found in catalog: ${equipmentAction.targetId}`);
                    }
                }

                // --- 2. FALLBACK TO DIRECT MATCHING ---
                const vendorId = resolveVendorForService(selectedPackage, service.id);

                const candidates = this.equipmentCatalog.filter(e => {
                    if (e.vendor_id !== vendorId) return false;

                    const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                    if (requiredPurpose && !e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number])) return false;

                    if (!this.matchesConstraints(e, siteDef.constraints)) return false;

                    if (requiredPurpose === "SDWAN") {
                        const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                        const deviceThroughput = e.specs[throughputField] ?? e.specs.vpn_throughput_mbps ?? 0;
                        if (deviceThroughput < requiredThroughput) return false;
                    }

                    if (requiredPurpose === "LAN") {
                        // For LAN, we don't filter out smaller switches, we just buy more of them.
                        // But we DO filter by speed and poe constraints if the Site defines them.
                        if (site.accessPortSpeed && e.specs.access_speed && e.specs.access_speed !== site.accessPortSpeed) {
                            // In a real comparison we might check if e.specs.access_speed >= site.accessPortSpeed. 
                            // For simplicity, we string match or handle "10GbE" > "1GbE" logic if possible.
                            // If e didn't define it, we assume it's basic 1GbE.
                            if (site.accessPortSpeed !== "1GbE" && !e.specs.access_speed?.includes(site.accessPortSpeed.replace("GbE", "G"))) {
                                return false; // Basic strict filter for higher speeds
                            }
                        }

                        // PoE validation
                        if (site.poeStandard && e.specs.poe_capabilities && !e.specs.poe_capabilities.includes(site.poeStandard)) {
                            // If Site wants PoE+ but switch only has PoE, filter it out.
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

                let alternatives: { itemId: string; itemName: string; reasoning?: string }[] = [];
                if (sortedCandidates.length > 1) {
                    // grab up to 5 additional candidates
                    alternatives = sortedCandidates.slice(1, 6).map(e => ({
                        itemId: e.id,
                        itemName: `${VENDOR_LABELS[e.vendor_id] || e.vendor_id} ${e.model}`,
                        reasoning: `Alternative option.`,
                        specSummary: this.getEquipmentSpecSummary(e)
                    }));
                }

                if (!bestFit) {
                    // Last-resort fallback: Pick the LARGEST available device if everything is too small
                    const allPurposeCandidates = this.equipmentCatalog.filter(e => {
                        if (e.vendor_id !== vendorId) return false;
                        const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
                        return requiredPurpose && e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number]);
                    });

                    const sortedFallbackCandidates = allPurposeCandidates.sort((a, b) => {
                        return getEquipmentPerformanceValue(b, selectedPackage.throughput_basis) - getEquipmentPerformanceValue(a, selectedPackage.throughput_basis); // High performance first for fallback
                    });

                    bestFit = sortedFallbackCandidates[0];

                    if (bestFit) {
                        matchType = "Fallback (Best available effort)";
                        if (sortedFallbackCandidates.length > 1) {
                            alternatives = sortedFallbackCandidates.slice(1, 6).map(e => ({
                                itemId: e.id,
                                itemName: `${VENDOR_LABELS[e.vendor_id] || e.vendor_id} ${e.model}`,
                                reasoning: `Fallback alternative.`,
                                specSummary: this.getEquipmentSpecSummary(e)
                            }));
                        }
                    }
                }

                if (bestFit) {
                    let quantity = 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        quantity = calculateCPEQuantity(site, siteDef);
                    } else if (canonicalServiceId === "managed_lan") {
                        const requiredPorts = site.lanPorts || 48; // Assume 48 if not set
                        const switchPorts = bestFit.specs.ports || 48;
                        quantity = Math.ceil(requiredPorts / switchPorts);
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

    // calculateCPEQuantity and resolveVendorForService are now imported from bom-utils.ts

    private matchesConstraints(equipment: Equipment, constraints: { type: string; description?: string }[]): boolean {
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

    private findMatchingRules(site: Site, packageId: string, serviceId: string): BOMLogicRule[] {
        return this.rules.filter(rule => {
            // All conditions must match (AND logic)
            return rule.conditions.every(condition => this.evaluateCondition(condition, site, packageId, serviceId));
        });
    }

    private evaluateCondition(condition: LogicCondition, site: Site, packageId: string, serviceId: string): boolean {
        let valueToCheck: string | number | boolean | undefined;

        if (condition.field === "packageId") {
            valueToCheck = packageId;
        } else if (condition.field === "serviceId") {
            valueToCheck = serviceId;
        } else {
            // Site attribute
            valueToCheck = site[condition.field as keyof Site];
        }

        switch (condition.operator) {
            case "equals":
                return valueToCheck == condition.value; // Loose equality for numbers/strings
            case "not_equals":
                return valueToCheck != condition.value;
            case "greater_than":
                return typeof valueToCheck === 'number' && valueToCheck > (condition.value as number);
            case "less_than":
                return typeof valueToCheck === 'number' && valueToCheck < (condition.value as number);
            case "contains":
                return typeof valueToCheck === 'string' && valueToCheck.includes(condition.value as string);
            case "in_list":
                return Array.isArray(condition.value) && (condition.value as unknown[]).includes(valueToCheck);
            default:
                return false;
        }
    }

    /**
     * Calculates the throughput utilization percentage for a given site and equipment.
     */
    public calculateUtilization(site: Site, equipment: Equipment, basis?: string, overhead: number = 0): number {
        const throughputField = (basis || "vpn_throughput_mbps") as keyof Equipment["specs"];
        const capacity = (equipment.specs[throughputField] as number) || 0;

        if (!capacity) return 0;

        // Aggregate model: sum of Ingress + Egress traffic (Down + Up) plus overhead
        const siteLoad = (site.bandwidthDownMbps || 0) + (site.bandwidthUpMbps || 0) + overhead;

        // Return percentage
        return Math.round((siteLoad / capacity) * 100);
    }

    /**
     * Validates POE budget for a site based on selected equipment.
     * Returns a list of warning strings.
     */
    public validatePOE(site: Site, bomItems: BOMLineItem[]): string[] {
        const warnings: string[] = [];

        // 1. Calculate Total POE Budget Available
        let totalBudget = 0;
        for (const item of bomItems) {
            if (item.siteName !== site.name) continue;
            const equip = this.equipmentCatalog.find(e => e.id === item.itemId);
            if (equip?.specs.poe_budget) {
                totalBudget += (equip.specs.poe_budget * item.quantity);
            }
        }

        // 2. Calculate Required POE
        // Assumptions:
        // - AP = 15W (Class 3)
        // - Phone (if we had a count) = 7W
        // - Camera = 15W
        const estimatedLoad = (site.indoorAPs + site.outdoorAPs) * 15; // Simple estimation

        if (estimatedLoad > totalBudget) {
            warnings.push(`POE Budget Deficiency: Requires ${estimatedLoad}W (APs: ${estimatedLoad}W), Available ${totalBudget}W.`);
        }

        return warnings;
    }

    private getEquipmentSpecSummary(e: Equipment): string {
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
}
