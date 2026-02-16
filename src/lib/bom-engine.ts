import { Site, BOMLogicRule, BOM, BOMLineItem, LogicCondition } from "./bom-types";
import { Package, Equipment, Service, EQUIPMENT_PURPOSES } from "./types";
import { VENDOR_LABELS } from "./types";
import { SiteType } from "./site-types";

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

    public generateBOM(projectId: string, sites: Site[], selectedPackage: Package, services: Service[], siteTypes: SiteType[]): BOM {
        const bomItems: BOMLineItem[] = [];

        for (const site of sites) {
            let siteDef = siteTypes.find(t => t.id === site.siteTypeId);

            // Fallback to a generic site definition if not found or not provided
            if (!siteDef) {
                siteDef = {
                    id: "generic",
                    name: "Generic Branch",
                    category: "SD-WAN",
                    tier: "Standard",
                    description: "Generic fallback profile",
                    constraints: [],
                    defaults: {
                        redundancy: { cpe: "Single", circuits: "Single" },
                        performance: { throughput_mbps: 0 }
                    }
                } as SiteType;
            }

            // 1. Process Services in Package
            for (const pkgItem of selectedPackage.items) {
                const service = services.find(s => s.id === pkgItem.service_id);
                if (!service) continue;

                // --- 1. TRY RULES ENGINE FIRST ---
                const matchingRules = this.findMatchingRules(site, selectedPackage.id, service.id);
                const equipmentAction = matchingRules
                    .flatMap(r => r.actions)
                    .find(a => a.type === "select_equipment");

                if (equipmentAction) {
                    const equip = this.equipmentCatalog.find(e => e.id === equipmentAction.targetId);
                    if (equip) {
                        let finalQuantity = equipmentAction.quantity || 1;
                        if (equipmentAction.quantityMultiplierField) {
                            const multiplier = site[equipmentAction.quantityMultiplierField as keyof Site] as number;
                            if (typeof multiplier === 'number') {
                                finalQuantity *= multiplier;
                            }
                        }

                        bomItems.push({
                            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                            siteName: site.name,
                            serviceId: service.id,
                            serviceName: service.name,
                            itemId: equip.id,
                            itemName: `${VENDOR_LABELS[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                            itemType: "equipment",
                            quantity: finalQuantity,
                            reasoning: `Rule Match: ${matchingRules[0].name}`
                        });
                        continue; // Skip fallback
                    }
                }

                // --- 2. FALLBACK TO DIRECT MATCHING ---
                // A. Determine Target Vendor for this Service/Package
                const vendorId = this.resolveVendorForService(selectedPackage, service.id);

                // B. Filter Equipment Candidates
                const candidates = this.equipmentCatalog.filter(e => {
                    // 1. Matches Vendor
                    if (e.vendor_id !== vendorId) return false;

                    // 2. Matches Purpose (Category)
                    const purposeMapping: Record<string, string> = {
                        "managed_sdwan": "SDWAN",
                        "managed_lan": "LAN",
                        "managed_wifi": "WLAN"
                    };
                    const requiredPurpose = purposeMapping[service.id];
                    if (requiredPurpose && !e.purpose.includes(requiredPurpose as (typeof EQUIPMENT_PURPOSES)[number])) return false;

                    // 3. Matches Constraints (Rugged, Virtual, etc.)
                    if (!this.matchesConstraints(e, siteDef.constraints)) return false;

                    // 4. Matches Basic Performance (Throughput)
                    if (requiredPurpose === "SDWAN") {
                        const requiredThroughput = site.bandwidthDownMbps || 0;
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

                // C. Select Best Fit
                const bestFit = candidates.sort((a, b) => {
                    const throughputField = selectedPackage.throughput_basis || "vpn_throughput_mbps";
                    const valA = (a.specs[throughputField] ?? a.specs.vpn_throughput_mbps ?? 0) || a.specs.ports || 0;
                    const valB = (b.specs[throughputField] ?? b.specs.vpn_throughput_mbps ?? 0) || b.specs.ports || 0;
                    return valA - valB;
                })[0];

                if (bestFit) {
                    let quantity = 1;
                    if (pkgItem.service_id === "managed_sdwan" && siteDef.defaults.redundancy.cpe === "Dual") {
                        quantity = 2;
                    }

                    bomItems.push({
                        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                        siteName: site.name,
                        serviceId: service.id,
                        serviceName: service.name,
                        itemId: bestFit.id,
                        itemName: `${VENDOR_LABELS[bestFit.vendor_id] || bestFit.vendor_id} ${bestFit.model}`,
                        itemType: "equipment",
                        quantity: quantity,
                        reasoning: `Dynamic match: Vendor=${vendorId}, Throughput=${bestFit.specs.vpn_throughput_mbps || 'N/A'}, Redundancy=${siteDef.defaults.redundancy.cpe}`
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

    private resolveVendorForService(pkg: Package, serviceId: string): string {
        const pkgItem = pkg.items.find(i => i.service_id === serviceId);
        if (pkgItem?.design_option_id) {
            const doId = pkgItem.design_option_id.toLowerCase();
            if (doId.includes("meraki")) return "meraki";
            if (doId.includes("cisco")) return "cisco_catalyst";
            if (doId.includes("catalyst")) return "cisco_catalyst";
        }

        // Package-level inference
        if (pkg.id === "cost_centric") return "meraki";
        if (pkg.id === "performance_centric") return "cisco_catalyst";

        return "meraki"; // Default
    }

    private matchesConstraints(equipment: Equipment, constraints: { type: string; description?: string }[]): boolean {
        for (const constraint of constraints) {
            if (constraint.type === "hardware") {
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
    public calculateUtilization(site: Site, equipment: Equipment): number {
        if (!equipment.specs.ngfw_throughput_mbps) return 0;

        // Assume bi-directional traffic max is the bottleneck
        // Simple model: Compare site bandwidth (down) to equipment throughput
        const siteLoad = Math.max(site.bandwidthDownMbps, site.bandwidthUpMbps);
        const capacity = equipment.specs.ngfw_throughput_mbps;

        // Return percentage (0-100)
        return Math.min(100, Math.round((siteLoad / capacity) * 100));
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
