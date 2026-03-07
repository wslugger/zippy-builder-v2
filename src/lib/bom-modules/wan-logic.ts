/* eslint-disable @typescript-eslint/no-explicit-any */

import { BOMModuleInput, BOMLineItem } from "../types";
import { VENDOR_LABELS } from "../types";
import {
    resolveVendorForService,
    calculateCPEQuantity,
    getEquipmentPerformanceValue,
    hasEquipmentPurpose,
    makePricingSnapshot,
    matchesConstraints,
    SERVICE_TO_PURPOSE
} from "../bom-utils";
import jsonLogic from "json-logic-js";

export function calculateWANBOM(input: BOMModuleInput): BOMLineItem[] {
    const {
        site,
        siteDef,
        canonicalServiceId,
        service,
        equipmentCatalog,
        rules,
        siteParameters,
        pkgItem,
        selectedPackage,
        pricingCatalog
    } = input;

    const bomItems: BOMLineItem[] = [];

    // 1. Check for manual overrides
    const selectionKey = `${site.name}:${canonicalServiceId}`;
    const manualOverrideRaw = input.siteParameters?.manualSelections?.[selectionKey];

    let selections: Array<{ itemId: string; quantity?: number }> = [];

    if (Array.isArray(manualOverrideRaw)) {
        selections = manualOverrideRaw.map(s => (typeof s === 'string' ? { itemId: s } : s));
    } else if (typeof manualOverrideRaw === 'string') {
        selections = [{ itemId: manualOverrideRaw }];
    } else if (manualOverrideRaw && typeof manualOverrideRaw === 'object') {
        const overrideObj = manualOverrideRaw as any;
        selections = [{ itemId: overrideObj.itemId, quantity: overrideObj.quantity }];
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

    // B. Apply "set_parameter" actions to site context (local to this function's logic)
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
                if (!selection.quantity) {
                    quantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
                }

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
                    pricing: makePricingSnapshot(equip, pricingCatalog),
                });
                processedAny = true;
            }
        }
        if (processedAny) return bomItems;
    }

    // C. Calculate Required Throughput
    let throughputOverhead = siteParameters['throughput_overhead_mbps'] ?? 0;
    if (siteParameters['throughput_overhead_mbps'] === undefined) {
        throughputOverhead = selectedPackage.throughput_overhead_mbps || 0;
        if (pkgItem?.design_option_id) {
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
            finalQuantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);

            if (equipmentAction.quantityMultiplierField) {
                const multiplier = site[equipmentAction.quantityMultiplierField as keyof typeof site] as number;
                if (typeof multiplier === 'number') {
                    finalQuantity *= multiplier;
                }
            }

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
                pricing: makePricingSnapshot(equip, pricingCatalog),
            });
            return bomItems;
        } else {
            console.warn(`[WANLogic] Rule target equipment not found in catalog: ${equipmentAction.targetId}`);
        }
    }

    // E. Dynamic Match Logic
    const vendorId = resolveVendorForService(selectedPackage, service.id, [service as any]);

    let isDistributedSecurity = false;
    for (const item of selectedPackage.items) {
        if (item.design_option_id) {
            // we'd optimally need ALL services here, but since this operates within a single selected package context
            // it suffices to use the specific lookup if available, otherwise it falls back
            if (item.service_id === service.id) {
                const dOpt = service.service_options.flatMap(so => so.design_options).find(d => d.id === item.design_option_id);
                if (dOpt && dOpt.name && dOpt.name.toLowerCase().includes("distributed")) {
                    isDistributedSecurity = true;
                }
            }
        }
    }

    // We can also extract this from the package directly or use a better heuristic if needed.
    const defaultMetric = isDistributedSecurity ? "advancedSecurityThroughputMbps" : "sdwanCryptoThroughputMbps";
    const activeThroughputField = selectedPackage.throughput_basis || siteParameters['throughputBasis'] || defaultMetric;

    const candidates = equipmentCatalog.filter(e => {
        if (e.vendor_id !== vendorId) return false;

        const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
        if (requiredPurpose && !hasEquipmentPurpose(e, requiredPurpose)) return false;

        if (!matchesConstraints(e, siteDef.constraints)) return false;

        const throughputField = activeThroughputField;
        const specs = e.specs as any;
        const deviceThroughput = Number(specs[throughputField] ?? 0);

        if (deviceThroughput < requiredThroughput) return false;

        const cpeQuantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
        const haLanPortMinimum = siteParameters['haLanPortMinimum'] ?? 1;
        if (cpeQuantity > 1 && (specs.lanPortCount || 0) < haLanPortMinimum) {
            return false;
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
        alternatives = sortedCandidates.slice(1, 6).map(e => {
            const specs = e.specs as any;
            const throughput = specs.sdwanCryptoThroughputMbps || 0;
            const parts = [];
            if (throughput) parts.push(`${throughput}M VPN`);
            if (specs.wanPortCount) parts.push(`${specs.wanPortCount} WAN`);

            return {
                itemId: e.id,
                itemName: `${(VENDOR_LABELS as Record<string, string>)[e.vendor_id] || e.vendor_id} ${e.model}`,
                reasoning: `Alternative option.`,
                specSummary: parts.join(", ")
            };
        });
    }

    if (!bestFit) {
        const allPurposeCandidates = equipmentCatalog.filter(e => {
            if (e.vendor_id !== vendorId) return false;
            const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
            if (!requiredPurpose) return true;
            return hasEquipmentPurpose(e, requiredPurpose);
        });

        const sortedFallbackCandidates = allPurposeCandidates.sort((a, b) => {
            return getEquipmentPerformanceValue(b, activeThroughputField) - getEquipmentPerformanceValue(a, activeThroughputField);
        });

        bestFit = sortedFallbackCandidates[0];

        if (bestFit) {
            matchType = "Fallback (Best available effort)";
            if (sortedFallbackCandidates.length > 1) {
                alternatives = sortedFallbackCandidates.slice(1, 6).map(e => {
                    const specs = e.specs as any;
                    const throughput = specs.sdwanCryptoThroughputMbps || 0;
                    const parts = [];
                    if (throughput) parts.push(`${throughput}M VPN`);
                    if (specs.wanPortCount) parts.push(`${specs.wanPortCount} WAN`);

                    return {
                        itemId: e.id,
                        itemName: `${(VENDOR_LABELS as Record<string, string>)[e.vendor_id] || e.vendor_id} ${e.model}`,
                        reasoning: `Fallback alternative.`,
                        specSummary: parts.join(", ")
                    };
                });
            }
        }
    }

    if (bestFit) {
        const quantity = siteParameters['cpe_quantity'] ?? calculateCPEQuantity(site, siteDef);
        const deviceThroughput = getEquipmentPerformanceValue(bestFit, activeThroughputField);

        const reasoning = `${matchType}: Vendor=${vendorId}, ${activeThroughputField.replace(/_/g, ' ').toUpperCase()}=${deviceThroughput} Mbps. ${deviceThroughput < requiredThroughput ? 'Warning: Load exceeds capacity.' : ''}`;

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
            pricing: makePricingSnapshot(bestFit, pricingCatalog),
        });
    }

    return bomItems;
}
