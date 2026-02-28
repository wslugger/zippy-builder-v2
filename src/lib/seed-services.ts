import { Service } from "./types";

export const SEED_SERVICES: Service[] = [
    {
        id: "managed_sdwan",
        name: "Managed SD-WAN",
        short_description: "Cloud-delivered overlay network.",
        detailed_description: "Intelligent path selection and centralized management.",
        active: true,
        caveats: [],
        assumptions: [],
        service_options: [],
        metadata: { category: "WAN" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "managed_lan",
        name: "Managed LAN",
        short_description: "High-performance switching.",
        detailed_description: "Enterprise-grade wired connectivity.",
        active: true,
        caveats: [],
        assumptions: [],
        service_options: [],
        metadata: { category: "LAN" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "managed_wifi",
        name: "Managed Wi-Fi",
        short_description: "Enterprise wireless coverage.",
        detailed_description: "High-density Wi-Fi 6 coverage for indoor and outdoor environments.",
        active: true,
        caveats: [],
        assumptions: [],
        service_options: [],
        metadata: { category: "WLAN" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];
