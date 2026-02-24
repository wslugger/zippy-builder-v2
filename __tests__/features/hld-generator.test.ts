import { generateHLDPayload } from "@/src/lib/hld-generator";
import { ProjectService, PackageService, ServiceService, SiteDefinitionService, FeatureService, EquipmentService, BOMService } from "@/src/lib/firebase";
import { getGlobalParameters } from "@/src/lib/firebase/settings";
import { getDocs } from "firebase/firestore";

// Mock dependencies
jest.mock("firebase/firestore", () => ({
    collection: jest.fn(),
    getDocs: jest.fn(),
}));

jest.mock("@/src/lib/firebase/config", () => ({
    db: {},
}));

jest.mock("@/src/lib/firebase", () => ({
    ProjectService: { getProject: jest.fn() },
    PackageService: { getPackageById: jest.fn(), getAllPackages: jest.fn(), savePackage: jest.fn(), deletePackage: jest.fn(), uploadCollateral: jest.fn(), deleteCollateral: jest.fn() },
    ServiceService: { getServiceById: jest.fn() },
    SiteDefinitionService: { getSiteDefinitionById: jest.fn() },
    FeatureService: { getFeatureById: jest.fn() },
    EquipmentService: { getAllEquipment: jest.fn() },
    BOMService: { getAllRules: jest.fn() }
}));

jest.mock("@/src/lib/firebase/settings", () => ({
    getGlobalParameters: jest.fn(),
}));

jest.mock("@/src/lib/bom-engine", () => ({
    calculateBOM: jest.fn().mockReturnValue({
        items: [],
        summary: { totalOneTimeCost: 100, totalMonthlyCost: 50, siteCount: 1 }
    }),
}));

describe("HLD Generator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("successfully generates HLD Payload", async () => {
        const mockProject = {
            id: "project123",
            name: "Test Project",
            customerName: "Acme Corp",
            selectedPackageId: "pkg1",
            customizedItems: [
                {
                    service_id: "svc1",
                    service_option_id: "opt1",
                    design_option_id: "dopt1",
                    enabled_features: [{ feature_id: "feat1", inclusion_type: "standard" }]
                }
            ]
        };

        const mockSites = [
            { id: "site1", name: "Site 1", siteTypeId: "type1", lanSiteTypeId: "type2" }
        ];

        const mockPackage = {
            id: "pkg1",
            short_description: "Awesome Package"
        };

        const mockService = {
            id: "svc1",
            name: "Service 1",
            short_description: "Desc 1",
            service_options: [
                {
                    id: "opt1",
                    name: "Option 1",
                    short_description: "Opt Desc 1",
                    design_options: [
                        { id: "dopt1", name: "Design Opt 1", short_description: "Design Desc 1" }
                    ]
                }
            ]
        };

        const mockSiteTypes = [
            { id: "type1", name: "Site Type 1", description: "Desc Type 1", defaults: { slo: 99.9 } },
            { id: "type2", name: "Site Type 2", description: "Desc Type 2", defaults: { slo: 99.99 } }
        ];

        const mockFeature = {
            id: "feat1",
            name: "Feature 1",
            description: "Feat Desc 1",
            assumptions: ["Assump 1"],
            caveats: ["Cav 1"]
        };

        (ProjectService.getProject as jest.Mock).mockResolvedValue(mockProject);
        (getDocs as jest.Mock).mockResolvedValue({
            docs: mockSites.map(s => ({ data: () => s, id: s.id }))
        });

        (PackageService.getPackageById as jest.Mock).mockResolvedValue(mockPackage);
        (ServiceService.getServiceById as jest.Mock).mockResolvedValue(mockService);
        (SiteDefinitionService.getSiteDefinitionById as jest.Mock).mockImplementation(async (id) =>
            mockSiteTypes.find(st => st.id === id)
        );
        (FeatureService.getFeatureById as jest.Mock).mockResolvedValue(mockFeature);
        (EquipmentService.getAllEquipment as jest.Mock).mockResolvedValue([]);
        (BOMService.getAllRules as jest.Mock).mockResolvedValue([]);
        (getGlobalParameters as jest.Mock).mockResolvedValue({});

        const payload = await generateHLDPayload("project123");

        expect(payload.projectName).toBe("Test Project");
        expect(payload.customerName).toBe("Acme Corp");
        expect(payload.executiveSummaryBasis.packageDescription).toBe("Awesome Package");

        // Check site types
        expect(payload.siteTypes).toHaveLength(2);
        expect(payload.siteTypes[0].name).toBe("Site Type 1");

        // Check services mapping
        expect(payload.servicesIncluded).toHaveLength(1);
        const svc = payload.servicesIncluded[0];
        expect(svc.name).toBe("Service 1");
        expect(svc.serviceOptions[0].name).toBe("Option 1");
        expect(svc.designOptions[0].name).toBe("Design Opt 1");

        // Check features mapping
        expect(payload.features).toHaveLength(1);
        expect(payload.features[0].name).toBe("Feature 1");

        // Check BOM summary
        expect(payload.bomSummary).toBeDefined();
        expect(payload.bomSummary?.totalOneTimeCost).toBe(100);
    });
});
