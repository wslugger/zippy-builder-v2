# Lessons Learned

## 1. Dynamic Metadata vs. Hardcoded Enums
**Issue**: Initial reliance on hardcoded TypeScript enums and constant arrays (e.g., `EQUIPMENT_PURPOSES`, `INTERFACE_TYPES`) led to rigidity. Adding a new interface type required code changes and deployments.
**Solution**: Implemented a **Metadata Management System** backed by Firestore. 
- **Key Insight**: Any attribute that might evolve (interface types, form factors, mounting options) should be driven by database content, not code.
- **Pattern**: Created a `useCatalogMetadata` hook that fetches configuration on load, falling back to constants only if the database is empty.

## 2. AI Ingestion Reliability
**Issue**: The "Gemini 2.5 Flash" model is powerful but occasionally hallucinates fields or formats json incorrectly if prompts are too open-ended.
**Solution**: 
- **Strict Schema Enforcement**: The prompt now includes the exact JSON structure and active metadata values (e.g., "Use only these Interface Types: [1GE, 10GE...]").
- **Vendor-Specific Context**: Splitting prompt instructions by vendor (Cisco vs. Meraki) significantly improved accuracy for vendor-specific terminology (e.g., "Forwarding rate" vs "Throughput").
- **Backend Proxy**: Moved ingestion from Client to Server Action (`/api/ingest`) to securely handle API keys and avoid CORS/browser extension interference.

## 3. Form Input Handling (Datalists vs. Selects)
**Issue**: HTML `<datalist>` elements provided a "hybrid" input (text + dropdown) but bewildered users when existing values weren't immediately visible upon focus. Custom values also created data consistency issues.
**Solution**: Migrated to **Managed Selects** with an explicit "Custom" option.
- **Key Insight**: For admin inputs, clarity and consistency (select from list) beat flexibility (type anything) 90% of the time. The "Custom" option bridging the two offers the best UX.

## 4. Hydration Mismatches
**Issue**: Browser extensions (like password managers or ad blockers) injecting attributes into the DOM caused Next.js hydration errors, specifically `data-jetski-tab-id`.
**Solution**: Added `suppressHydrationWarning` to the `<html>` and `<body>` tags in `layout.tsx`.
- **Lesson**: Modern web apps must be resilient to the user's browser environment, which is outside our control.

## 5. Build Infrastructure & Runners
**Issue**: Initially, build tasks and E2E tests were running on generic cloud runners, which were slow and lacked Apple Silicon optimization. 
**Solution**: Pivoted to a **Redundant Self-Hosted Runner Infrastructure**.
- **Decision**: Main production hosting stays on **Vercel**, but all CI/CD build and test tasks are now executed on local hardware (Mac Mini Primary, Ubuntu Backup).
- **Benefit**: Native performance for ARM64 builds, faster E2E execution, and resilience against runner availability issues.
- **Pattern**: Uses a dual-node GitHub Actions runner strategy with `fail-fast: false` to ensure build/test jobs succeed even if one node is offline.

## 6. Site Classification Precedence
**Issue**: The BOM engine initially prioritized "dirty" CSV import data (e.g., generic "Single CPE" redundancy) over explicitly selected Site Profiles (e.g., "Platinum" which mandates "Dual CPE"). This led to incorrect hardware suggestions that ignored organizational standards.
**Solution**: Inverted the precedence logic in `BOMEngine`.
- **Key Insight**: When a user selects a standardized profile (Site Type), that standard must be the single source of truth unless an explicit, intentional override is detected. Implicit or imported defaults should never downgrade a chosen standard.

## 7. Robust Catalog String Matching
**Issue**: Relying on exact string matches for catalog values (e.g., `redundancy === "Dual"`) caused failures when catalog descriptions evolved to be more user-friendly (e.g., "Dual CPE (HA)").
**Solution**: Implemented flexible, case-insensitive partial matching (e.g., `.includes("dual")`, `.includes("ha")`).
- **Lesson**: Internal logic should never be tightly coupled to cosmetic, human-readable strings. Tokenization or robust keyword matching is essential for long-term maintainability.

