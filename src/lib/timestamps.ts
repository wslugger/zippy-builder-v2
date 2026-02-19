/**
 * Shared timestamp utility for the service layer.
 *
 * Call `stampCreate` when creating a new record (sets both createdAt and updatedAt).
 * Call `stampUpdate` on every save/update (only sets updatedAt, preserving createdAt).
 *
 * Both functions are generic so callers get back the same type they passed in,
 * with timestamps guaranteed to be present.
 */

export function stampCreate<T extends object>(record: T): T & { createdAt: string; updatedAt: string } {
    const now = new Date().toISOString();
    return { ...record, createdAt: now, updatedAt: now };
}

export function stampUpdate<T extends object>(record: T): T & { updatedAt: string } {
    return { ...record, updatedAt: new Date().toISOString() };
}

/**
 * Applies stampUpdate to an existing record.
 * If the record has no `createdAt`, it will also be set (backfill).
 */
export function applyTimestamps<T extends { createdAt?: string; updatedAt?: string }>(
    record: T
): T & { createdAt: string; updatedAt: string } {
    const now = new Date().toISOString();
    return {
        ...record,
        createdAt: record.createdAt ?? now,
        updatedAt: now,
    };
}
