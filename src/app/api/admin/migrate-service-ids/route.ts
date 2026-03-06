import { NextResponse } from "next/server";
import {
    db,
    SERVICE_COLLECTION,
    PACKAGES_COLLECTION,
    FEATURES_COLLECTION,
    BOM_RULES_COLLECTION,
    SITE_DEFINITIONS_COLLECTION,
    PROJECTS_COLLECTION,
} from "@/src/lib/firebase/config";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * One-time migration: rename service IDs from legacy (managed_sdwan, managed_lan, managed_wifi)
 * to new canonical IDs (sdwan, lan, wlan) and update service display names.
 *
 * Also updates feature.category arrays from old service names to new names.
 *
 * POST /api/admin/migrate-service-ids
 */

const ID_MAP: Record<string, string> = {
    "managed_sdwan": "sdwan",
    "sd_wan_service": "sdwan",
    "managed_lan": "lan",
    "managed_wifi": "wlan",
    "managed_wlan": "wlan",
};

const NAME_MAP: Record<string, string> = {
    "Managed SD-WAN": "SD-WAN",
    "Managed LAN": "LAN",
    "Managed Wi-Fi": "Wireless LAN",
};

function migrateId(id: string): string {
    return ID_MAP[id] ?? id;
}

function migrateName(name: string): string {
    return NAME_MAP[name] ?? name;
}

export async function POST() {
    const changes: Record<string, unknown[]> = {
        services: [],
        packages: [],
        features: [],
        bomRules: [],
        siteDefinitions: [],
        projects: [],
    };

    try {
        // ── 1. Services ──
        const servicesSnap = await getDocs(collection(db, SERVICE_COLLECTION));
        for (const d of servicesSnap.docs) {
            const data = d.data();
            const newId = migrateId(d.id);
            const newName = migrateName(data.name as string);
            if (newId !== d.id || newName !== data.name) {
                const newData = { ...data, id: newId, name: newName };
                if (newId !== d.id) {
                    await setDoc(doc(db, SERVICE_COLLECTION, newId), newData);
                    await deleteDoc(doc(db, SERVICE_COLLECTION, d.id));
                } else {
                    await updateDoc(doc(db, SERVICE_COLLECTION, d.id), { name: newName });
                }
                changes.services.push({ from: d.id, to: newId, nameFrom: data.name, nameTo: newName });
            }
        }

        // ── 2. Packages ──
        const packagesSnap = await getDocs(collection(db, PACKAGES_COLLECTION));
        for (const d of packagesSnap.docs) {
            const data = d.data();
            const items = Array.isArray(data.items) ? data.items : [];
            const migratedItems = items.map((item: Record<string, unknown>) => ({
                ...item,
                service_id: migrateId(item.service_id as string),
            }));
            const changed = migratedItems.some((item: Record<string, unknown>, i: number) => item.service_id !== items[i].service_id);
            if (changed) {
                await updateDoc(doc(db, PACKAGES_COLLECTION, d.id), { items: migratedItems });
                changes.packages.push({ id: d.id });
            }
        }

        // ── 3. Features — update category arrays from old service names to new names ──
        const featuresSnap = await getDocs(collection(db, FEATURES_COLLECTION));
        for (const d of featuresSnap.docs) {
            const data = d.data();
            const cats: string[] = Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []);
            const migratedCats = cats.map(migrateName);
            if (migratedCats.some((c, i) => c !== cats[i])) {
                await updateDoc(doc(db, FEATURES_COLLECTION, d.id), { category: migratedCats });
                changes.features.push({ id: d.id, before: cats, after: migratedCats });
            }
        }

        // ── 4. BOM Rules — update serviceId values in JSON Logic conditions ──
        const bomRulesSnap = await getDocs(collection(db, BOM_RULES_COLLECTION));
        for (const d of bomRulesSnap.docs) {
            const raw = JSON.stringify(d.data());
            let migrated = raw;
            for (const [oldId, newId] of Object.entries(ID_MAP)) {
                migrated = migrated.replaceAll(`"${oldId}"`, `"${newId}"`);
            }
            if (migrated !== raw) {
                await updateDoc(doc(db, BOM_RULES_COLLECTION, d.id), JSON.parse(migrated));
                changes.bomRules.push({ id: d.id });
            }
        }

        // ── 5. Site Definitions — update requiredServices arrays ──
        const siteDefsSnap = await getDocs(collection(db, SITE_DEFINITIONS_COLLECTION));
        for (const d of siteDefsSnap.docs) {
            const data = d.data();
            const requiredServices: string[] = Array.isArray(data.defaults?.requiredServices)
                ? data.defaults.requiredServices
                : [];
            const migrated = requiredServices.map(migrateId);
            if (migrated.some((id, i) => id !== requiredServices[i])) {
                await updateDoc(doc(db, SITE_DEFINITIONS_COLLECTION, d.id), {
                    "defaults.requiredServices": migrated,
                });
                changes.siteDefinitions.push({ id: d.id, before: requiredServices, after: migrated });
            }
        }

        // ── 6. Projects — update customizedItems service_ids ──
        const projectsSnap = await getDocs(collection(db, PROJECTS_COLLECTION));
        for (const d of projectsSnap.docs) {
            const data = d.data();
            const customizedItems = Array.isArray(data.customizedItems) ? data.customizedItems : [];
            if (customizedItems.length === 0) continue;
            const migratedItems = customizedItems.map((item: Record<string, unknown>) => ({
                ...item,
                service_id: migrateId(item.service_id as string),
            }));
            const changed = migratedItems.some((item: Record<string, unknown>, i: number) => item.service_id !== customizedItems[i].service_id);
            if (changed) {
                await updateDoc(doc(db, PROJECTS_COLLECTION, d.id), { customizedItems: migratedItems });
                changes.projects.push({ id: d.id });
            }
        }

        return NextResponse.json({ success: true, changes });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
