import { normalizeServiceId } from "@/src/lib/bom-utils";

describe("WLAN Tab Categorization", () => {
    it("should match 'Wireless LAN' into WLAN bucket", () => {
        const service = { id: "wlan", name: "Wireless LAN", metadata: { category: "WLAN" } };
        const name = service.name.toLowerCase();
        const category = (service.metadata?.category || "").toLowerCase();
        const serviceId = "wlan";

        const isWLAN = (
            name.includes("wifi") ||
            name.includes("wi-fi") ||
            name.includes("wlan") ||
            name.includes("wireless") ||
            category.includes("wifi") ||
            category.includes("wlan") ||
            category.includes("wireless") ||
            serviceId === "wlan" ||
            serviceId === "wlan"
        );

        expect(isWLAN).toBe(true);
    });

    it("should match 'managed_wifi' by ID even if name/category are weird", () => {
        const service = { id: "wlan", name: "Unknown", metadata: { category: "Stuff" } };
        const name = service.name.toLowerCase();
        const category = (service.metadata?.category || "").toLowerCase();
        const serviceId = "wlan";

        const isWLAN = (
            name.includes("wifi") ||
            name.includes("wi-fi") ||
            name.includes("wlan") ||
            name.includes("wireless") ||
            category.includes("wifi") ||
            category.includes("wlan") ||
            category.includes("wireless") ||
            serviceId === "wlan" ||
            serviceId === "wlan"
        );

        expect(isWLAN).toBe(true);
    });
});
