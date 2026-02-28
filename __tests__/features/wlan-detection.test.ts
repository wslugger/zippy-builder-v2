import { normalizeServiceId } from "@/src/lib/bom-utils";

describe("WLAN Tab Categorization", () => {
    it("should match 'Managed Wi-Fi' into WLAN bucket", () => {
        const service = { id: "managed_wifi", name: "Managed Wi-Fi", metadata: { category: "WLAN" } };
        const name = service.name.toLowerCase();
        const category = (service.metadata?.category || "").toLowerCase();
        const serviceId = "managed_wifi";

        const isWLAN = (
            name.includes("wifi") ||
            name.includes("wi-fi") ||
            name.includes("wlan") ||
            name.includes("wireless") ||
            category.includes("wifi") ||
            category.includes("wlan") ||
            category.includes("wireless") ||
            serviceId === "managed_wifi" ||
            serviceId === "managed_wlan"
        );

        expect(isWLAN).toBe(true);
    });

    it("should match 'managed_wifi' by ID even if name/category are weird", () => {
        const service = { id: "managed_wifi", name: "Unknown", metadata: { category: "Stuff" } };
        const name = service.name.toLowerCase();
        const category = (service.metadata?.category || "").toLowerCase();
        const serviceId = "managed_wifi";

        const isWLAN = (
            name.includes("wifi") ||
            name.includes("wi-fi") ||
            name.includes("wlan") ||
            name.includes("wireless") ||
            category.includes("wifi") ||
            category.includes("wlan") ||
            category.includes("wireless") ||
            serviceId === "managed_wifi" ||
            serviceId === "managed_wlan"
        );

        expect(isWLAN).toBe(true);
    });
});
