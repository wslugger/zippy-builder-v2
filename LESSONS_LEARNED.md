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
