/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WANTab } from '@/src/app/sa/project/[id]/bom/WANTab';
import '@testing-library/jest-dom';

describe("Edge Device Dropdown Bug", () => {
    const mockSite: any = {
        name: "Test Site",
        bandwidthDownMbps: 200,
        bandwidthUpMbps: 50,
        userCount: 25,
        siteTypeId: "small_office"
    };

    const mockCatalog: any[] = [
        {
            id: "meraki_mx67",
            model: "MX67",
            vendor_id: "meraki",
            role: "WAN",
            primary_purpose: "SDWAN",
            specs: { vpn_throughput_mbps: 200 }
        },
        {
            id: "meraki_mx68",
            model: "MX68",
            vendor_id: "meraki",
            primary_purpose: "SDWAN, Security", // This should be included but is currently filtered out
            specs: { vpn_throughput_mbps: 400 }
        },
        {
            id: "meraki_mx250",
            model: "MX250",
            vendor_id: "meraki",
            primary_purpose: "SDWAN, Security", // This should be included but is currently filtered out
            specs: { vpn_throughput_mbps: 4000 }
        },
        {
            id: "ms120_24",
            model: "MS120-24",
            vendor_id: "meraki",
            primary_purpose: "LAN", // This should correctly be filtered out
            specs: { switching_capacity_gbps: 56 }
        }
    ];

    const defaultProps: any = {
        selectedSite: mockSite,
        siteTypes: [],
        handleSiteTypeChange: jest.fn(),
        manualSelections: {},
        setManualSelections: jest.fn(),
        catalog: mockCatalog,
        getVendorForService: () => "meraki",
        currentSDWANEquipment: mockCatalog[0],
        currentSDWANItem: { itemId: "meraki_mx67", quantity: 1, serviceId: "sdwan" },
        setSelectedSpecsItem: jest.fn(),
        utilization: 60,
        totalLoad: 120,
        pkg: null
    };

    it("should include multi-purpose devices like MX68 and MX250 in the dropdown", async () => {
        render(<WANTab {...defaultProps} />);

        // Find the "Auto-detect" button which is actually the trigger for ManualDeviceSelector
        const trigger = screen.getByRole('button', { name: /Auto-detect/i });
        expect(trigger).toBeInTheDocument();
        fireEvent.click(trigger);

        // Note: ManualDeviceSelector uses a Select component or similar. 
        // We need to check if those options are present in the 'catalog' filter logic 
        // that is passed to ManualDeviceSelector in WANTab.tsx.

        // Since WANTab.tsx filters the catalog before passing to ManualDeviceSelector:
        // .filter((e) => e.primary_purpose === "SDWAN")

        // We can verify this by checking the component's internal logic via props if we were testing the selector directly,
        // but since we are testing the integrated WANTab, we should look for the text in the document
        // after opening the selector, or check the DOM for hidden options if using a custom select.

        // These should now PASS because of the fix
        expect(screen.getAllByText("MX68").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("MX250").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("MX67").length).toBeGreaterThanOrEqual(1);
    });
});
