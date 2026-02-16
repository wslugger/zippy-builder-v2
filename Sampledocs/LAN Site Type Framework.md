# **LAN Site Type Framework & Technical Constraints**

This document defines the LAN-side architecture tiers for site deployments, focusing on switching topology, security segmentation, and access control.

## **1\. Enterprise Campus Tiers**

*Focus: Traditional hierarchical networking for high-density environments.*

### **3-Tier Campus (Core/Aggregation/Access)**

* **Role:** Large HQs or Regional Hubs with multiple buildings or floors.  
* **Architecture:** Dedicated Core switches (Layer 3), Aggregation layers, and Access closets.  
* **Technical Constraints:**  
  * **Spanning Tree Protocol (STP):** Must be tuned for rapid convergence (RSTP/MSTP).  
  * **Redundancy:** Dual-homed links from Access to Aggregation via LACP/MCLAG.  
  * **Throughput:** 40G/100G backbone with 1G/10G to the desk.  
  * **Constraint:** Enforce physical hardware stacking for management simplicity.

### **2-Tier Collapsed Core**

* **Role:** Medium offices or single-building sites.  
* **Architecture:** Combined Core/Aggregation layer directly feeding Access switches.  
* **Technical Constraints:**  
  * **L3 Routing:** Core switch handles all Inter-VLAN routing to offload the SD-WAN CPE.  
  * **PoE Budget:** High-density PoE+ (30W) or UPoE (60W) for modern Wi-Fi 6E APs.  
  * **Constraint:** Require SFP+ uplinks between layers.

## **2\. Hybrid & Integrated Tiers**

*Focus: Optimized footprints where dedicated distribution layers are not required.*

### **Stacked Edge (Horizontal Expansion)**

* **Role:** Sites needing high port density (2–3 switches) without the complexity of a 2-tier model.  
* **Architecture:** A single logical switch unit formed by 2 or 3 physical switches connected via stacking cables (Backplane stacking).  
* **Technical Constraints:**  
  * **Management:** Managed as a single IP entity (Stack Master).  
  * **High Availability:** Cross-stack EtherChannel (LACP) for uplinks to the SD-WAN router to ensure link redundancy.  
  * **Constraint:** Backplane stacking throughput must exceed total downlink capacity to prevent bottlenecks.  
  * **Constraint:** Require matching firmware versions across all stack members.

### **Integrated Branch (Router-Switch Module)**

* **Role:** Small or remote sites using internal switch modules (e.g., NIM or SM slots in a router).  
* **Architecture:** Switching logic is integrated directly into the SD-WAN CPE chassis.  
* **Technical Constraints:**  
  * **Internal Backplane:** Bandwidth limited by the router's internal bus (usually 1Gbps or 10Gbps aggregate).  
  * **Shared Resources:** CPU/Memory shared between routing and switching functions.  
  * **Constraint:** No physical stacking support (expansion requires a separate external switch).  
  * **Constraint:** Limited PoE budget based on the router's power supply capacity.

## **3\. Secure Access & Zero Trust Sites**

*Focus: Micro-segmentation and identity-based security.*

### **Secure Access Edge (SD-Access)**

* **Role:** Sites requiring high security and automated policy (e.g., Finance, R\&D).  
* **Architecture:** Fabric-based overlay (VXLAN) with identity-based segmentation.  
* **Technical Constraints:**  
  * **Identity Integration:** Integration with RADIUS/ISE for 802.1X port authentication.  
  * **Micro-segmentation:** Security Group Tags (SGT) or VRF-Lite to isolate traffic at the port level.  
  * **Constraint:** No Peer-to-Peer communication allowed between workstations unless explicitly permitted.

### **Restricted / Compliance Zone**

* **Role:** Retail (PCI-DSS), Healthcare (HIPAA), or Factory floors.  
* **Architecture:** Physically or logically air-gapped segments.  
* **Technical Constraints:**  
  * **MAC Filtering:** Sticky MAC or port-security enforced on all access ports.  
  * **VLAN Hardening:** Unused ports must be administratively shut down and moved to a "Blackhole" VLAN.  
  * **Constraint:** Enforce "No Local Breakout" for sensitive VLANs (all traffic must go to DC/CoLo for inspection).

## **4\. Lightweight & Remote Tiers**

*Focus: Cost-effective, simple connectivity.*

### **Flat Network (Layer 2 Only)**

* **Role:** Small branch or Retail shop.  
* **Architecture:** Single switch or unmanaged expansion.  
* **Technical Constraints:**  
  * **Gateway:** The SD-WAN CPE acts as the default gateway (VLAN interface).  
  * **DHCP:** Provided locally by the CPE or relayed to a central server.  
  * **Constraint:** Limited to \<3 VLANs (Data, Voice, Guest).

### **Industrial / IoT (OT)**

* **Role:** Warehouses, plants, or utility sites.  
* **Architecture:** DIN-rail mounted ruggedized switching.  
* **Technical Constraints:**  
  * **Protocol Support:** Must support industrial protocols (Modbus, Profinet).  
  * **Passive Cooling:** Hardware must be fanless to avoid dust intake.  
  * **Constraint:** NAT-per-port support for machine duplication (connecting identical machine IPs to the same network).

## **Summary of LAN Technical Constraints & UI Suggestions**

1. **PoE Awareness:** add a technical constraint to verify the total **PoE Budget** against the expected number of APs and VoIP phones.

2. **VLAN Scoping:** Small sites should have a "VLAN Limit" constraint to prevent configuration drift and unnecessary broadcast traffic.