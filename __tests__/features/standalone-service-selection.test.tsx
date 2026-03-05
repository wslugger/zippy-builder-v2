/**
 * Feature: Individual Sites & Additional Services — service selection flow
 *
 * The standalone page should let the SA select services from the catalog,
 * then pick a service option per service, then pick design options per option.
 * Selections are saved as PackageItem[] to project.customizedItems.
 */

import { Service, PackageItem, ServiceOption, DesignOption } from "@/src/lib/types";

// --- Pure logic helpers (mirroring what the page component uses) ---

function toggleService(
    items: PackageItem[],
    serviceId: string
): PackageItem[] {
    const exists = items.some(i => i.service_id === serviceId && !i.service_option_id);
    if (exists) {
        // Remove service and all its sub-items
        return items.filter(i => i.service_id !== serviceId);
    }
    return [...items, { service_id: serviceId, enabled_features: [], inclusion_type: 'optional' }];
}

function selectServiceOption(
    items: PackageItem[],
    serviceId: string,
    optionId: string
): PackageItem[] {
    // Remove existing option selections for this service, keep design-level and service-level items
    const withoutOptions = items.filter(i =>
        !(i.service_id === serviceId && i.service_option_id && !i.design_option_id)
    );
    return [...withoutOptions, { service_id: serviceId, service_option_id: optionId, enabled_features: [], inclusion_type: 'optional' }];
}

function selectDesignOption(
    items: PackageItem[],
    services: Service[],
    serviceId: string,
    optionId: string,
    designId: string
): PackageItem[] {
    const service = services.find(s => s.id === serviceId);
    const option = service?.service_options?.find(o => o.id === optionId);
    const design = option?.design_options?.find(d => d.id === designId);
    const category = design?.category;

    // Remove conflicting design options in the same category
    const withoutConflicts = category
        ? items.filter(i => {
            if (i.service_id !== serviceId || i.service_option_id !== optionId || !i.design_option_id) return true;
            const otherDesign = option?.design_options?.find(d => d.id === i.design_option_id);
            return otherDesign?.category !== category;
        })
        : items;

    return [...withoutConflicts, { service_id: serviceId, service_option_id: optionId, design_option_id: designId, enabled_features: [], inclusion_type: 'optional' }];
}

function isServiceSelected(items: PackageItem[], serviceId: string): boolean {
    return items.some(i => i.service_id === serviceId);
}

function getSelectedOption(items: PackageItem[], serviceId: string): string | undefined {
    return items.find(i => i.service_id === serviceId && i.service_option_id && !i.design_option_id)?.service_option_id;
}

function getSelectedDesignForCategory(items: PackageItem[], serviceId: string, optionId: string, category: string, services: Service[]): string | undefined {
    const service = services.find(s => s.id === serviceId);
    const option = service?.service_options?.find(o => o.id === optionId);
    return items.find(i => {
        if (i.service_id !== serviceId || i.service_option_id !== optionId || !i.design_option_id) return false;
        const design = option?.design_options?.find(d => d.id === i.design_option_id);
        return design?.category === category;
    })?.design_option_id;
}

// --- Test data ---

const mockDesign1: DesignOption = {
    id: "design-local", name: "Local Breakout", short_description: "", detailed_description: "",
    caveats: [], assumptions: [], category: "Internet Breakout"
};
const mockDesign2: DesignOption = {
    id: "design-cloud", name: "Cloud Breakout", short_description: "", detailed_description: "",
    caveats: [], assumptions: [], category: "Internet Breakout"
};
const mockOption: ServiceOption = {
    id: "opt-standard", name: "Standard Option", short_description: "", detailed_description: "",
    caveats: [], assumptions: [], design_options: [mockDesign1, mockDesign2]
};
const mockService: Service = {
    id: "svc-sdwan", name: "SD-WAN Service", short_description: "SD-WAN", detailed_description: "",
    caveats: [], assumptions: [], service_options: [mockOption], active: true,
    createdAt: "", updatedAt: ""
};
const mockServices = [mockService];

// --- Tests ---

describe("Standalone service selection logic", () => {
    it("adds a service-level item when toggling a service on", () => {
        const result = toggleService([], "svc-sdwan");
        expect(result).toHaveLength(1);
        expect(result[0].service_id).toBe("svc-sdwan");
        expect(result[0].service_option_id).toBeUndefined();
    });

    it("removes service and all sub-items when toggling off", () => {
        let items: PackageItem[] = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        items = selectDesignOption(items, mockServices, "svc-sdwan", "opt-standard", "design-local");
        expect(items.length).toBe(3);

        const removed = toggleService(items, "svc-sdwan");
        expect(removed).toHaveLength(0);
    });

    it("selects a service option and replaces previous option selection", () => {
        let items: PackageItem[] = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard"); // re-select same
        const optionItems = items.filter(i => i.service_option_id && !i.design_option_id);
        expect(optionItems).toHaveLength(1);
        expect(optionItems[0].service_option_id).toBe("opt-standard");
    });

    it("selects a design option", () => {
        let items: PackageItem[] = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        items = selectDesignOption(items, mockServices, "svc-sdwan", "opt-standard", "design-local");
        const designItems = items.filter(i => i.design_option_id);
        expect(designItems).toHaveLength(1);
        expect(designItems[0].design_option_id).toBe("design-local");
    });

    it("replacing a design option in the same category removes the old one", () => {
        let items: PackageItem[] = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        items = selectDesignOption(items, mockServices, "svc-sdwan", "opt-standard", "design-local");
        items = selectDesignOption(items, mockServices, "svc-sdwan", "opt-standard", "design-cloud");
        const designItems = items.filter(i => i.design_option_id);
        expect(designItems).toHaveLength(1);
        expect(designItems[0].design_option_id).toBe("design-cloud");
    });

    it("isServiceSelected returns true when service is in items", () => {
        const items = toggleService([], "svc-sdwan");
        expect(isServiceSelected(items, "svc-sdwan")).toBe(true);
        expect(isServiceSelected(items, "svc-other")).toBe(false);
    });

    it("getSelectedOption returns the option id", () => {
        let items = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        expect(getSelectedOption(items, "svc-sdwan")).toBe("opt-standard");
    });

    it("getSelectedDesignForCategory returns the design id in category", () => {
        let items = toggleService([], "svc-sdwan");
        items = selectServiceOption(items, "svc-sdwan", "opt-standard");
        items = selectDesignOption(items, mockServices, "svc-sdwan", "opt-standard", "design-local");
        const result = getSelectedDesignForCategory(items, "svc-sdwan", "opt-standard", "Internet Breakout", mockServices);
        expect(result).toBe("design-local");
    });
});
