# Lessons Learned

## 0. Service ID Normalization & Merging
**Issue**: When external branches introduced new UI components that relied on legacy service IDs or un-normalized service ID strings (e.g. `managed_lan` vs `lan`), it caused entire sections of the BOM builder (like the LAN Tab) to disappear due to mismatches in tab categorization. 
**Solution**:
- **Centralized Normalization**: Implemented a robust `normalizeServiceId` function in `bom-utils.ts` and forced all BOM logic and UI tab aggregators to use canonical IDs (`sdwan`, `lan`, `wlan`).
- **Consistent Selection Keys**: Created `getSelectionKey(site, service)` to guarantee that manual selections made by users are tied to a normalized string (ignoring whitespace and casing variations).
- **Graceful Merging**: When bringing in new component code (like `LANIntentCollector`), it is critical to adapt the incoming code to use `getSelectionKey` rather than reverting the state handling back to un-normalized strings.

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

## 45. Initial Scope Selection to Direct User Journeys
**Issue**: Users (SAs) were being dropped immediately into a complex "Package Selection" flow even if they were only trying to add a single site or service to an existing network. This created unnecessary cognitive load for simple tasks.
**Solution**:
- **High-Level Interstitial**: Introduced an initial "Project Scope" step at the very beginning of the project creation process.
- **Dynamic Branching**: The selection (Complete Network vs. Individual Sites & Additional Services) acts as a router. Architecture-heavy projects proceed to Package Selection, while individual additions route to a streamlined (placeholder) workflow.
- **Key Insight**: One-size-fits-all workflows inevitably become bloated. Implementing a "choice point" at the start allows the system to switch between "Comprehensive" and "Fast-Track" modes, ensuring the UI density matches the user's intent.
- **Technical Alignment**: Updated all global navigation and progress bar logic to support dynamic 1-based indexing, ensuring Step 1 reflects the actual first user interaction.

## 18. Cost Type Granularity (OTC vs. MRC)
**Issue**: Combining hardware installation fees (OTC) and service subscriptions (MRC) into a single "Price" field obscured the true financial structure of a project, especially for circuits where installation is often a separate one-time charge.
**Solution**:
- **Breakout Infrastructure**: Explicitly split `price` into `unitOTC` and `unitMRC` throughout the BOM engine and state.
- **Manual Data Entry**: Added side-by-side $ inputs in the WAN tab for circuits to capture both One-time and Monthly recurring costs independently.
- **Visual Clarity**: Refactored all pricing tables (Site and Global) to remove the "Total Net" column and instead show independent "Net OTC" and "Net MRC" columns, ensuring stakeholders can clearly distinguish between up-front costs and ongoing revenue.
- **Lesson**: Financial transparency in quoting tools requires tracking cost types at the point of origin (manual entry or rule generation) rather than just aggregating at the point of display.

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
## 26. Grouping Complex Configuration Options
**Issue**: Long, flat lists of configuration options (e.g., in the Design Documentation or Features page) became difficult for users to navigate as the system grew.
**Solution**: Implemented **Category-Based Grouping**.
- **Schema Update**: Added a `category` field to the design options metadata.
- **UI Refactoring**: Updated components to pre-process flat lists into grouped structures (e.g., `Record<string, Option[]>`) before rendering.
- **Key Insight**: Grouping data by logical categories (Topology, Security, etc.) significantly reduces cognitive load and allows the UI to use header-based navigation, making complex configuration flows feel more manageable.

