/* eslint-disable @typescript-eslint/no-explicit-any */

import { BOMModuleInput, BOMLineItem } from "../types";
import { VENDOR_LABELS } from "../types";
import {
    resolveVendorForService,
    getEquipmentPerformanceValue,
    getEquipmentRole,
    makePricingSnapshot,
    matchesConstraints,
    SERVICE_TO_PURPOSE
} from "../bom-utils";
import jsonLogic from "json-logic-js";

export function calculateWLANBOM(input: BOMModuleInput): BOMLineItem[] {
    const {
        site,
        siteDef,
        canonicalServiceId,
        service,
        equipmentCatalog,
        rules,
        siteParameters,
        selectedPackage
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
        const context = {
            site: site,
            packageId: selectedPackage.id,
            serviceId: canonicalServiceId
        };
        return jsonLogic.apply(rule.condition, context);
    });

    // B. Apply "set_parameter" actions
    matchingRules.flatMap(r => r.actions)
        .filter(a => a.type === "set_parameter")
        .forEach(a => {
            const context = {
                site: site,
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
                    pricing: makePricingSnapshot(equip),
                });
                processedAny = true;
            }
        }
        if (processedAny) return bomItems;
    }

    // D. Check for explicit "select_equipment" action
    const equipmentActions = matchingRules.flatMap(r => r.actions).filter(a => a.type === "select_equipment");

    if (equipmentActions.length > 0) {
        for (const equipmentAction of equipmentActions) {
            const equip = equipmentCatalog.find(e => e.id === equipmentAction.targetId);
            if (equip) {
                let finalQuantity = equipmentAction.quantity || 1;

                if (equipmentAction.quantityMultiplierField) {
                    const multiplier = site[equipmentAction.quantityMultiplierField as keyof typeof site] as number;
                    if (typeof multiplier === 'number') {
                        finalQuantity *= multiplier;
                    }
                }

                if (finalQuantity > 0) {
                    bomItems.push({
                        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                        siteName: site.name,
                        serviceId: canonicalServiceId,
                        serviceName: service.name,
                        itemId: equip.id,
                        itemName: `${(VENDOR_LABELS as Record<string, string>)[equip.vendor_id] || equip.vendor_id} ${equip.model}`,
                        itemType: "equipment",
                        quantity: finalQuantity,
                        reasoning: `Rule Match`,
                        matchedRules: matchingRules.map(r => ({
                            ruleId: r.id,
                            ruleName: r.name,
                            description: `Condition: ${JSON.stringify(r.condition)}`
                        })),
                        pricing: makePricingSnapshot(equip),
                    });
                }
            } else {
                console.warn(`[WLANLogic] Rule target equipment not found in catalog: ${equipmentAction.targetId}`);
            }
        }

        if (bomItems.length > 0) {
            return bomItems;
        }
    }

    // E. Dynamic Match Logic (Fallback for WLAN)
    const vendorId = resolveVendorForService(selectedPackage, service.id, [service as any]);

    const candidates = equipmentCatalog.filter(e => {
        if (e.vendor_id !== vendorId) return false;

        const role = getEquipmentRole(e);
        const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
        if (requiredPurpose) {
            const roleMap: Record<string, string> = { "WAN": "WAN", "LAN": "LAN", "WLAN": "WLAN" };
            if (role !== roleMap[requiredPurpose]) return false;
        }

        return true;
    });

    const sortedCandidates = candidates.sort((a, b) => {
        return getEquipmentPerformanceValue(a, '') - getEquipmentPerformanceValue(b, '');
    });

    let bestFit = sortedCandidates[0];
    let matchType = "Dynamic match";

    if (!bestFit) {
        const allPurposeCandidates = equipmentCatalog.filter(e => {
            if (e.vendor_id !== vendorId) return false;
            const requiredPurpose = SERVICE_TO_PURPOSE[canonicalServiceId];
            if (!requiredPurpose) return true;
            const candidatePurposes = [e.primary_purpose, ...(e.additional_purposes || [])];
            return candidatePurposes.includes(requiredPurpose as any);
        });

        const sortedFallbackCandidates = allPurposeCandidates.sort((a, b) => {
            return getEquipmentPerformanceValue(b, '') - getEquipmentPerformanceValue(a, '');
        });

        bestFit = sortedFallbackCandidates[0];
        if (bestFit) matchType = "Fallback (Best available effort)";
    }

    if (bestFit) {
        // Fallback assumes we add 1 AP if indoorAPs is not defined, just to not show an empty BOM if requested
        const quantity = site.indoorAPs > 0 ? site.indoorAPs : (site.outdoorAPs > 0 ? site.outdoorAPs : 1);

        bomItems.push({
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
            siteName: site.name,
            serviceId: canonicalServiceId,
            serviceName: service.name,
            itemId: bestFit.id,
            itemName: `${(VENDOR_LABELS as Record<string, string>)[bestFit.vendor_id] || bestFit.vendor_id} ${bestFit.model}`,
            itemType: "equipment",
            quantity: quantity,
            reasoning: `${matchType}: Vendor=${vendorId}`,
            matchedRules: [
                {
                    ruleId: 'dynamic_match',
                    ruleName: matchType,
                    description: `Selected based on Vendor (${vendorId}).`
                }
            ],
            pricing: makePricingSnapshot(bestFit),
        });
    }

    return bomItems;
}
