# Firestore & Database Standards

These standards directly map to our lessons learned regarding database architecture and integrity.

- **Sub-collections & Security**: Sub-collections (e.g., `/customer_designs/{id}/versions`) do not automatically inherit parent permissions. Use `get()` in `firestore.rules` to verify parent document ownership.
- **Scaling History**: Store history (like versions) in Firestore sub-collections rather than large arrays within the main document to avoid hitting the 1MB document limit.
- **State Restoration**: When restoring a root document from a snapshot, always **strip metadata** (version numbers, separate IDs, snapshot dates) before the `updateDoc` call.
- **Finalize State & Data Integrity**: When a project is marked as `completed`, clone the full technical specifications of all used equipment into an `embeddedEquipment` array to decouple historical records from live catalog changes.
- **ID Safety (Slash-Safety Pattern)**: Never use IDs containing forward slashes (`/`) as Firestore document paths (e.g., `PWR-C6-600WAC/2`). Replace `/` with safety tokens (e.g., `_sl_`) for the document name, but preserve the original ID in the document body. Use a `getPricingDocId` helper or similar.
- **Stable IDs**: Rely on stable IDs for data matching. For example, when seeding data templates, use the Stable IDs of master catalog items so associations don't break when display names change.
