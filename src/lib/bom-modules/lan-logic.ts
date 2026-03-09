/* eslint-disable @typescript-eslint/no-explicit-any */

import { BOMModuleInput, BOMLineItem, POE_CAPABILITIES } from "../types";
import { VENDOR_LABELS } from "../types";
import {
    resolveVendorForService,
    getEquipmentPerformanceValue,
    hasEquipmentPurpose,
    makePricingSnapshot,
    matchesConstraints,
    SERVICE_TO_PURPOSE,
    getSelectionKey
} from "../bom-utils";
import jsonLogic from "json-logic-js";

export function calculateLANBOM(input: BOMModuleInput): BOMLineItem[] {
    const {
        site,
        siteDef,
        canonicalServiceId,
        service,
        equipmentCatalog,
        rules,
        siteParameters,
        selectedPackage,
        pricingCatalog
    } = input;

    const bomItems: BOMLineItem[] = [];

    // 1. Check for manual overrides
    const selectionKey = getSelectionKey(site.name, canonicalServiceId);
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

    if (selections.length === 0 && site.lanRequirements?.needsManualReview === true) {
        // Site is flagged for manual LAN review — skip auto-selection until the SA resolves it
        return bomItems;
    }

    // A. Evaluate Rules Engine for this service context
    const matchingRules = rules.filter(rule => {
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
        return jsonLogic.apply(rule.condition, context);
    });

    // B. Apply "set_parameter" actions
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
                const quantity = selection.quantity ?? 1;
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

    // D. Check for explicit "select_equipment" action
    const equipmentAction = matchingRules.flatMap(r => r.actions).find(a => a.type === "select_equipment");

    if (equipmentAction) {
        const equip = equipmentCatalog.find(e => e.id === equipmentAction.targetId);
        if (equip) {
            let finalQuantity = equipmentAction.quantity || 1;

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
            console.warn(`[LANLogic] Rule target equipment not found in catalog: ${equipmentAction.targetId}`);
        }
    }

    // E. Dynamic Match Logic
    const vendorId = resolveVendorForService(selectedPackage, service.id, [service as any]);

    // We can also extract this from the package directly or use a better heuristic if needed.
    const activeThroughputField = selectedPackage.throughput_basis || siteParameters['throughputBasis'] || "sdwanCryptoThroughputMbps";

    const candidates = equipmentCatalog.filter(e => {
        if (e.vendor_id !== vendorId) return false;

        const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
        if (requiredPurpose && !hasEquipmentPurpose(e, requiredPurpose)) return false;

        const minPorts = siteParameters['minAccessPorts'] || site.lanPorts || 0;
        const minPoe = siteParameters['required_poe_watts'] || 0;
        const specs = e.specs as any;

        // Filter out switches that don't meet port density or PoE budget
        if ((specs.accessPortCount || 0) < minPorts) {
            return false;
        }
        if ((specs.poeBudgetWatts || 0) < minPoe) {
            return false;
        }

        // Strict matching against SiteLANRequirements (data-driven)
        const req = site.lanRequirements;
        if (req && !req.needsManualReview) {
            if (req.accessPortType && specs.accessPortType && specs.accessPortType !== req.accessPortType) {
                return false;
            }
            // Relaxed check: Only reject if the switch HAS an uplink type and it MISMATCHES.
            // If the metadata is missing, we allow it as a candidate.
            if (req.uplinkPortType && specs.uplinkPortType && specs.uplinkPortType !== req.uplinkPortType) {
                return false;
            }
            if (req.poeCapabilities && req.poeCapabilities !== 'None') {
                const reqIndex = POE_CAPABILITIES.indexOf(req.poeCapabilities as any);
                const switchIndex = POE_CAPABILITIES.indexOf(specs.poe_capabilities as any);

                if (switchIndex < reqIndex && switchIndex !== -1) {
                    return false;
                }
            }
            if (req.totalPoeBudgetWatts && specs.poeBudgetWatts && specs.poeBudgetWatts < req.totalPoeBudgetWatts) return false;
            if (req.isStackable === true && specs.isStackable === false) {
                return false;
            }
        }

        return true;
    });

    const sortedCandidates = candidates.sort((a, b) => {
        const aPorts = Number((a.specs as any).accessPortCount || 0);
        const bPorts = Number((b.specs as any).accessPortCount || 0);

        // Primary sort: Smallest switch that meets requirements (efficiency)
        if (aPorts !== bPorts) {
            return aPorts - bPorts;
        }

        return getEquipmentPerformanceValue(a, activeThroughputField) - getEquipmentPerformanceValue(b, activeThroughputField);
    });

    let bestFit = sortedCandidates[0];
    let matchType = "Dynamic match";
    let alternatives: { itemId: string; itemName: string; reasoning?: string; specSummary?: string }[] = [];

    if (sortedCandidates.length > 1) {
        alternatives = sortedCandidates.slice(1, 6).map(e => {
            const parts: string[] = [];
            const specs = e.specs as any;
            const totalPorts = specs.accessPortCount || 0;
            if (totalPorts) parts.push(`${totalPorts} Ports`);
            if (specs.poeBudgetWatts) parts.push(`${specs.poeBudgetWatts}W PoE`);

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
            const minPorts = siteParameters['minAccessPorts'] || site.lanPorts || 0;
            const reqPoe = (site.lanRequirements?.poeCapabilities || 'None') !== 'None';

            const aSpecs = a.specs as any;
            const bSpecs = b.specs || {} as any;

            const aPorts = Number(aSpecs.accessPortCount || 0);
            const bPorts = Number(bSpecs.accessPortCount || 0);

            const aHasPoe = Number(aSpecs.poeBudgetWatts || 0) > 0;
            const bHasPoe = Number(bSpecs.poeBudgetWatts || 0) > 0;

            if (reqPoe && aHasPoe !== bHasPoe) {
                return bHasPoe ? 1 : -1;
            }

            const aEnoughPorts = aPorts >= minPorts;
            const bEnoughPorts = bPorts >= minPorts;
            if (aEnoughPorts !== bEnoughPorts) {
                return bEnoughPorts ? 1 : -1;
            }

            // Both enough: Prefer the SMALLER of the two for cost efficiency
            if (aEnoughPorts && bEnoughPorts) {
                return aPorts - bPorts;
            }

            // Both NOT enough: Prefer the LARGER of the two to get closer to requirements
            if (!aEnoughPorts && !bEnoughPorts && aPorts !== bPorts) {
                return bPorts - aPorts;
            }

            return getEquipmentPerformanceValue(a, activeThroughputField) - getEquipmentPerformanceValue(b, activeThroughputField);
        });


        bestFit = sortedFallbackCandidates[0];

        if (bestFit) {
            matchType = "Fallback (Best available effort)";
            if (sortedFallbackCandidates.length > 1) {
                alternatives = sortedFallbackCandidates.slice(1, 6).map(e => {
                    const parts: string[] = [];
                    const specs = e.specs as any;
                    const totalPorts = specs.accessPortCount || 0;
                    if (totalPorts) parts.push(`${totalPorts} Ports`);
                    if (specs.poeBudgetWatts) parts.push(`${specs.poeBudgetWatts}W PoE`);

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
        let finalQuantity = 1;
        const requiredPorts = siteParameters['minAccessPorts'] || site.lanPorts || 0;
        const switchPorts = (bestFit.specs as any).accessPortCount || 0;

        if (requiredPorts > 0 && switchPorts > 0) {
            finalQuantity = Math.max(1, Math.ceil(requiredPorts / switchPorts));
        }

        const lanSpecs = bestFit.specs as any;
        const specParts: string[] = [];
        if (lanSpecs.accessPortType) specParts.push(`Access: ${lanSpecs.accessPortType}`);
        if (lanSpecs.poe_capabilities && lanSpecs.poe_capabilities !== 'None') specParts.push(`PoE: ${lanSpecs.poe_capabilities} (${lanSpecs.poeBudgetWatts || 0}W)`);
        if (lanSpecs.poe_capabilities === 'None' || !lanSpecs.poe_capabilities) specParts.push('PoE: None');
        if (lanSpecs.accessPortCount) specParts.push(`${lanSpecs.accessPortCount} Ports`);
        if (lanSpecs.uplinkPortType) specParts.push(`Uplink: ${lanSpecs.uplinkPortCount || 0}x ${lanSpecs.uplinkPortType}`);
        if (lanSpecs.isStackable) specParts.push('Stackable');

        let reasoning = `${matchType}: ${specParts.join(', ')}.`;

        // Add Transceiver note for Fiber uplinks
        if (siteParameters['fiberTransceiverNote'] !== false && lanSpecs.uplinkPortType?.toLowerCase().includes('fiber')) {
            reasoning += ` NOTE: Requires ${lanSpecs.uplinkPortCount || 0}x Fiber Transceivers for uplinks.`;
        }

        bomItems.push({
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
            siteName: site.name,
            serviceId: canonicalServiceId,
            serviceName: service.name,
            itemId: bestFit.id,
            itemName: `${(VENDOR_LABELS as Record<string, string>)[bestFit.vendor_id] || bestFit.vendor_id} ${bestFit.model}`,
            itemType: "equipment",
            quantity: finalQuantity,
            reasoning: reasoning,
            matchedRules: matchingRules.length > 0 ? matchingRules.map(r => ({
                ruleId: r.id,
                ruleName: r.name,
                description: `Condition: ${JSON.stringify(r.condition)}`
            })) : [
                {
                    ruleId: 'dynamic_match',
                    ruleName: matchType,
                    description: `Selected based on Vendor (${vendorId}) and Site LAN Requirements.`
                }
            ],
            alternatives: alternatives.length > 0 ? alternatives : undefined,
            pricing: makePricingSnapshot(bestFit, pricingCatalog),
        });
    }

    return bomItems;
}
