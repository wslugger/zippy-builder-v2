import { render, screen, fireEvent } from "@testing-library/react";
import { LANTab } from "@/src/app/sa/project/[id]/bom/LANTab";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";

const mockSite = {
    id: "site-1",
    name: "Test Site",
    lanPorts: 10,
    poePorts: 5,
};

test("Add Switch Model button adds a switch to selections", () => {
    let manualSelections = {};
    const setManualSelections = (valOrFn) => {
        if (typeof valOrFn === 'function') {
            manualSelections = valOrFn(manualSelections);
        } else {
            manualSelections = valOrFn;
        }
    };
    
    const { rerender } = render(
        <LANTab
            selectedSite={mockSite}
            lanItems={[]}
            manualSelections={manualSelections}
            setManualSelections={setManualSelections}
            catalog={SEED_EQUIPMENT}
            setSelectedSpecsItem={() => {}}
            resolvedVendor="meraki"
            handleSiteUpdate={() => {}}
        />
    );

    const addButton = screen.getByText("Add Switch Model");
    fireEvent.click(addButton);

    // Expecting to see new state
    console.log("manualSelections after click:", manualSelections);
    expect(manualSelections["Test Site:lan"]).toBeDefined();
    expect(manualSelections["Test Site:lan"].length).toBe(1);
});
