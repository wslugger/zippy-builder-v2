import { Site, BOMLogicRule, BOM, BOMLineItem, LogicCondition } from "./bom-types";
import { Package, Equipment, Service, EQUIPMENT_PURPOSES } from "./types";
import { VENDOR_LABELS } from "./types";
import { SiteType } from "./site-types";

/**
 * Generates a Bill of Materials based on Sites, Package configuration, and Rules.
 */
// Maps alternative/Firestore service IDs to the canonical IDs used in rules
const SERVICE_ID_ALIASES: Record<string, string> = {
    "sd_wan_service": "managed_sdwan",
    "managed_sdwan": "managed_sdwan",
    "managed_lan": "managed_lan",
    "managed_wifi": "managed_wifi",
};

function normalizeServiceId(id: string): string {
    return SERVICE_ID_ALIASES[id] || id;
}

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
                            quantity = this.calculateCPEQuantity(site, siteDef);
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
                            finalQuantity = this.calculateCPEQuantity(site, siteDef);
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
                const vendorId = this.resolveVendorForService(selectedPackage, service.id);

                const candidates = this.equipmentCatalog.filter(e => {
                    if (e.vendor_id !== vendorId) return false;

                    const purposeMapping: Record<string, string> = {
                        "managed_sdwan": "SDWAN",
                        "managed_lan": "LAN",
                        "managed_wifi": "WLAN"
                    };
                    const requiredPurpose = purposeMapping[canonicalServiceId];
                    if (requiredPurpose && !e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number])) return false;

                    if (!this.matchesConstraints(e, siteDef.constraints)) return false;

                    if (requiredPurpose === "SDWAN") {
                        const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                        const deviceThroughput = e.specs[throughputField] ?? e.specs.vpn_throughput_mbps ?? 0;
                        if (deviceThroughput < requiredThroughput) return false;
                    }

                    if (requiredPurpose === "LAN") {
                        const requiredPorts = site.lanPorts || 0;
                        if ((e.specs.ports || 0) < requiredPorts && e.specs.ports !== undefined) return false;
                    }

                    return true;
                });

                let bestFit = candidates.sort((a, b) => {
                    const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                    const valA = (a.specs[throughputField] ?? a.specs.vpn_throughput_mbps ?? 0) || a.specs.ports || 0;
                    const valB = (b.specs[throughputField] ?? b.specs.vpn_throughput_mbps ?? 0) || b.specs.ports || 0;
                    return valA - valB;
                })[0];

                let matchType = "Dynamic match";

                if (!bestFit) {
                    // Last-resort fallback: Pick the LARGEST available device if everything is too small
                    const allPurposeCandidates = this.equipmentCatalog.filter(e => {
                        if (e.vendor_id !== vendorId) return false;
                        const purposeMapping: Record<string, string> = {
                            "managed_sdwan": "SDWAN",
                            "managed_lan": "LAN",
                            "managed_wifi": "WLAN"
                        };
                        const requiredPurpose = purposeMapping[canonicalServiceId];
                        return requiredPurpose && e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number]);
                    });

                    bestFit = allPurposeCandidates.sort((a, b) => {
                        const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                        const valA = (a.specs[throughputField] ?? a.specs.vpn_throughput_mbps ?? 0) || a.specs.ports || 0;
                        const valB = (b.specs[throughputField] ?? b.specs.vpn_throughput_mbps ?? 0) || b.specs.ports || 0;
                        return valB - valA; // High performance first for fallback
                    })[0];

                    if (bestFit) {
                        matchType = "Fallback (Best available effort)";
                    }
                }

                if (bestFit) {
                    let quantity = 1;
                    if (canonicalServiceId === "managed_sdwan") {
                        quantity = this.calculateCPEQuantity(site, siteDef);
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
                        reasoning: `${matchType}: Vendor=${vendorId}, ${throughputField.replace(/_/g, ' ').toUpperCase()}=${deviceThroughput} Mbps. ${deviceThroughput < requiredThroughput ? 'Warning: Load exceeds capacity.' : ''}`
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

    private calculateCPEQuantity(site: Site, siteDef: SiteType): number {
        const siteModel = (site.redundancyModel || "").toLowerCase();
        const profileRedundancy = (siteDef.defaults.redundancy?.cpe || "").toLowerCase();

        // 1. If SiteType is NOT generic, it should be the primary source of truth for standardization
        // unless the site model explicitly says else. But for SA choice, SiteDef usually wins.
        if (siteDef.id !== "generic" && profileRedundancy) {
            if (profileRedundancy.includes("dual") || profileRedundancy.includes("ha") || profileRedundancy.includes("redundant") || profileRedundancy.includes("active")) return 2;
            if (profileRedundancy.includes("single")) return 1;
        }

        // 2. Explicit Site-level override (e.g. from CSV)
        if (siteModel.includes("dual") || siteModel.includes("ha") || siteModel.includes("redundant") || siteModel.includes("active")) return 2;
        if (siteModel.includes("single")) return 1;

        // 3. Last fallback: Check if profile has anything at all
        if (profileRedundancy.includes("dual") || profileRedundancy.includes("ha") || profileRedundancy.includes("redundant")) return 2;

        return 1; // Default to single
    }

    private resolveVendorForService(pkg: Package, serviceId: string): string {
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
}
