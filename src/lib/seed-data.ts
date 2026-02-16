
import { Service, Package, TechnicalFeature, ServiceItem, ServiceOption, DesignOption } from "./types";

// --- Technical Features ---
export const SEED_FEATURES: TechnicalFeature[] = [
    {
        id: "app_aware_routing",
        name: "Application Aware Routing",
        category: "SD-WAN",
        description: "Intelligently route traffic based on application type and real-time network conditions to ensure optimal performance for critical apps."
    },
    {
        id: "ngfw",
        name: "Next-Generation Firewall (NGFW)",
        category: "Security",
        description: "Deep packet inspection and application-level control to protect against sophisticated cyber threats."
    },
    {
        id: "auto_vpn",
        name: "Auto VPN",
        category: "Connectivity",
        description: "Automated site-to-site VPN creation to securely connect branches with minimal configuration."
    },
    {
        id: "poe_plus",
        name: "PoE+ Support",
        category: "Hardware",
        description: "Power over Ethernet Plus (802.3at) to power high-performance devices like IP phones and Wi-Fi 6 APs."
    },
    {
        id: "cloud_mgmt",
        name: "Cloud Management",
        category: "Management",
        description: "Centralized cloud-based dashboard for configuration, monitoring, and troubleshooting from anywhere."
    },
    {
        id: "lte_failover",
        name: "Cellular Failover",
        category: "Resiliency",
        description: "Automatic failover to 4G/LTE/5G cellular networks to maintain connectivity during wired link outages."
    },
    {
        id: "ids_ips",
        name: "IDS/IPS",
        category: "Security",
        description: "Intrusion Detection and Prevention Systems to monitor network traffic for suspicious activity and block attacks."
    },
    {
        id: "wifi_6",
        name: "Wi-Fi 6 (802.11ax)",
        category: "Wireless",
        description: "Latest Wi-Fi generation delivering higher throughput, lower latency, and better performance in dense environments."
    }
];

// --- Services ---

// Helper to create valid Service/Option/Design objects
const createDesignOption = (id: string, name: string, description: string, category?: string): DesignOption => ({
    id,
    name,
    short_description: description.substring(0, 50) + "...",
    detailed_description: description,
    category: category || "General",
    decision_driver: "Cost vs Performance",
    pros: ["Improved efficiency", "Scalable"],
    cons: ["Additional cost"],
    caveats: [],
    assumptions: [],
    supported_features: []
});

const createServiceOption = (id: string, name: string, description: string, designs: DesignOption[]): ServiceOption => ({
    id,
    name,
    short_description: description.substring(0, 50) + "...",
    detailed_description: description,
    design_options: designs,
    caveats: [],
    assumptions: [],
    supported_features: []
});