## 27. AI Extraction Property Name and Label Discrepancies
**Issue**: When extracting data via an LLM (like Gemini) into a structured system, the LLM may output JSON keys differently than the target schema expects (e.g., `wifi_standard` vs. `wifiStandard`), or different equipment roles might use the same physical layout for completely different metrics (e.g., "PoE Budget" for LAN switches vs. "Power Draw" for WLAN access points). This causes UI components to display "Unknown" or incorrect static text like "0W".
**Solution**:
- **Tolerant Data Binding**: UI components consuming AI-extracted data should intelligently fall back across expected variations of a property name (`item.specs.wifi_standard || item.specs.wifiStandard`).
- **Contextual Labelling**: Render labels dynamically based on the object's context/role, not just blindly reusing the same layout block. "PoE Budget" only makes sense for LAN; shift to "Power Draw" for WLAN while reading from the correct underlying extracted value.
- **Key Insight**: AI pipelines are occasionally loose with snake_case vs camelCase unless heavily enforced. The consuming UI mapping layer must be defensively coded to handle slight deviations in property names and use contextual labels so users don't think the extraction failed.
## 28. Robust LAN Equipment Selection & Reasoning
**Issue**: The BOM engine's LAN hardware selection was inconsistently falling back to "Best Effort" and displaying irrelevant WAN throughput metrics (e.g., "SDWANCRYPTOTHROUGHPUTMBPS=48 Mbps") instead of switch specifications.
**Solution**:
- **Normalized Spec Comparison**: Implemented `normalizePortSpeed()` and `portSpeedMatches()` to handle variations in database strings (e.g., matching '1G' with '1G-Copper').
- **Role-Aware Reasoning**: Refactored the reasoning generator to be context-sensitive. LAN equipment now correctly displays port counts, PoE standards, and uplink types instead of WAN throughput.
- **PoE Hierarchy Logic**: Used a numerical hierarchy for PoE standards to allow "meets or exceeds" logic (e.g., a PoE++ switch correctly satisfies a PoE+ requirement).
- **Key Insight**: Deep spec filtering depends on perfect data alignment. When data comes from external catalogs or AI extraction, the comparison logic must be "fuzzy" and normalizing to prevent false negatives that trigger unintended fallbacks.

## 29. Falsy Check Pitfalls with Numerical 0 Values
**Issue**: In the Equipment Catalog, the `poe_budget` attribute was hiding when the value was `0` because of a truthy check (`data.poeBudgetWatts || data.poe_budget`). This prevented users from seeing "0W" for non-PoE or specifically zero-budget switches.
**Solution**:
- **Strict Equality Checks**: Refactored the UI to use `!== undefined` or nullish coalescing `??` for numeric display values.
- **Normalized Property Binding**: Consolidated UI inputs to bind primarily to the canonical `poe_budget` property while maintaining `poeBudgetWatts` as a legacy fallback.
- **Key Insight**: Never use OR (`||`) logic for rendering numbers that can validly be `0`. Always use nullish coalescing or explicit undefined checks to ensure data presence is correctly interpreted.

## 30. Auto-Sizing Fragility vs. Manual SA Selection (LAN)
**Issue**: The backend engine attempted to automatically size LAN switches based on site parameters (user count, AP count, PoE requirements). This math was fragile, often resulted in "Best Effort" fallbacks, and frustrated Sales Associates (SAs) who wanted explicit control over which switch models to pitch.
**Solution**:
- **Gutted Auto-Sizing**: Removed complex math for port packing, PoE requirement matching, and uplink speed normalization from the BOM engine.
- **Enforced Manual UI Selection**: Shifted the LAN tab to a "Rich Switch Selector" that surfaces critical attributes (Vendor, Model, Ports, PoE Budget) to the SA, making them responsible for the explicit hardware choice.
- **Key Insight**: While automation is great for baseline initial setups, for complex or highly variable physical configurations (like LAN topologies), empowering the human expert (SA) with clear data (manual selection) in a clean UI provides better outcomes and significantly simpler, less buggy code than trying to mathematically codify every port-packing edge case.

## 31. Parent-Child Prop Synchronization
**Issue**: Refactoring a component's interface (e.g., removing props from `LANTabProps`) without updating all parent callers leads to silent TypeScript failures in IDEs that might not be caught until a full production build (`next build`).
**Solution**:
- **Strict Build Enforcement**: Ensure `next build` (which runs `tsc`) is part of the local verification pipeline.
- **Global Search for Callers**: When changing a component's prop signature, always perform a global search for the component name to update all instances where it is instantiated.
- **Key Insight**: TypeScript successfully flags these errors, but they can be missed if the developer is only viewing the modified file. Continuous integration or frequent local full-builds are essential to catch these "orphan props" before they reach deployment.

## 32. Conditional Rendering for Optional Equipment Specs
**Issue**: Complex boolean logic for rendering hardware specifications (like PoE Budget) became unreadable and error-prone when forced entirely onto a single line `{(item as any).specs.poeStandard && ... ? ... : ...}` in the JSX, leading to bugs where valid, non-zero budgets were hidden if an optional standard string was missing.
**Solution**:
- **Variable Extraction**: Pulled complex condition calculations (`const poeBudget = ...`, `const hasPoe = ...`) out of the JSX return block and into the component body.
- **Simplified Ternary**: Used the clean, descriptive booleans inside the JSX rendering (`{hasPoe ? \`\${poeBudget} W\` : None}`).
- **Key Insight**: JSX should remain declarative and simple. Any data massaging or complex presence checks should happen before the `return` statement to enhance readability and prevent nested ternary bugs.