## 8. Resource Contention Fallbacks
**Issue**: Sites with extreme requirements (e.g., 20Gbps throughput) received *no suggestions* because no single device met the criteria, leading to a confusing "empty" state.
**Solution**: Implemented a "Best Effort" fallback strategy.
- **Key Insight**: It is better to suggest the highest-capacity available option with a clear warning ("Load exceeds capacity") than to fail silently. This empowers the user to make an informed decision (e.g., cluster multiple devices) rather than blocking their workflow.

## 9. Catalog Integrity & hardcoded Rules 
**Issue**: Hardcoded logic rules referenced database IDs (`meraki_c8455_g2_mx`) that did not exist in the active environment, causing silent failures.
**Solution**: Added defensive coding to gracefully handle missing catalog references and improved seed scripts to ensure critical high-end devices are always present.
- **Lesson**: Any code that references database content by ID must assume that content might be missing.

## 10. UI Consistency & Data Boundaries
**Issue**: The "BOM Pricing View" summary table showed hardware from ancillary/addon services (e.g., "Zippy Hybrid Broadband") that was intentionally invisible on the site-specific configuration tabs. This created a discrepancy where the project pricing total didn't match the sum of visible site-level hardware.
**Solution**:
- **Consolidated Filtering**: All project-level summary views must share a canonical set of "active" service IDs with the site-level tabs. In this project, Pricing only includes items from `managed_sdwan` and `managed_lan`.
- **Service ID Normalization**: Implemented `normalizeServiceId` at the UI bucketing boundary to ensure raw package IDs (e.g., `sd_wan_service`) consistently match canonical engine IDs (`managed_sdwan`) throughout the pipeline.
- **Conditional Generation**: Updated the BOM engine to skip hardware generation entirely if relevant endpoint counts (APs, users) are zero, even if the service is present in the package.
- **Visual Aggregation**: UI logic now collapses identical hardware models into a single line item per site, even if assigned by different services, to match standard pricing/BOM expectations.

## 11. Database Resilience & Model Name Sanitization
**Issue**: Hallucinated prompt configurations (e.g., `gemini-3.0-flash`) saved in the database caused fatal 404 errors during AI workflows, even after the code was updated to use valid IDs. Code defaults were being overridden by stale/invalid database values.
**Solution**:
- **Application-Level Sanitization**: Implemented a `sanitizeModelName` layer in the data service.
- **Key Insight**: Never trust that the database contains valid configuration IDs for external APIs. Logic should always include a mapping or validation layer that re-maps known invalid/stale values (e.g., `gemini-3.0-flash` → `gemini-2.5-flash`) before reaching the API client.
- **Result**: This strategy prevents breaking the UI for existing projects when backend models are deprecated or misconfigured.

## 12. Preserving Sort Order in UI and Document Payloads
**Issue**: Using `Array.from(new Set(...))` to extract unique values or fetching referenced items individually (e.g., via `getServiceById` in a loop) destroys the explicit sort order defined in the admin catalog. This caused services to appear in a random or ID-based order on the project summary page and within the generated High-Level Design (HLD) document sections.
**Solution**:
- **Iterative Filtering from Master List**: Instead of building a list from the referenced IDs, fetch the canonical, pre-sorted "master" list (e.g., `ServiceService.getAllServices()`) and filter it based on presence in the project.
- **Key Insight**: When order matters, the source of truth for the iteration must be the list that *owns* the order property. This applies to both UI rendering and backend-generated payloads (like the HLD generator).
- **Pattern**: 
  ```typescript
  // BAD: order is lost
  const services = await Promise.all(serviceIds.map(id => getServiceById(id)));
  
  // GOOD: order is preserved from the database/service layer
  const allServices = await ServiceService.getAllServices();
  const services = allServices.filter(s => serviceIds.has(s.id));
  ```

