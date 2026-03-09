# UI Standards

- Use Tailwind CSS v4.
- Prioritize aesthetics: smooth gradients, glassmorphism, and micro-interactions.
- No generic placeholders. Use realistic data or generated images.
- Consistent spacing and typography.
- Dark mode support.

## Engineering & Component Standards
- **Dynamic Metadata**: Instead of hardcoding enums (like equipment purposes or interface types), use a dynamic metadata management system backed by Firestore. Fetch via tools like `useCatalogMetadata`.
- **Datalists vs. Selects**: Favor managed `<select>` elements (with a specific "Custom" option if needed) over HTML `<datalist>` to prevent data consistency issues.
- **Hydration Resiliency**: Next.js apps should suppress hydration warnings at the `<html>` and `<body>` level to handle browser extensions safely.
- **Strict Loading Guards (E2E Safety)**: The page should not exit the "Loading" state until **all** critical architectural data (like catalogs and parameters) is fully resolved, to prevent race conditions during E2E UI testing.
- **Resource Contention (Best Effort Fallbacks)**: If data or hardware recommendations fail, display a "Best Effort" fallback option with a warning ("Load exceeds capacity") so the user workflow is not blocked by a blank screen.
- **Data Boundaries & Progressive Disclosure**: Separate micro-views (site-specific) from macro-views (project-global). Don't mix scope in a single view to reduce cognitive tax.
