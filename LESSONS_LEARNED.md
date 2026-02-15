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

## 5. Deployment & Infrastructure
**Issue**: Firebase Hosting's support for modern Next.js features (SSR, Server Actions, Image Optimization) was limited or required complex "Web Frameworks" configurations that often failed or incurred high costs (Cloud Run).
**Solution**: Migrated hosting to **Vercel**.
- **Decision**: Firebase is retained for **Backend-as-a-Service** (Firestore, Auth), while Vercel handles the **Frontend & Compute** (Next.js Application).
- **Benefit**: Zero-config support for Server Actions, better build performance, and native Next.js integration.
- **Migration**: Removed `hosting` config from `firebase.json` and added `vercel.json` / Vercel dashboard configuration.
