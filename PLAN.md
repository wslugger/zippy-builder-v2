# Express Connect Flow Redesign Plan

## Objective
Refactor the Express Connect flow into a two-phase architecture focusing on non-functional, use-case-driven questions to derive technical designs.

### Phase 1: Overall Network Focus
Ask global use-case questions to determine Topology, Internet Breakout, and Cloud Connectivity.
- **Questions**: Number of sites? Where do applications sit (SaaS, Hubs, Cloud)? Branch-to-branch communication frequency? Latency sensitivity?
- **Output**: Present design choices (Topology, Breakout, Cloud) based on answers.

### Phase 2: Site-by-Site Focus
Ask per-site use-case questions to determine Connectivity, LAN, and WLAN needs.
- **Questions**: Number of users? Primary activities? Need Wi-Fi? Cameras/Printers present?
- **Output**: Site bandwidth, single/dual CPE, LAN ports/types, Wi-Fi AP types.

By focusing on these use-cases, we will update the BOM logic rules and the UI to ensure premium, dynamic design that abstracts purely technical questions away from the initial user inputs.

---

## User Review Required

> [!IMPORTANT]
> Please review the architectural UI/UX options below and select **ONE** option so we can proceed with creating the components and updating `bomState`.

### Option 1: The "Site Profile" Wizard (Recommended for Scalability)
Instead of configuring 50 individual sites one-by-one, Phase 1 asks for the total number of sites. Phase 2 lets the user build "Site Profiles" (e.g., "Small Retail", "Large Office", "Warehouse") by answering the use-case questions (users, cameras, printers). After defining the profiles, the user allocates the total sites among these profiles.
- **Pros**: Highly scalable for many sites, much less repetitive data entry.
- **Cons**: Requires mapping site count to profiles in the `bomState`.

### Option 2: Sequential Accordion / Stepper (Current Pattern)
Revamp the existing `ExpressConnectAccordion` into two massive sections.
- **Step 1: Network Assessment**: The Phase 1 questions. Validating this step locks in the global topology.
- **Step 2: Site Configurations**: A dynamic list of sites (based on the count from Phase 1). Each site has a sub-accordion with the Phase 2 use-case questions.
- **Pros**: Follows the existing UI pattern closely and requires minimal completely new UI layout logic.
- **Cons**: Can be extremely tedious and confusing if the user has many sites (e.g., 20+ sites forming a massive scrolling page).

### Option 3: Two-Tab Master/Detail Dashboard
Create a premium dashboard-style view for Express Connect.
- **Global Tab**: Contains cards for Network, Cloud, and Topology derived from the Phase 1 questionnaire.
- **Sites Tab**: A data grid or polished card list of sites. Selecting a site opens a slide-out panel (Sheet) with the use-case questionnaire for that site.
- **Pros**: Extremely premium, modern dashboard feel. Fits well with Next.js App Router and dynamic client components.
- **Cons**: Departs from the pure step-by-step wizard flow, requiring higher initial build effort for the Master/Detail UI.

## Verification Plan

### Automated Tests
- We will add a new test file: `__tests__/features/express-connect-phases.test.tsx` to verify that selecting options in Phase 1 correctly renders the site inputs in Phase 2.
- Execute `npm run test` targeting this file explicitly.
- We will execute the existing suite (`npm run test`) to ensure no BOM Engine rules break with this new data format.

### Manual Verification
- Render the Next.js dev server and navigate to an existing test project's Express Connect tab.
- Visually verify that the Phase 1 and Phase 2 inputs are correctly persisting to `bomState`.
- Verify the UI aesthetics (glassmorphism, layout) look premium as required by `AGENTS.md`.
