/**
 * Cisco Global Price List CSV Parser
 *
 * Expected CSV format:
 *   Row 1:  "Global Price List - Effective : YYYY-MM-DD"  (or similar freeform text)
 *   Row N:  Header row containing "Product" and "Price in USD" (and optionally "End Of Sale Date")
 *   Row N+: Data rows
 *
 * Price strings like "$1,206.54" are sanitised to the number 1206.54.
 */

export interface PricingRow {
    /** Matches the equipment `model` / SKU field in Firestore */
    product: string;
    /** Sanitised list price in USD */
    listPrice: number;
    /** ISO date string from "End Of Sale Date" column, or null if not present */
    eosDate: string | null;
}

export interface ParsedPricingCSV {
    effectiveDate: string | null;
    rows: PricingRow[];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Parse a Cisco pricing CSV string into a typed list of pricing rows.
 * Returns null rows for entries where the price cannot be parsed (skipped silently).
 */
export function parsePricingCSV(csvContent: string): ParsedPricingCSV {
    const lines = csvContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) {
        return { effectiveDate: null, rows: [] };
    }

    // ── 1. Extract effective date from the first line ──────────────────
    const effectiveDate = extractEffectiveDate(lines[0]);

    // ── 2. Find the header row (contains "Product" and "Price") ────────
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]).map((c) => c.toLowerCase());
        if (cols.some((c) => c.includes('product')) && cols.some((c) => c.includes('price'))) {
            headerRowIndex = i;
            headers = cols;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn('[PricingParser] Could not locate a header row with "Product" and "Price" columns.');
        return { effectiveDate, rows: [] };
    }

    // ── 3. Map header indices ──────────────────────────────────────────
    const idxProduct = headers.findIndex((h) => h.includes('product'));
    const idxPrice = headers.findIndex((h) => h.includes('price'));
    const idxEosDate = headers.findIndex((h) => h.includes('end of sale') || h.includes('end-of-sale') || h.includes('eos'));

    // ── 4. Parse data rows ─────────────────────────────────────────────
    const rows: PricingRow[] = [];

    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= idxProduct || cols.length <= idxPrice) continue;

        const product = cols[idxProduct]?.trim();
        if (!product) continue;

        const listPrice = sanitisePrice(cols[idxPrice]);
        if (listPrice === null) continue; // skip rows without valid price

        const rawEos = idxEosDate !== -1 ? cols[idxEosDate]?.trim() : '';
        const eosDate = rawEos ? normaliseDate(rawEos) : null;

        rows.push({ product, listPrice, eosDate });
    }

    return { effectiveDate, rows };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Sanitise a currency string to a float.
 * "$1,206.54" → 1206.54  |  "1206.54" → 1206.54  |  "" → null
 */
export function sanitisePrice(raw: string): number | null {
    const cleaned = (raw || '').replace(/[$,\s]/g, '').trim();
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

/**
 * Extract the price list effective date from the first CSV row.
 * Handles patterns like:
 *   "Global Price List - Effective : 2024-01-15"
 *   "Effective Date: January 15 2024"
 */
function extractEffectiveDate(firstLine: string): string | null {
    // Try ISO format first (YYYY-MM-DD)
    const isoMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    // Try "Month DD YYYY" or "DD Month YYYY"
    const verboseMatch = firstLine.match(
        /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b[,\s]+\d{1,2}[,\s]+\d{4})/i
    );
    if (verboseMatch) {
        const d = new Date(verboseMatch[1]);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    return null;
}

/**
 * Attempt to normalise a freeform date string to ISO YYYY-MM-DD.
 * Returns the original string untouched if parsing fails.
 */
function normaliseDate(raw: string): string {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return raw; // fallback: keep original
}

/**
 * Simple CSV line parser that handles double-quoted fields (including embedded commas).
 * Reused pattern from csv-parser.ts.
 */
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