export const SEED_SERVICES: Service[] = [
    {
        id: "managed_sdwan",
        name: "Managed SD-WAN",
        active: true,
        short_description: "Comprehensive software-defined WAN solution for optimized performance, security, and simplified operations.",
        detailed_description: "A fully managed SD-WAN service that leverages diverse transport links (MPLS, Broadband, LTE) to intelligently route traffic. Includes centralized management, integrated security features, and 24/7 monitoring to ensure high availability and application performance across all branch locations.",
        metadata: { category: "Connectivity" },
        caveats: ["Requires compatible CPE hardware usage."],
        assumptions: ["Customer provides internet circuits unless bundled."],
        supported_features: ["app_aware_routing", "auto_vpn", "cloud_mgmt", "lte_failover"],
        service_options: [
            createServiceOption(
                "sdwan_standard",
                "Standard Tier",
                "Essential SD-WAN features for small branches. Includes application-based routing and basic firewalling.",
                [
                    createDesignOption("internet_breakout_local", "Local Internet Breakout", "Traffic destined for the internet exits directly from the branch router.", "Internet Breakout"),
                    createDesignOption("internet_breakout_datacenter", "Backhaul to DC", "Internet traffic is routed back to a central data center for inspection.", "Internet Breakout")
                ]
            ),
            createServiceOption(
                "sdwan_advanced",
                "Advanced Tier",
                "Enhanced SD-WAN for mission-critical sites. Includes advanced security (NGFW, IPS), cellular failover support, and prioritizing real-time voice/video traffic.",
                [
                    createDesignOption("ha_pair", "High Availability Pair", "Dual router configuration for hardware redundancy.", "Topology")
                ]
            )
        ]
    },
    {
        id: "managed_lan",
        name: "Managed LAN",
        active: true,
        short_description: "End-to-end management of wired local area networks, ensuring reliability, security, and performance.",
        detailed_description: "Our Managed LAN service provides complete lifecycle management of your switching infrastructure. We handle network design, switch configuration, port management, security patching, and ongoing monitoring to ensure seamless connectivity for all wired devices. Includes support for PoE+ devices and VLAN segmentation.",
        metadata: { category: "Managed Services" },
        caveats: [],
        assumptions: ["Cabling infrastructure is in place."],
        supported_features: ["poe_plus", "cloud_mgmt"],
        service_options: [
            createServiceOption(
                "lan_access",
                "Access Layer",
                "Connectivity for end-user devices (PCs, Phones, APs).",
                [
                    createDesignOption("poe_access", "PoE+ Access Switches", "Switches capable of powering devices like phones and APs.", "Hardware"),
                    createDesignOption("data_access", "Data-only Switching", "Standard connectivity for non-powered devices.", "Hardware")
                ]
            ),
            createServiceOption(
                "lan_core",
                "Core/Distribution",
                "High-performance switching for network aggregation and backbone connectivity.",
                []
            )
        ]
    },
    {
        id: "managed_wifi",
        name: "Managed Wi-Fi",
        active: true,
        short_description: "Secure, scalable, and high-performance wireless connectivity for employees and guests.",
        detailed_description: "Wi-Fi as a Service (WaaS) delivering ubiquitous wireless coverage. Includes RF planning, access point deployment, secure authentication (802.1x), guest portals, and proactive performance monitoring to eliminate dead zones and ensure optimal throughput.",
        metadata: { category: "Wireless" },
        caveats: [],
        assumptions: [],
        supported_features: ["wifi_6", "cloud_mgmt"],
        service_options: [
            createServiceOption(
                "wifi_indoor",
                "Indoor Coverage",
                "Standard Wi-Fi coverage for office environments.",
                []
            ),
            createServiceOption(
                "wifi_guest",
                "Guest Access",
                "Isolated network for visitor internet access with captive portal.",
                []
            )
        ]
    }
];


// --- Packages ---
export const SEED_PACKAGES: Package[] = [
    {
        id: "cost_centric",
        name: "Cost Centric",
        active: true,
        short_description: "Essential connectivity and security focused on affordability and value.",
        detailed_description: "The Cost Centric package is designed for lean organizations or smaller branch offices that require reliable connectivity without advanced enterprise features. It prioritizes cost-effective hardware (e.g., Meraki MX67, standard switches) and essential service levels. It provides a solid foundation for business operations with standard SD-WAN capabilities, basic security/firewalling, and cost-efficient internet breakout options, ensuring a low Total Cost of Ownership (TCO).",
        items: [
            // Example item: Managed SD-WAN - Standard Tier
            {
                service_id: "managed_sdwan",
                service_option_id: "sdwan_standard",
                design_option_id: "internet_breakout_local",
                enabled_features: [{ feature_id: "auto_vpn", inclusion_type: "standard" }],
                inclusion_type: "required"
            }
        ]
    },
    {
        id: "performance_focused",
        name: "Performance Focused",
        active: true,
        short_description: "High-throughput and redundant architecture for mission-critical applications.",
        detailed_description: "Tailored for locations with heavy data usage, real-time applications (VoIP, Video), or critical uptime requirements. This package leverages high-performance hardware, dual-wan links with sub-second failover, and Application Aware Routing to guarantee Quality of Experience (QoE). Includes High Availability (HA) configurations and advanced analytics for deep network visibility.",
        items: [
            {
                service_id: "managed_sdwan",
                service_option_id: "sdwan_advanced",
                design_option_id: "ha_pair",
                enabled_features: [{ feature_id: "app_aware_routing", inclusion_type: "standard" }],
                inclusion_type: "required"
            }
        ]
    },
    {
        id: "security_first",
        name: "Security First",
        active: true,
        short_description: "Zero Trust approach with advanced threat protection and compliant architecture.",
        detailed_description: "Provides the highest level of network security, integrating Next-Generation Firewall (NGFW), Intrusion Prevention (IPS), and advanced malware protection directly into the network fabric. Ideal for regulated industries or data-sensitive environments. Includes secure segmentation for IoT devices and encrypted site-to-site communications by default.",
        items: [
            {
                service_id: "managed_sdwan",
                service_option_id: "sdwan_advanced",
                enabled_features: [{ feature_id: "ngfw", inclusion_type: "standard" }, { feature_id: "ids_ips", inclusion_type: "standard" }],
                inclusion_type: "required"
            }
        ]
    }
];
