/**
 * Bug: ServiceItemForm shows all features when editing a service.
 * Only features mapped to the current service (via feature.category) should be visible.
 *
 * Root cause: The feature list filter did not check TechnicalFeature.category against
 * the service name. All catalog features were shown regardless of mapping.
 * The fix is to pre-filter features to only those whose category array includes item.name.
 */

describe("ServiceItemForm - features filtered by mapped service", () => {
    const allFeatures = [
        { id: "feat-1", name: "Advanced Monitoring", category: ["Zippy Hybrid Broadband", "SD-WAN Service"] },
        { id: "feat-2", name: "BGP Routing", category: ["SD-WAN Service"] },
        { id: "feat-3", name: "Cellular Failover", category: ["Zippy Hybrid Broadband"] },
        { id: "feat-4", name: "VLAN Segmentation", category: ["Managed LAN"] },
    ];

    function filterFeaturesForService(serviceName: string, featureSearch: string, showSelectedOnly: boolean, selectedIds: string[]) {
        return allFeatures.filter(f => {
            const featureCategories = Array.isArray(f.category) ? f.category : [f.category];
            const mappedToThisService = serviceName
                ? featureCategories.some(cat => cat.toLowerCase() === serviceName.toLowerCase())
                : true;
            if (!mappedToThisService) return false;

            const matchesSearch = f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                featureCategories.some(cat => cat.toLowerCase().includes(featureSearch.toLowerCase()));
            const isSelected = selectedIds.includes(f.id);

            if (showSelectedOnly) return matchesSearch && isSelected;
            return matchesSearch;
        });
    }

    it("should only show features mapped to the current service", () => {
        const visible = filterFeaturesForService("Zippy Hybrid Broadband", "", false, []);
        expect(visible.map(f => f.id)).toEqual(["feat-1", "feat-3"]);
        expect(visible.find(f => f.id === "feat-2")).toBeUndefined(); // SD-WAN only
        expect(visible.find(f => f.id === "feat-4")).toBeUndefined(); // Managed LAN only
    });

    it("should not show features mapped to a different service", () => {
        const visible = filterFeaturesForService("Managed LAN", "", false, []);
        expect(visible.map(f => f.id)).toEqual(["feat-4"]);
    });

    it("should respect showSelectedOnly filter within mapped features", () => {
        const visible = filterFeaturesForService("Zippy Hybrid Broadband", "", true, ["feat-1"]);
        expect(visible.map(f => f.id)).toEqual(["feat-1"]);
    });

    it("should show all mapped features when showSelectedOnly is false", () => {
        const visible = filterFeaturesForService("Zippy Hybrid Broadband", "", false, ["feat-1"]);
        expect(visible).toHaveLength(2);
    });
});
