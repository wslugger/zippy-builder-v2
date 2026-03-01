import { evaluateSiteComplexity } from "@/src/lib/bom-engine";
import { Site, Package, BOMLogicRule } from "@/src/lib/types";

describe("evaluateSiteComplexity", () => {
    const mockPackage: Package = {
        id: "standard",
        name: "Standard Package",
        active: true,
        short_description: "",
        detailed_description: "",
        items: []
    };

    const userLimitRule: BOMLogicRule = {
        id: "user_limit",
        name: "User Count Limit",
        priority: 1,
        condition: { ">": [{ "var": "site.userCount" }, 15] },
        actions: [
            {
                type: "require_triage",
                targetId: "site",
                reason: "User count exceeds standard branch limit",
                severity: "medium",
                resolutionPaths: ["Review manually"]
            }
        ]
    };

    const baseSite: Site = {
        name: "Test Site",
        userCount: 10,
        bandwidthDownMbps: 100,
        bandwidthUpMbps: 100,
        primaryCircuit: "Broadband",
        address: "123 Main St",
        siteTypeId: "standard",
        redundancyModel: "Single CPE",
        wanLinks: 1,
        lanPorts: 0,
        poePorts: 0,
        indoorAPs: 0,
        outdoorAPs: 0
    };

    it("should flag site for GUIDED_FLOW if user count rule triggers", () => {
        const siteUnder = { ...baseSite, userCount: 10 };
        const resultUnder = evaluateSiteComplexity(siteUnder, [userLimitRule], mockPackage);
        expect(resultUnder.uxRoute).toBe("FAST_TRACK");
        expect(resultUnder.triageFlags).toHaveLength(0);

        const siteOver = { ...baseSite, userCount: 16 };
        const resultOver = evaluateSiteComplexity(siteOver, [userLimitRule], mockPackage);
        expect(resultOver.uxRoute).toBe("GUIDED_FLOW");
        expect(resultOver.triageFlags).toHaveLength(1);
        expect(resultOver.triageFlags[0].reason).toBe("User count exceeds standard branch limit");
    });

    it("should handle dynamic rules based on package context", () => {
        const highPerfPackage: Package = { ...mockPackage, id: "high_perf" };
        const packageSpecificRule: BOMLogicRule = {
            id: "pkg_specific",
            name: "Package Specific Limit",
            priority: 1,
            condition: {
                "and": [
                    { "==": [{ "var": "packageId" }, "high_perf"] },
                    { ">": [{ "var": "site.userCount" }, 100] }
                ]
            },
            actions: [{ type: "require_triage", targetId: "site", reason: "Too many users for high-perf package" }]
        };

        const site50 = { ...baseSite, userCount: 50 };
        // Should not trigger on standard package
        const resultStd = evaluateSiteComplexity(site50, [packageSpecificRule], mockPackage);
        expect(resultStd.uxRoute).toBe("FAST_TRACK");

        // Should trigger on high_perf package if over 100
        const site150 = { ...baseSite, userCount: 150 };
        const resultHigh = evaluateSiteComplexity(site150, [packageSpecificRule], highPerfPackage);
        expect(resultHigh.uxRoute).toBe("GUIDED_FLOW");
    });
});
