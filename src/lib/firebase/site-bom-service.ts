import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./config";
import { Equipment, Service, EmbeddedEquipmentSnapshot, EmbeddedServiceSnapshot } from "../types";

export const SiteBOMService = {
    addEquipmentToSite: async (projectId: string, siteId: string, equipmentId: string) => {
        // 1. Fetch the master Equipment record
        const eqRef = doc(db, "equipment", equipmentId);
        const eqSnap = await getDoc(eqRef);
        if (!eqSnap.exists()) throw new Error(`Equipment not found: ${equipmentId}`);
        const equipment = eqSnap.data() as Equipment;

        // 2. Map to the snapshot
        const snapshot: EmbeddedEquipmentSnapshot = {
            id: equipment.id,
            model: equipment.model,
            vendor_id: equipment.vendor_id,
            specs_summary: {
                throughput: equipment.specs?.vpn_throughput_mbps ?? equipment.specs?.ngfw_throughput_mbps,
                ports: equipment.specs?.ports ?? equipment.specs?.wan_interfaces_count
            },
            addedAt: new Date().toISOString()
        };

        // 3. Append to the Site's denormalized array
        const siteRef = doc(db, "projects", projectId, "sites", siteId);
        await updateDoc(siteRef, {
            embeddedEquipment: arrayUnion(snapshot)
        });
    },

    addServiceToSite: async (projectId: string, siteId: string, serviceId: string) => {
        // 1. Fetch the master Service record
        const svcRef = doc(db, "services", serviceId);
        const svcSnap = await getDoc(svcRef);
        if (!svcSnap.exists()) throw new Error(`Service not found: ${serviceId}`);
        const service = svcSnap.data() as Service;

        // 2. Map to the snapshot
        const snapshot: EmbeddedServiceSnapshot = {
            id: service.id,
            name: service.name,
            category: service.metadata?.category,
            addedAt: new Date().toISOString()
        };

        // 3. Append to the Site's denormalized array
        const siteRef = doc(db, "projects", projectId, "sites", siteId);
        await updateDoc(siteRef, {
            embeddedServices: arrayUnion(snapshot)
        });
    }
};