## 13. UI Hierarchy Alignment
**Issue**: Navigation menus and central landing pages (Hubs) often drift apart in organization as new features are added. This leads to friction where the top-nav expects a certain categorization (e.g., "Settings & Data") while the page central view uses a hybrid (e.g., "Data & Ingestion").
**Solution**:
- **Consistency by Design**: Refactored the Admin Hub layout to strictly mirror the Top Navigation dropdown categories. 
- **Rule**: Hub pages should serve as an "expanded" version of the navigation menu, providing better descriptions but maintaining the same logical grouping and hierarchy.
- **Verification**: Added automated tests to ensure critical entry points (like the Start Page "Admin" link) point to the consolidated Hub rather than individual sub-pages, centralizing the user's mental model.

## 14. Self-Hosted Redundancy and Recovery
**Issue**: A single self-hosted runner (e.g., an Ubuntu box) can become a bottleneck or a single point of failure if it runs out of disk space or loses connectivity.
**Solution**:
- **Dual-Node Strategy**: Deploy to both a Primary (ARM64 Mac Mini) and a Backup (x86 Ubuntu) simultaneously.
- **Matrix Deployments**: Use GitHub Actions matrix strategy to parallelize builds.
- **Maintenance**: Automated disk cleanup scripts and PM2 process monitoring are essential for "set and forget" local hosting.

## 15. Asynchronous Loading Race Conditions (E2E)
**Issue**: In complex Next.js dashboards, the "main" data (the Project) might load quickly, but secondary "architectural" data (the Catalog of Site Types) might still be fetching in the background. If the UI "Loading" state clears too early, E2E tests (Playwright) will attempt to interact with empty dropdowns, causing intermittent failures.
**Solution**:
- **Strict Loading State**: The loading boundary must include *all* critical data requirements for the page to be functional.
- **Pattern**: 
  ```tsx
  // Only stop loading when both project AND catalog are ready
  if (!project || siteTypes.length === 0) return <LoadingScreen />;
  ```
- **Benefit**: Removes "flakiness" from CI/CD pipelines and ensures a consistent first-render experience for users.

## 16. Progressive Disclosure & Contextual Integrity in Complex UIs
**Issue**: The BOM Pricing tab showed project-wide aggregate totals (global discount slider, hardware swap simulator, multi-site breakdown) alongside site-specific pricing. When a user had a specific site selected in the sidebar, the aggregated data created cognitive overload and broke the user's contextual mental model — they were thinking about *one site* but the UI was showing *all sites*.
**Solution**: Separated the BOM builder into two distinct views:
- **Micro-view** (`PricingTab`): Site-scoped, contextual, clean. Only shows pricing for the currently selected site.
- **Macro-view** (`GlobalPricingView`): Accessed via a dedicated "Project Overview" top-level button in the sidebar. Houses aggregates, discount simulation, hardware swap simulator, and integration endpoints.
- **Manual Circuit Pricing**: Moved to the WAN tab as inline $/mo inputs per circuit row, since it is inherently a per-site, per-circuit data entry concern — not a global pricing operation.
- **Key Insight**: The place where data *lives* (site-level vs. project-level) should dictate the view where it is *entered and displayed*. Mixing contextual scope in a single view creates hidden cognitive tax for power users who iteratively review many sites.
- **Pattern**: Use a sidebar navigation item to flip between micro and macro modes rather than cramming both into a single tab.