## 33. Consolidating Redundant Equipment Attributes
**Issue**: Having multiple fields representing the same semantic information (e.g., `poeStandard` and `poe_capabilities`) across different equipment schemas (LAN vs WAN) led to redundant UI inputs and confusion in the BOM data processing logic.
**Solution**:
- **Normalized Schema**: Deprecated the specific `poeStandard` field in favor of the more universally used `poe_capabilities` across all equipment types in the internal schemas.
- **Unified UI Input**: Replaced static dropdowns that mapped to deprecated fields with versatile text inputs mapped to the canonical field (`poe_capabilities`), ensuring consistency.
- **Key Insight**: When evolving database models, redundant fields must be forcefully consolidated. Keeping both "just in case" fractures the data mapping and creates persistent technical debt across querying, UI, and ML-extraction layers.
## 34. Supporting Multi-Select Equipment & Policy Overrides
**Issue**: Initial LAN switch selection was restricted to a single model per site. This didn't account for complex site designs (e.g., needing both a high-port core switch and a smaller PoE edge switch) or scenarios where a user intentionally wanted to select non-PoE hardware despite the site having PoE requirements (e.g., for a non-PoE management segment).
**Solution**:
- **Array-Based State Management**: Refactored `manualSelections['managed_lan']` from a single string/object to an `Array<{itemId: string, quantity: number}>`. 
- **Backward Compatibility Layer**: Implemented a normalization utility (`useMemo` in UI, `Array.isArray` check in `bom-engine.ts`) to seamlessly handle legacy single-selection data while enabling the new multi-select UI.
- **Policy Override Toggle**: Introduced an "Override PoE Enforce" toggle that bypasses the site-requirement filtering logic in the catalog dropdown.
- **Key Insight**: Rules engines should provide smart defaults and helpful filters (like PoE enforcement), but they must never *block* the expert user. Providing a clear "Override" path preserves the value of the guardrails while allowing for edge-case flexibility.
- **Pattern**: Use a `useMemo` hook to normalize potentially polymorphic-state values (string, object, or array) into a single canonical format for the rendering logic to consume.

## 35. E2E Test Flow Robustness Against New Interstitial UI
**Issue**: A Playwright E2E test designed to trace the critical path (Upload CSV -> Classify -> Generate BOM) failed consistently after a new feature (AI Triage Pipeline) introduced an intermediate "Completion Modal" before navigating to the BOM. The test timed out waiting for an element that would only render after a user clicked "Continue".
**Solution**:
- **Test-UI Synchronization**: Always update the core E2E smoke tests immediately alongside any PR that introduces new interstitial modals or blocking dialogs in the happy path.
- **Explicit Waits and Action Triggers**: Updated the Playwright test to explicitly look for the new modal (`await expect(page.getByText('AI Triage Complete')).toBeVisible()`) and click the appropriate continuation button before asserting the final page state.
- **Key Insight**: Automated "happy path" tests are brittle to UX improvements. Introducing a new step (even a helpful summary modal) breaks the automation assumption. E2E tests should be treated as living documentation of the *current* exact user flow, not just abstract technical checkpoints.

## 36. Robust WLAN Tab Detection & Failsafe Logic
**Issue**: The WLAN tab was frequently missing from the BOM Builder due to inconsistent service naming (e.g., "WiFi" vs "Wi-Fi" vs "Wireless") or because the specific `managed_wifi` service was omitted from a package, even though the site data explicitly required APs.
**Solution**: 
- **Multi-Layered Keyword Matching**: Implemented case-insensitive regex for `wifi`, `wi-fi`, `wlan`, and `wireless` across both Service Names and Categories.
- **Data-Driven Failsafe**: Added a logic check in `availableTabs` that forces the WLAN tab to appear if *any* site in the project has a non-zero count for `indoorAPs` or `outdoorAPs`, regardless of the package configuration.
- **Key Insight**: UI navigation should be driven by the *user's data* (site requirements) first, and the *product catalog* (package contents) second. If a user defines a requirement, the UI must provide the path to fulfill it, even if the service categorization is ambiguous.

