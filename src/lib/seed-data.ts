import { Service, Package, TechnicalFeature, ServiceOption, DesignOption, CatalogMetadata } from "./types";
import { EQUIPMENT_PURPOSES, VENDOR_IDS, SERVICE_CATEGORIES, DESIGN_OPTION_CATEGORIES } from "./types";

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
    },
    {
        id: "dhcp",
        name: "DHCP",
        category: "Network Services",
        description: "Dynamic Host Configuration Protocol service for automatic IP address assignment."
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

const createServiceOption = (id: string, name: string, description: string, designs: DesignOption[], features?: string[]): ServiceOption => ({
    id,
    name,
    short_description: description.substring(0, 50) + "...",
    detailed_description: description,
    design_options: designs,
    caveats: [],
    assumptions: [],
    supported_features: features || []
});

export const SEED_SERVICES: Service[] = [


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
        throughput_basis: "vpn_throughput_mbps",
        items: [

            {
                service_id: "managed_lan", inclusion_type: "standard", enabled_features: [
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            },
            {
                service_id: "managed_wifi", inclusion_type: "optional", enabled_features: [
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            }
        ]
    },
    {
        id: "performance_focused",
        name: "Performance Focused",
        active: true,
        short_description: "High-throughput and redundant architecture for mission-critical applications.",
        detailed_description: "Tailored for locations with heavy data usage, real-time applications (VoIP, Video), or critical uptime requirements. This package leverages high-performance hardware, dual-wan links with sub-second failover, and Application Aware Routing to guarantee Quality of Experience (QoE). Includes High Availability (HA) configurations and advanced analytics for deep network visibility.",
        throughput_basis: "vpn_throughput_mbps",
        items: [

            {
                service_id: "managed_lan", inclusion_type: "required", enabled_features: [
                    { feature_id: "poe_plus", inclusion_type: "standard" },
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            },
            {
                service_id: "managed_wifi", inclusion_type: "standard", enabled_features: [
                    { feature_id: "wifi_6", inclusion_type: "standard" },
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            }
        ]
    },
    {
        id: "security_first",
        name: "Security First",
        active: true,
        short_description: "Zero Trust approach with advanced threat protection and compliant architecture.",
        detailed_description: "Provides the highest level of network security, integrating Next-Generation Firewall (NGFW), Intrusion Prevention (IPS), and advanced malware protection directly into the network fabric. Ideal for regulated industries or data-sensitive environments. Includes secure segmentation for IoT devices and encrypted site-to-site communications by default.",
        throughput_basis: "adv_sec_throughput_mbps",
        items: [

            {
                service_id: "managed_lan", inclusion_type: "standard", enabled_features: [
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            },
            {
                service_id: "managed_wifi", inclusion_type: "standard", enabled_features: [
                    { feature_id: "cloud_mgmt", inclusion_type: "standard" }
                ]
            }
        ]
    }
];

export const SEED_METADATA: CatalogMetadata[] = [
    {
        id: "equipment_catalog",
        fields: {
            purposes: {
                label: "Equipment Purposes",
                values: [...EQUIPMENT_PURPOSES]
            },
            vendors: {
                label: "Vendors",
                values: [...VENDOR_IDS]
            },
            statuses: {
                label: "Support Statuses",
                values: ["Supported", "In development", "Not supported"]
            },
            cellular_types: {
                label: "Cellular Generations",
                values: ["LTE", "5G", "LTE/5G"]
            },
            wifi_standards: {
                label: "Wi-Fi Standards",
                values: ["Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"]
            },
            mounting_options: {
                label: "Mounting Options",
                values: ["Rack", "Wall", "DIN Rail", "Desktop"]
            }
        }
    },
    {
        id: "service_catalog",
        fields: {
            service_categories: {
                label: "Service Categories",
                values: [...SERVICE_CATEGORIES]
            },
            design_option_categories: {
                label: "Design Option Categories",
                values: [...DESIGN_OPTION_CATEGORIES]
            }
        }
    },
    {
        id: "feature_catalog",
        fields: {
            feature_categories: {
                label: "Feature Categories",
                values: [
                    "Routing",
                    "Security",
                    "Management",
                    "SD-WAN",
                    "High Availability",
                    "Cloud Integration",
                    "Monitoring",
                    "Performance",
                    "QoS"
                ]
            }
        }
    }
];