## 17. Dual-Axis Pricing & Management Matrix
**Issue**: Generating a BOM initially only accounted for one-time costs (Capex). Introducing Opex (MRC for Managed Services and Circuits) required dynamic item injection that wasn't present in the static hardware rules engine.
**Solution**:
- **Dynamic Item Injection**: Modified the `useBOMBuilder` hook to scan generated hardware and inject virtual "Managed Service" items based on a 3D pricing matrix (Purpose × Size × Level).
- **Service-Site Binding**: Injected circuit costs directly from site metadata into the BOM array to ensure total project Opex is captured.
- **Key Insight**: Complexity in "Managed" logic is best handled at the UI aggregation layer (after the core hardware engine runs) to keep the suggestion logic clean and focused on technical specs.
123: 
124: ## 18. Cost Type Granularity (OTC vs. MRC)
125: **Issue**: Combining hardware installation fees (OTC) and service subscriptions (MRC) into a single "Price" field obscured the true financial structure of a project, especially for circuits where installation is often a separate one-time charge.
126: **Solution**:
127: - **Breakout Infrastructure**: Explicitly split `price` into `unitOTC` and `unitMRC` throughout the BOM engine and state.
128: - **Manual Data Entry**: Added side-by-side $ inputs in the WAN tab for circuits to capture both One-time and Monthly recurring costs independently.
129: - **Visual Clarity**: Refactored all pricing tables (Site and Global) to remove the "Total Net" column and instead show independent "Net OTC" and "Net MRC" columns, ensuring stakeholders can clearly distinguish between up-front costs and ongoing revenue.
130: - **Lesson**: Financial transparency in quoting tools requires tracking cost types at the point of origin (manual entry or rule generation) rather than just aggregating at the point of display.

## 19. Schema Resilience & Metadata-Driven UI
**Issue**: Hardcoded enums in Zod schemas (e.g., `z.enum(VENDOR_IDS)`) caused application-wide crashes whenever an administrator added a new, valid value to the database that wasn't yet reflected in the source code.
**Solution**:
- **Relaxed Schema Validation**: Transitioned critical taxonomy fields from strict `z.enum()` to `z.string().catch()` or `.default()` patterns.
- **Unified Metadata Hook**: Created a central `useCatalogMetadata` hook as the single source of truth for all UI dropdowns and filters.
- **Visual Consistency**: Standardized input heights (48px) and implemented custom select styling to handle dynamic options gracefully.
- **Key Insight**: In a CMS-driven application, the codebase should provide the *structure* for data, but the *content* (and its validation) must be allowed to evolve dynamically in the database without requiring a redeployment of the entire frontend.
- **Benefit**: Admins can now add new Vendors, Interface Types, or Purposes through the database interface, and the application will automatically incorporate them into filters and modals without code changes.
## 20. Finalize State & Data Integrity
**Issue**: As the master equipment catalog evolves (e.g., price changes, model EOL), historical project BOMs would "drift" or become invalid if they re-queried the live catalog upon reopening. This breaks auditability for signed-off proposals.
**Solution**: Implemented a **Finalize & Snapshot** pattern.
- **Project Snapshotting**: When a project is marked as `completed`, the system clones the full technical specifications of all used equipment into an `embeddedEquipment` array within the project document.
- **Conditional Data Source**: The `useBOMBuilder` hook and HLD generator were updated to detect the `completed` status and switch their data source from the live catalog to the project's internal snapshot.
- **Key Insight**: Long-term reliability in quoting tools requires decoupling "current catalog" (for new designs) from "project record" (for historical compliance). A point-in-time capture of the technical spec is essential for accurate HLD and pricing reproduction years later.
- **Visual Locking**: Added "Locked Snapshot" banners and imagery to communicate to the user that they are viewing a permanent record, not a live-editable design.

## 21. Context-Specific UI for Hardware Roles
**Issue**: The Equipment Specifications modal was universally displaying VPN and Firewall throughput for all devices, which was irrelevant and confusing for LAN switches.
**Solution**: Conditional rendering based on Equipment Role.
- **Contextual Specs**: The modal now checks `item.role` and displays Power over Ethernet (PoE) specifications (Support, Standard, Power Budget) for LAN devices, while preserving VPN/Firewall performance metrics for WAN and Edge devices.
- **Key Insight**: Generic UI templates break down when dealing with diverse hardware catalogs. UIs must adapt to the *category* of the data they are presenting to ensure relevance and reduce cognitive noise for the user.

