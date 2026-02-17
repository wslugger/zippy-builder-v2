import { Site, SiteSchema } from "./bom-types";

/**
 * Parses a CSV string into a list of Site objects.
 * Expects headers matching the Sampledocs/sample_site_list.csv format.
 */
export function parseSiteListCSV(csvContent: string): Site[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return []; // Header only or empty

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const sites: Site[] = [];

    // Helper to find index by partial match or exact match
    const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

    const idxName = getIndex(['site name']);
    const idxAddress = getIndex(['address']);
    const idxUsers = getIndex(['user count']);
    const idxBwDown = getIndex(['bandwidth down']);
    const idxBwUp = getIndex(['bandwidth up']);
    const idxRedundancy = getIndex(['redundancy']);
    const idxWanLinks = getIndex(['wan links']);
    const idxLanPorts = getIndex(['lan ports']);
    const idxPoePorts = getIndex(['poe ports']);
    const idxIndoorAPs = getIndex(['indoor aps']);
    const idxOutdoorAPs = getIndex(['outdoor aps']);
    const idxPriCircuit = getIndex(['primary circuit']);
    const idxSecCircuit = getIndex(['secondary circuit']);
    const idxNotes = getIndex(['notes']);

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length < headers.length) continue; // Skip malformed lines

        try {
            const parseNum = (val: string) => parseInt((val || "0").replace(/,/g, ''), 10);

            const site: Site = {
                name: row[idxName] || `Site ${i}`,
                address: row[idxAddress] || "",
                userCount: parseNum(row[idxUsers]),
                bandwidthDownMbps: parseNum(row[idxBwDown]),
                bandwidthUpMbps: parseNum(row[idxBwUp]),
                redundancyModel: row[idxRedundancy] || "Single CPE",
                wanLinks: parseNum(row[idxWanLinks] || "1"),
                lanPorts: parseNum(row[idxLanPorts]),
                poePorts: parseNum(row[idxPoePorts]),
                indoorAPs: parseNum(row[idxIndoorAPs]),
                outdoorAPs: parseNum(row[idxOutdoorAPs]),
                primaryCircuit: row[idxPriCircuit] || "Internet",
                secondaryCircuit: row[idxSecCircuit] || undefined,
                notes: row[idxNotes] || undefined
            };

            // Validate with Zod (optional, but good for type safety)
            SiteSchema.parse(site);
            sites.push(site);
        } catch (err) {
            console.warn(`Failed to parse row ${i}:`, err);
        }
    }

    return sites;
}

// Simple CSV line parser handling quotes
function parseCSVLine(text: string): string[] {
    const result: string[] = [];
    let curVal = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuote) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    curVal += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                curVal += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === ',') {
                result.push(curVal.trim());
                curVal = '';
            } else {
                curVal += char;
            }
        }
    }
    result.push(curVal.trim());
    return result;
}
