---
name: create_ui_component
description: Build Next.js UI components adhering to production standards and architectural lessons.
---

# UI Component Skill

Use this skill when building or refactoring UI components for ZippyDesignBuilder.

## Architectural Standards
- **Data Boundaries**: Keep micro-views (site-specific) separate from macro-views (project-global). (Lesson 16)
- **Hydration Safety**: Ensure `suppressHydrationWarning` is used if injecting custom attributes. (Lesson 24)
- **Loading State**: Components that fetch data must not render functional UI until all critical data (catalogs/parameters) is resolved. (Lesson 15, 23)

## Design Checklist
- Use **Tailwind CSS v4**.
- Implement **smooth gradients** and **glassmorphism** (e.g., `bg-white/10 backdrop-blur-md`).
- Ensure **Dark Mode** compatibility.
- Use **managed <select>** elements for technical attributes instead of datalists. (Lesson 18)

## Logic Patterns
- **Polymorphic Rendering**: Use `getEquipmentRole(item)` helper to determine which specs to display (don't hardcode logic based on single strings). (Lesson 49)
- **Safe Numeric Access**: Use `??` or explicit `undefined` checks for numeric values that could be `0` (like `poe_budget`). (Lesson 216)
- **Polymorphic Extraction**: Fallback across snake_case/camelCase for AI-extracted fields (e.g., `wifi_standard || wifiStandard`). (Lesson 202)