## 37. Contextual Specification Mapping for AI-Extracted Hardware
**Issue**: The generic "Specs Modal" showed irrelevant metrics (like WAN throughput) for WLAN access points and lacked critical LAN details like port types or stackability. Additionally, the coverage visual was ignoring automatically-added items, showing "0 prov" despite APs being in the BOM.
**Solution**:
- **Role-Based Modal Refactoring**: Dynamically reorganized the `SpecsModal` into a 2-column layout that shifts its fields based on `item.role`. WLAN now shows Standard/MIMO/Environment, while LAN shows Access/Uplink port types and PoE standards.
- **BOM-Driven Visual Summaries**: Updated the AP coverage calculation to pull "provided" counts directly from the `wlanItems` (actual BOM line items) instead of just the manual `selections` (local overrides).
- **Key Insight**: Visual summaries and technical specs must be tightly coupled to the final *compiled* BOM output, not just the user's manual inputs. If the engine adds hardware via rules, the UI must treat those items as first-class residents in all coverage and detail views.

## 38. Environment-Specific Hardware Filtering & Dynamic Seed Merging
**Issue**: Separating the AP selection into "Indoor" and "Outdoor" blocks introduced a rigid dependency on the database catalog accurately reflecting those specialized tags. If a vendor had no outdoor models synced in the live database, the "Add Outdoor AP" button failed silently because its filtered list was empty, completely confusing the user.
**Solution**:
- **Graceful Degradation**: Buttons now explicitly check their filtered lists (`availableOutdoorAPs.length === 0`) and disable themselves with a clear reason ("No Outdoor Models Available") instead of failing to render a dropdown.

## 39. AI Rule Generation & Auto-Anchoring (Rule Copilot)
**Issue**: Using natural language to generate technical logic rules (e.g., "users > 100") via LLMs often resulted in technically valid but contextually "orphaned" rules. The AI would output the logic requested by the user, but omit mandatory system filters (like `serviceId === 'managed_lan'`), causing the rules to disappear from the categorized Admin UI or apply to the wrong services.
**Solution**:
- **Human-in-the-loop Verification**: Implemented a two-step "Generate -> Verify -> Accept" workflow. The AI suggestion is presented in a "Verification Card" with a human translation and raw JSON before it ever touches the form state.
- **Auto-Anchoring Context**: Added a logic layer in the frontend that automatically detects the current service context (e.g., LAN) and wraps any AI-generated condition in an `AND` block with the mandatory `serviceId` filter if it's missing.
- **Human Translation Persistence**: Added a `description` field to the database schema for rules. The AI generates this "plain English" translation during creation, and it is persisted to the record, acting as a living summary in the Rule List row.
- **Key Insight**: AI tools shouldn't just be "prompt and save." They require a strict technical boundary that enforces system-level constraints (like filtering) while providing a transparent verification gate for the human administrator.

## 40. Scaling the Copilot Pattern (AI Extraction Rules)
**Issue**: The success of the "Rule Copilot" for logic rules created demand for a similar experience in the "AI Extraction" (Triage) settings. However, extraction rules follow a completely different schema (`TriageCriterion`) than logic rules (`BOMLogicRule`). 
**Solution**:
- **Contextual Copilot API**: Instead of creating a new API, we extended the `/api/copilot-suggest` endpoint to handle multiple `contextType` values. This allowed us to reuse the prompt cleaning and JSON parsing infrastructure while swapping the system instructions and schema definitions based on the request.
- **Form-Aware Interaction**: In `AITriageRuleEditor.tsx`, the copilot was designed to be "Form-Aware," specifically disabling itself during "Edit" mode to prevent accidental overwrites of existing production IDs, while serving as an accelerator for creating "New" rules.
## 41. Synchronizing Config-Driven Taxonomy with Equipment Specs
**Issue**: The "PoE Capabilities" field in the equipment catalog was a free-text input, leading to string mismatches (e.g., "UPOE" vs "uPoE") that broke the BOM engine's filtering logic. 
**Solution**: 
- **Metadata-Linked Selects**: Replaced the free-text input in the `EquipmentModal` with a dropdown driven by the `useCatalogMetadata` hook.
- **Single Source of Truth**: Updated the hook to prioritize `validPoeTypes` from the `SystemConfig` (Site Taxonomy), ensuring that any administrative changes to "Valid PoE Types" are immediately reflected in the catalog options.
- **UI Consistency**: Synchronized the `GuidedLANReview` to use the same metadata-driven options, ensuring the SA's requirements always align with the available catalog standards.
- **Key Insight**: Technical specifications used for filtering must never be free-text. They should be strictly bound to a managed taxonomy to ensure the "Selector" (SA) and the "Provider" (Catalog) are always speaking the same language.

