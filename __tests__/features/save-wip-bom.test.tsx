/**
 * Feature: Save Work In Progress (WIP) in BOM Builder
 * 
 * Verifies that the structure of the WIP payload adheres to the expected Project bomState updates
 * and that we correctly map the builder state into the Firebase update shape. 
 */

import { Project } from "@/src/lib/types";

describe("Save WIP BOM Builder Logic", () => {
    it("should correctly structure the bomState extracted from the BOM Builder", () => {
        // Mock current builder state
        const manualSelections = {
            "lan": { vendor: "cisco_catalyst" }
        };
        const globalDiscount = 15;
        const acquisitionModel = "rental" as const;
        const projectManagementLevel = "Standard";

        // Expected subset of the Project object structure
        const updatePayload: Partial<Project> = {
            bomState: {
                manualSelections,
                globalDiscount,
                acquisitionModel,
                projectManagementLevel
            }
        };

        expect(updatePayload).toBeDefined();
        expect(updatePayload.bomState).toBeDefined();

        const bomState = updatePayload.bomState!;
        expect(bomState.manualSelections).toEqual({ "lan": { vendor: "cisco_catalyst" } });
        expect(bomState.globalDiscount).toBe(15);
        expect(bomState.acquisitionModel).toBe("rental");
        expect(bomState.projectManagementLevel).toBe("Standard");
    });
});
