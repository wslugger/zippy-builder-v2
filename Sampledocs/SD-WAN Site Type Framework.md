# **SD-WAN Site Type Framework & Technical Constraints**

This document defines a comprehensive list of Site Types for SD-WAN deployment, detailing the specific technical constraints and logic required for each profile.

## **1\. Infrastructure & Core Sites**

*Focus: High availability, transit, and backbone reliability.*

### **Data Center (DC)**

* **Role:** Centralized application hosting and primary hub.  
* **CPE Redundancy:** Dual (Active/Active HA).  
* **Circuits:** Multi (3+) \- Typically Dual Fiber \+ Private Line (MPLS/P2P).  
* **Technical Constraints:**  
  * **BGP Peer Isolation:** Must support multiple BGP neighbors for route propagation.  
  * **Throughput Floor:** Minimum 2Gbps encrypted throughput.  
  * **LAN Side:** High-speed 10Gbps SFP+ handoffs required.  
  * **Constraint:** Enforce "Full Mesh" topology role.

### **Colocation (CoLo)**

* **Role:** Cloud on-ramp and regional traffic transit.  
* **CPE Redundancy:** Dual (Active/Active HA).  
* **Circuits:** Dual Fiber \+ Direct Cross-Connect.  
* **Technical Constraints:**  
  * **Cross-Connect Support:** Interface must support specific VLAN tagging for Cloud Exchange (e.g., Equinix Fabric).  
  * **Jumbo Frames:** MTU adjustment (9000) support for high-speed data replication.  
  * **Constraint:** Regional Hub status (Acts as a gateway for nearby branches).

### **Regional HQ**

* **Role:** High-density user environment with local services.  
* **CPE Redundancy:** Dual (Active/Standby or Active/Active).  
* **Circuits:** Dual Fiber (Diverse paths).  
* **Technical Constraints:**  
  * **Local Breakout (DIA):** Direct Internet Access allowed for SaaS (O365/Zoom) to reduce latency.  
  * **Constraint:** Integrated PoE support for local APs/Phones if the CPE acts as a switch.

## **2\. Cloud & Virtual Sites**

*Focus: Software-defined endpoints within public/private cloud environments.*

### **Cloud Instance (vCPE)**

* **Role:** Connecting VPCs/VNets directly to the SD-WAN fabric.  
* **CPE Redundancy:** Virtual HA (Deployed across Availability Zones).  
* **Circuits:** Virtual \- Internet Gateway (IGW) or ExpressRoute/DirectConnect.  
* **Technical Constraints:**  
  * **Cloud Orchestration:** Must support API-based deployment (Terraform/CloudFormation).  
  * **User-Defined Routes (UDR):** Automatically update cloud routing tables to point to the vCPE as the next hop.  
  * **Throughput Scaling:** Licensed based on virtual CPU (vCPU) count rather than physical port speed.  
  * **Constraint:** Support for Source/Dest Check disabling (required for cloud routing).  
  * **Constraint:** Integration with Cloud Native Load Balancers.

## **3\. Standard Branch Tiers**

*Focus: Cost-balancing scale with performance.*

### **Large Office (200+ Users)**

* **Role:** Significant branch operations.  
* **CPE Redundancy:** Dual CPE.  
* **Circuits:** Dual (1x Fiber, 1x High-speed Broadband).  
* **Technical Constraints:**  
  * **SD-WAN Path Steering:** Dynamic steering based on packet loss/jitter thresholds.  
  * **Constraint:** Enforce SD-WAN (Cannot fall back to simple routing).  
  * **Constraint:** Support for at least 500 concurrent VPN tunnels.

### **Medium Office (50–200 Users)**

* **Role:** Typical branch office.  
* **CPE Redundancy:** Single or Dual (Optional).  
* **Circuits:** Dual (1x Broadband, 1x LTE/5G Backup).  
* **Technical Constraints:**  
  * **SaaS Optimization:** Local DNS caching to speed up web applications.  
  * **Constraint:** Require LTE/5G Option as a secondary/tertiary link.  
  * **Constraint:** Automated failover within \<3 seconds.

### **Small Office / Retail (\<50 Users)**

* **Role:** Lean operations, kiosks, or small shops.  
* **CPE Redundancy:** Single CPE.  
* **Circuits:** Single (Broadband) \+ LTE/5G.  
* **Technical Constraints:**  
  * **Zero-Touch Provisioning (ZTP):** Must be deployable without a local technician.  
  * **Guest Wi-Fi Isolation:** Physical or Logical (VLAN) separation of Guest traffic.  
  * **Constraint:** Usage-based LTE capping (to prevent overage costs on backup links).

## **4\. Specialized Edge Profiles**

*Focus: Unique connectivity requirements.*

### **Micro-Branch / SOHO**

* **Role:** Executive home office or temporary pop-up.  
* **CPE Redundancy:** Single (Small form factor).  
* **Circuits:** Single Broadband \+ LTE.  
* **Technical Constraints:**  
  * **Fanless Design:** Hardware constraint for home environments.  
  * **Split-Tunneling:** Only business traffic sent over VPN; personal traffic remains local.  
  * **Constraint:** Enforce "Hub and Spoke" only (No branch-to-branch mesh).

### **Mobile / Vehicular**

* **Role:** Emergency services, clinics, or field units.  
* **CPE Redundancy:** Single (Ruggedized).  
* **Circuits:** Dual LTE/5G (Different carriers, e.g., AT\&T \+ Verizon).  
* **Technical Constraints:**  
  * **GPS Tracking:** Integration for real-time fleet location via SD-WAN controller.  
  * **Ignition Sensing:** Hardware must support power-off delays based on vehicle status.  
  * **Constraint:** Require Dual-SIM hardware.

## **Summary of Logic Gaps & UI Suggestions**

1. **Hardware Guardrails:** If "Data Center" is selected, the UI should prevent the user from selecting "Single CPE."  
2. **Carrier Diversity Constraint:** For HQ/DC, add a check to ensure the two WAN circuits are not from the same ISP (Circuit ID validation).  
3. **MTU Auto-Discovery:** A constraint for CoLo/DC sites to automatically test for Jumbo Frame support feature and on WAN circuits.