## 42. Modular BOM Engine Architecture & Data-Driven Logic
**Issue**: As the `bom-engine.ts` grew to support WAN, LAN, and WLAN, it became a monolithic "god file" that was difficult to test and prone to regression. Logic for different domains (e.g., throughput vs. port counts) was intermingled, making it hard to apply domain-specific constraints without affecting others.
**Solution**: Refactored the engine into a **Modular Orchestrator** pattern.
- **Domain Decoupling**: Split the engine into independent modules (`wan-logic.ts`, `lan-logic.ts`, `wlan-logic.ts`), each responsible for hardware selection within its own purpose.
- **Unified Interface**: Introduced a standard `BOMModuleInput` interface for all sub-engines, allowing the main `calculateBOM` to act as a pure router/orchestrator.
- **Strict Data-Driven Constraint**: Enforced a rule that **no business logic or equipment data** should be hardcoded in these modules. All rules (json-logic), taxonomy, and parameters are injected from the database.
- **Key Insight**: Complexity in a rules engine is best managed by compartmentalizing *purposes* while standardizing the *data flow*. This architecture allows for scaling into new domains (like Edge AI or Security) by simply adding a new module and updating the purpose router, without touching the existing, verified WAN/LAN logic.
- **Pattern**: 
  ```typescript
  // Orchestrator routers based on service purpose
  if (purpose === "WAN") return calculateWANBOM(moduleInput);
  if (purpose === "LAN") return calculateLANBOM(moduleInput);
  ```
- **Benefit**: Improved testability (can test LAN logic in isolation) and clearer "Reasoning" strings tailored to the specific domain metrics.

## 43. Decoupling Site Types from LAN and WLAN Logic
**Issue**: The "Small Branch" classification heuristic (based on user count) was being used as a gateway for LAN/WLAN auto-defaults. This caused issues for low-user sites with high port requirements (like Data Centers), which were being incorrectly auto-defaulted or blocked. Additionally, `siteDef.constraints` were being applied to LAN/WLAN hardware, unnecessarily restricting the available equipment pool based on WAN-centric site types.
**Solution**: 
- **Universal LAN Defaults**: Removed the `isSmallBranch` check from `applySmartLANDefaults`. The engine now applies baseline LAN topology requirements to *all* sites, primarily driven by their raw port and PoE needs rather than arbitrary user count thresholds.
- **Constraint Decoupling**: Removed all `siteDef.constraints` checks from `lan-logic.ts` and `wlan-logic.ts`. Site Types and their associated constraints (budget, throughput) are now strictly a WAN/Edge concern.
- **Improved Fallback Scaling**: Updated the LAN fallback algorithm to account for port capacity. If a perfectly matching switch isn't found, the engine now prefers the most suitable candidate and scales the `quantity` to meet the site's total port requirement.
- **Key Insight**: Site "Types" are often a business-level or WAN-topology construct. LAN and WLAN requirements are physical and scaling-based. Forcing LAN logic to adhere to WAN-centric site definitions creates fragile edge cases and limits hardware selection flexibility.
- **UI Alignment**: Updated UI banners and alerts to remove language about "complexity" for large sites, shifting the focus to manual requirement confirmation where necessary.
## 44. Resilient Metadata & Efficiency-Driven Selection (LAN)
**Issue**: Missing `uplinkPortType` in the equipment catalog caused strict filtering to fail for sites like MIA-Office, triggering unwanted "Best Effort" fallbacks. The fallback logic was also prone to picking oversized hardware (48-port for 12-port sites).
**Solution**:
- **Defensive Filtering**: Relaxed the `uplinkPortType` check in `lan-logic.ts` to allow hardware with missing metadata if it meets other primary criteria.
- **Efficiency Sorting**: Updated both primary and fallback sorting to prefer the smallest/most cost-efficient hardware that meets the minimum requirement (e.g., picking 24-port over 48-port for a 12-port site).
- **Metadata Patching**: Systematically added missing `uplinkPortType` and `poe_capabilities` to the `MS130` series in the database and seed files.
- **Key Insight**: A rules engine shouldn't be "all-or-nothing" with metadata. Implementing a tiered filtering approach (Strict -> Relaxed -> Best Effort) ensures continuity of the workflow even when data is imperfect, while efficiency-based sorting keeps the suggestions commercially viable.
## 46. Multi-Service Mapping & Data Normalization
**Issue**: Features and Equipment were initially mapped to a single "Category" or "Purpose," which failed to reflect reality where a single device (e.g., a Meraki MX) supports SD-WAN, Security, and LAN functionality simultaneously. This also created rigid UI search and filtering.
**Solution**:
- **Array-Based Schema Design**: Transitioned from `category: string` to `category: string[]` (for Features) and `mapped_services: string[]` (for Equipment).
- **Graceful Migration & Normalization**: Implemented normalization layers in both the UI and AI ingestion routes. The system now transparently handles legacy single-string data by converting it to arrays on the fly.
- **Improved AI Extraction**: Updated the Gemini prompt to request a list of supported services. This allows the AI to "auto-tag" hardware with multiple service affinities based on the datasheet content.
- **Multi-Select Admin UI**: Built a checkbox-list multi-select pattern for admin modals to replace simple dropdowns, enabling fine-grained mapping control.
- **Key Insight**: "Categories" are rarely mutually exclusive in enterprise networking. Favoring array-based mapping from the start provides the flexibility needed for discovery, reporting, and rules-based logic that spans multiple technology domains.
- **Pattern**: When transitioning a schema from string to array, use a "Normalize on Fetch" pattern in hooks to prevent UI crashes while existing database records are still in the old format.

