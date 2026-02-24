import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase/config";

// Category assignment rules - match by keywords in design option name
const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
    { keywords: ["hub", "spoke", "mesh", "full mesh", "topology"], category: "Topology" },
    { keywords: ["breakout", "local breakout", "smart breakout", "internet breakout", "vpn exclusion", "web optimization"], category: "Internet Breakout" },
    { keywords: ["east-west", "east west", "segmentation", "firewall", "ngfw", "security", "idps", "zero trust", "none"], category: "East-West Security" },
];

function inferCategory(name: string, existing?: string): string | undefined {
    if (existing && existing.trim() !== "") return existing; // Don't overwrite

    const lower = name.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some(kw => lower.includes(kw))) {
            return rule.category;
        }
    }
    return undefined;
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dry_run") !== "false";

    try {
        const servicesRef = collection(db, "services");
        const servicesSnap = await getDocs(servicesRef);

        const report: Array<{ service: string; option: string; designOption: string; oldCategory: string; newCategory: string }> = [];
        let updated = 0;

        for (const serviceDoc of servicesSnap.docs) {
            const service = serviceDoc.data();
            const serviceOptions = service.service_options || [];
            let serviceNeedsUpdate = false;

            const updatedOptions = serviceOptions.map((opt: { name: string; design_options?: Array<{ id: string; name: string; category?: string }> }) => {
                const updatedDesigns = (opt.design_options || []).map((dOpt: { id: string; name: string; category?: string }) => {
                    const inferred = inferCategory(dOpt.name, dOpt.category);
                    if (inferred && inferred !== dOpt.category) {
                        report.push({
                            service: service.name,
                            option: opt.name,
                            designOption: dOpt.name,
                            oldCategory: dOpt.category || "(none)",
                            newCategory: inferred,
                        });
                        serviceNeedsUpdate = true;
                        updated++;
                        return { ...dOpt, category: inferred };
                    }
                    return dOpt;
                });
                return { ...opt, design_options: updatedDesigns };
            });

            if (serviceNeedsUpdate && !dryRun) {
                await updateDoc(doc(db, "services", serviceDoc.id), {
                    service_options: updatedOptions,
                });
            }
        }

        return NextResponse.json({
            dry_run: dryRun,
            updated_design_options: updated,
            changes: report,
            message: dryRun
                ? `DRY RUN: Would update ${updated} design options. Run with ?dry_run=false to apply.`
                : `Successfully backfilled categories on ${updated} design options.`,
        });

    } catch (error) {
        console.error("Backfill error:", error);
        return NextResponse.json({ error: "Backfill failed", details: String(error) }, { status: 500 });
    }
}
