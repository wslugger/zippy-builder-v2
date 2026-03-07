import { render, screen, fireEvent } from "@testing-library/react";
import { LANTab } from "@/src/app/sa/project/[id]/bom/LANTab";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";

const mockSite = {
    id: "site-1",
    name: "Test Site",
    lanPorts: 10,
    poePorts: 5,
} as unknown as import("@/src/lib/types").Site;

test("Add Switch Model button adds a switch to selections", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let manualSelections: Record<string, any[]> = {};
    const setManualSelections = (valOrFn: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof valOrFn === 'function') {
            manualSelections = valOrFn(manualSelections);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            manualSelections = valOrFn as Record<string, any[]>;
        }
    };

    const { rerender } = render(
        <LANTab
            selectedSite={mockSite}
            lanItems={[]}
            manualSelections={manualSelections}
            setManualSelections={setManualSelections}
            catalog={SEED_EQUIPMENT}
            setSelectedSpecsItem={() => { }}
            resolvedVendor="meraki"
            handleSiteUpdate={() => { }}
        />
    );

    const addButton = screen.getByText("Add Switch Model");
    fireEvent.click(addButton);

    // Expecting to see new state
    console.log("manualSelections after click:", manualSelections);
    expect(manualSelections["Test Site:lan"]).toBeDefined();
    expect(manualSelections["Test Site:lan"].length).toBe(1);
});