## 47. Unified Polymorphic Schema & Optionality
**Issue**: Transitioning to a `UnifiedSpecsSchema` to support multi-purpose hardware (e.g., WAN + WLAN) initially included strict `catch()` defaults. This caused two problems:
1. **Type Contention**: Inferred TypeScript types became rigid, requiring all fields (even irrelevant ones like `accessPortCount` for a WAN-only router) to be present in object literals like `seed-equipment.ts`.
2. **Data Pollution**: Every equipment record became bloated with irrelevant defaults after parsing.
**Solution**:
- **Strictly Optional Schema**: Refactored `UnifiedSpecsSchema` to make all domain-specific fields `.optional()` with no schema-level defaults.
- **Consumer-Held Defaults**: Moved the responsibility for "sane defaults" (e.g., assuming 24 ports if unspecified) into the specific logic modules (`lan-logic.ts`) or UI components that consume those fields.
**Key Insight**: A polymorphic schema should be a "loose" container. Forcing defaults at the validation boundary creates friction in development workflows (like seeding or manual entry) and violates the principle of least astonishment. Responsibility for interpreting missing data belongs to the domain-specific consumer, not the general-purpose validator.

## 48. Service-Specific Feature Scoping & Data Leakage Prevention
**Issue**: The "Package Selection" flow (ServiceItemForm) was displaying all available features (e.g., WAN features, LAN features, Maintenance tiers) in a single flat list, even when the user was only configuring a specific service. This created clutter and allowed "data leakage" where a user could accidentally add a WAN feature to a LAN service.
**Solution**:
- **Categorical Visibility Filtering**: Updated the `ServiceItemForm` to dynamically filter the global feature catalog based on the active service name.
- **Strict Service Affinity**: Combined with the multi-category schema (Lesson 46), this ensures that a feature only appears in contexts where it is semantically valid.
- **Key Insight**: UI visibility should be strictly tied to service affinity. Filtering at the entry point reduces the possibility of invalid configurations and streamlines the user experience by only presenting relevant choices.

## 49. Data Compatibility and Fallback Accessors
**Issue**: Strict checks like `eq.role === 'LAN'` silently failed when dealing with legacy database entries or ingested equipment catalogs that used `primary_purpose` or `purpose` instead of the newly standardized `role` field. This caused empty equipment lists in manual selection menus.
**Solution**:
- **Utility Abstraction**: Replaced direct property access with a shared utility function `getEquipmentRole(eq)` that safely evaluates the equipment object against multiple possible fields (`role`, `primary_purpose`, `purpose`) using fallback logic.
- **Key Insight**: When data schemas evolve, the UI filtering logic must use robust accessors/utilities rather than direct property reads to ensure backward compatibility with older data records, preventing silent UI failures in lists and dropdowns.

