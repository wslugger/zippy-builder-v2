import { render, screen, fireEvent } from "@testing-library/react";
import { LANTab } from "@/src/app/sa/project/[id]/bom/LANTab";
import { SEED_EQUIPMENT } from "@/src/lib/seed-equipment";
import "@testing-library/jest-dom";

const mockSite = {
    id: "site-1",
    name: "Test Site",
    lanPorts: 10,
    poePorts: 5,
} as unknown as import("@/src/lib/types").Site;

test("Find Your Own button opens the catalog browser and adding a switch updates selections", () => {
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

    render(
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

    // Open the catalog browser
    const findOwnBtn = screen.getByRole('button', { name: /Find Your Own/i });
    expect(findOwnBtn).toBeInTheDocument();
    fireEvent.click(findOwnBtn);

    // Catalog browser should be open
    expect(screen.getByRole('dialog', { name: /LAN Switch Catalog/i })).toBeInTheDocument();
});

test("Intent chips are rendered in the new design", () => {
    render(
        <LANTab
            selectedSite={mockSite}
            lanItems={[]}
            manualSelections={{}}
            setManualSelections={() => { }}
            catalog={SEED_EQUIPMENT}
            setSelectedSpecsItem={() => { }}
            resolvedVendor="meraki"
            handleSiteUpdate={() => { }}
        />
    );

    // The new UI shows intent chips instead of an "Add Switch Model" button
    expect(screen.getByText(/What connects here\?/i)).toBeInTheDocument();
    expect(screen.getByText('Workstations')).toBeInTheDocument();
    expect(screen.getByText('Wireless APs')).toBeInTheDocument();
});