## 22. AI Triage & Dynamic Routing ("Extract & Evaluate")
**Issue**: Selected site requirements (users, sqft, customized needs) were being manually typed into CSVs, which is slow and error-prone. Hardcoded logic for routing sites was inflexible.
**Solution**: Implemented a "Schema as Data" AI Triage Pipeline.
- **Dynamic Prompting**: Admin-configurable `TriageCriterion` are injected into the Gemini prompt at runtime. This allows non-developers to add new extraction fields (e.g., "isOutdoor") and instructions without code changes.
- **Dual-Path UX Routing**: Sites are automatically classified into `FAST_TRACK` (automated generation) or `GUIDED_FLOW` (manual review requested) based on complexity and custom triggers.
- **Integrated Admin Editor**: Built a tool for admins to manage these rules with a "Paste JSON" accelerator for expert-level efficiency.
- **Key Insight**: Shifting from "parsing fixed columns" to "LLM-based feature extraction" allows the system to handle unstructured customer notes while maintaining structured downstream logic.
## 23. AI Triage & Dashboard Logic Alignment
**Issue**: The AI Triage modal correctly classified sites into `FAST_TRACK` vs. `GUIDED_FLOW`, but this classification was lost during the import to the main BOM Builder. The dashboard then used a naive "flagged" heuristic (missing profile) that ignored the AI's "Fast Track" status, causing a visual discrepancy where all imported sites appeared flagged.
**Solution**: 
- **Metadata Persistence**: Added `uxRoute` and `triageReason` to the core `Site` model.
- **Unified Logic**: Updated both the `ProjectSummaryDashboard` and the `SiteSidebar` to respect the AI's classification as the primary source of truth for "Flagged" status. 
- **Lesson**: Data boundaries between sub-features (like Triage vs. Builder) must explicitly pass and preserve critical "intent" metadata. Relying on re-calculating status from raw state (like missing profiles) often leads to inconsistent UI states.

## 24. Site Review Acknowledgment Workflow
**Issue**: Users needed a way to formally "resolve" flagged sites without necessarily fixing every warning (e.g., acknowledging a PoE budget slightly over but acceptable). Simple heuristics like "hide if configured" were insufficient for audit trails.
**Solution**:
- **Explicit State**: Introduced `isReviewed` as a persistent boolean on each site.
- **Unified Alerting**: Aggregated varied alert types (AI Flags, Missing Profiles, PoE Warnings) into a single "Action Required" list.
- **State Override**: Allowed the user to "Confirm Review," which changes the visual status (amber to green) and dismisses the dashboard flag, while still keeping the alert list visible as a "Review Acknowledged" summary for transparency.
- **Lesson**: Complex workflows with "warnings" vs "errors" benefit from an explicit "Reviewed/Acknowledged" state rather than trying to auto-derive resolution from other state changes.

## 25. Core Attribute Extraction in AI Triage
**Issue**: The AI Triage pipeline initially relied on the LLM to extract only high-level requirements (users, notes) while relying on UI defaults for core network attributes like circuits, bandwidth, and ports. This resulted in "TBD" values and missing secondary circuit data even when the source data explicitly contained them.
**Solution**:
- **Base Schema Hardening**: Updated the AI system prompt to explicitly request core attributes (`address`, `bandwidth`, `primaryCircuit`, `secondaryCircuit`, `redundancyModel`, `ports`, `APs`) in the mandatory JSON output.
- **Dynamic Property Mapping**: Implemented a case-insensitive mapping layer in the site import modal that prioritizes these AI-extracted fields, falling back to manual column parsing only if the AI fails.
- **Key Insight**: While LLMs are good at interpreting unstructured notes, explicitly defining "mandatory" extraction fields for core business logic prevents data loss and reduces the need for manual data entry after the import.