## 50. Intelligent Hybrid Approach to Hardware Licensing
**Issue**: Managing equipment licenses natively on hardware profiles led to stale pricing, while keeping them purely in a standalone pricing catalog detached them from hardware compatibility logic.
**Solution**:
- **Separation of Concerns**: Embedded compatible `licenses` (SKU, Tier, Term Length) directly onto the hardware schemas to dictate *compatibility*.
- **Dynamic Engine Injection**: Updated the BOM engine to emit dedicated `"license"` `BOMLineItems` by cross-referencing the equipment's compatible licenses with the package's `required_license_tier`.
- **Key Insight**: Hardware dictates what licenses *can* run on the box, while the Package/Service dictates what tier the customer *needs*. Decoupling these concerns and using the SKU as the binding key allows pricing to be fetched dynamically from the global Vendor Pricing catalog while maintaining strict architectural enforcement.

## 51. Transition to Dedicated Pricing Catalog
**Issue**: Embedding pricing directly in the `Equipment` records caused data duplication and stale pricing across different projects. It also made vendor price updates (via CSV) difficult, as they had to be mapped back to every individual equipment item.
**Solution**:
- **Decoupled Pricing**: Removed all pricing fields (`price`, `listPrice`, `mrc`) from the `Equipment` schema.
- **Pricing Catalog (Single Source of Truth)**: Created a standalone `Pricing` catalog where each entry is identified by its vendor SKU/ID.
- **Dynamic Linking**: Hardware and licenses now link to the pricing catalog via a `pricingSku` field (falling back to their own `id`). 
- **AI-Assisted Matching**: Implemented AI-driven SKU suggestion and confirmation logic in the Admin UI to handle cases where equipment IDs don't exactly match vendor pricing IDs (e.g., `MX67` vs `MX67-HW`).
- **Targeted Ingestion**: Updated csv ingestion to only import prices for items present in the equipment catalog, preventing the database from bloating with irrelevant vendor parts.
- **Key Insight**: Pricing is highly volatile compared to hardware specifications. Separating "Technical Specs" (Equipment) from "Commercial Specs" (Pricing) allows both to evolve independently and enables bulk vendor updates without touching core architecture rules.

## 52. Firestore Document ID Restrictions (The Slash-Safety Pattern)
**Issue**: Using product SKUs as Firestore document IDs (e.g., `PWR-C6-600WAC/2`) caused fatal errors because Firestore does not allow forward slashes (`/`) in document names. This initially blocked ingestion of various power supplies and license SKUs.
**Solution**:
- **Escaped ID Mapping**: Implemented a `getPricingDocId` helper that replaces `/` with a safety token (e.g., `_sl_`) for the Firestore document path.
- **Data Integrity**: The original SKU is always preserved as a first-class `id` field within the document payload itself.
- **Service-Level Transparency**: Updated the service layer to automatically apply this escaping logic, ensuring that callers (UI, API) can still use raw SKUs while the database handles the storage-safe version.
- **Key Insight**: Never assume that external identifiers (SKUs, URLs, user input) are safe for use as direct primary keys in a database. Always implement a sanitization or escaping layer that preserves the original value in the data.

## 53. Intent-Based Input for Technical Configurations
**Issue**: Technical SAs often struggle with detailed port and PoE spec definitions, while non-technical SAs are overwhelmed by jargon (e.g., "PoE+ 802.3at").
**Solution**: Replaced the technical requirements editor with an **Intent Collector** (Wizard).
- **Key Insight**: Users think in terms of "what connects here" (Workstations, IP Phones, etc.) rather than technical specs. Mapping these simple intents to backend technical requirements simplifies the UX without losing technical accuracy.
- **Pattern**: Implemented a hybrid design where intent-based input auto-resolves a default "Hero Card" recommendation, with an explicit "Find Your Own" (Catalog Browser) escape hatch for manual overrides.
- **Validation**: Replaced large, confusing usage gauges with a compact, color-coded **Validation Bar** that provides real-time feedback on port coverage and capacity without obstructing the configuration flow.

## 54. Rule Translation Engine & Human-Readable Logic
**Issue**: The BOM Logic rules were previously displayed as raw JSON Logic payloads (e.g., `{"==": [{"var": "serviceId"}, "lan"]}`). This was difficult for non-technical administrators to audit and lead to a "black box" perception of the logic engine.
**Solution**: Implemented a **Rule Translation Engine**.
- **Human-Readable Logic**: Created `formatLogicCondition` in `bom-utils.ts` that recursively translates complex JSON Logic objects into natural English strings.
- **Improved Metadata Labels**: Used a mapping of internal variable names (`site.bandwidthDownMbps`) to user-friendly labels ("Download Speed") to ensure the generated sentences made sense to business users.
- **Contextual Visibility**: Added a Dedicated "Human Translation" column in the Admin UI, while preserving the raw JSON in tooltips for technical verification.
- **Key Insight**: Transparency breeds trust in automated systems. Providing a "Natural Language" view of complex boolean logic allows administrators to confidently manage rules without needing to understand JSON or programming syntax.

## 55. Canonical Service ID Normalization & UI Alignment
**Issue**: As part of a data migration to standardize service identifiers (e.g., renaming `managed_sdwan` to `sdwan`), legacy IDs remained in UI code (tabs, type guards, and default states). This caused "disappearing" data in administrative views because the UI was filtering for old IDs that no longer existed in the migrated database.
**Solution**:
- **Uniform Migration**: When renaming core data identifiers, the migration must include a coordinated update of all frontend "hardcoded" IDs and initial state values.
- **Strict TypeScript Boundaries**: Updated the `TabValues` and `activeTab` types in the Admin pages to strictly enforce the new canonical IDs. 
- **AI Rule Copilot Alignment**: Ensured that AI extraction and logic-generation prompts use the new canonical IDs, preventing the creation of new "orphaned" data.
- **Key Insight**: Disappearing UI elements in a filtered view are often a symptom of ID-mismatches following a data migration. Centralizing these IDs in a typed constant or enum, rather than using raw strings, is critical for catching these issues at build time rather than runtime.
## 54. Multi-Stage AI Sync & Data Denormalization for Scale
**Issue**: Initial attempts to sync a massive 47,000+ item pricing catalog using a single AI pass were fragile. 
- **Scale Limits**: The frontend's 5,000-item fetch limit meant newly synced items often became "invisible" in UI lookups.
- **Data Pollution**: One-pass logic often ingested thousands of unrelated generic licenses, "polluting" the catalog with low-quality data.
- **AI Context Overload**: Asking the AI to match hardware *and* multiple tiers of licenses in one prompt led to truncated responses or missing detail.

**Solution**:
- **Intentional 2-Step Flow**: Rearchitected the sync into two distinct stages:
    1. **Step 1: Hardware Pricing**: Focus strictly on base unit SKUs and List Prices for existing catalog equipment.
    2. **Step 2: Licensing Discovery**: Match valid license tiers (Enterprise, Advanced, etc.) and terms (1Y/3Y/5Y) to those specific devices.
- **Price Denormalization**: Added `pricingSku_listPrice` directly onto the `Equipment` and `License` schemas in Firestore.
- **Key Insight**: When building for scale (e.g., thousands of parts), **Denormalization is your friend**. Storing the "List Price" snapshot directly on the equipment/license object removes the requirement for the frontend to perform a real-time join against a massive 40k+ item pricing table. This ensures the pricing is *always* visible, even if the primary pricing catalog isn't fully loaded into memory.
- **Process Isolation**: Splitting the sync steps allows for more specific AI system instructions, which drastically improves the quality and reliability of complex vendor SKU generation (especially for Meraki and Cisco DNA).
## 56. SWC Transform Reliability & Source Tree Hygiene
**Issue**: Intermittent "Syntax Error" during Jest tests (SWC transform failures) that pointed to incorrect line numbers or cryptic context. One-shot script artifacts (like `.mjs` or `.bak` files created for seeding or debugging) left in the `src/` directory tree were being "discovered" by Jest's module resolution or Next.js build walker, causing fatal parsing errors when they contained TypeScript syntax or invalid AST structures.
**Solution**: 
- **Source Hygiene**: Enforced strict cleanup of temporary `.mjs` or backup files within the `src/` and `tmp/` directories.
- **Explicit String Formatting**: For large multiline strings in constants (like AI Prompts), replaced template literals with double-quoted strings and explicit `\n` characters. This provides a more "stable" AST for the SWC compiler and prevents issues with hidden or invalid characters in backtick blocks.
- **No-Cache Verification**: Mandatory use of `npm run test -- --no-cache` after structural artifact cleanup to ensure stale transform results were purged.
**Lesson**: Rogue files in the source tree are more dangerous than rogue code in a active file. Build and test tools often have broad search patterns that ingest unintentional "debris." Keep the source tree pristine.
