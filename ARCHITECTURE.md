# ARCHITECTURE.md - System Design Map

## 🏗 High-Level Architecture
ZippyDesignBuilder is a **Next.js 16 Web Application** designed for high-performance design and package management.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        UI[Next.js UI Components]
    end
    
    subgraph "Hosting Infrastructure (Vercel)"
        NextJS[Next.js App Router]
        API[API Routes]
        Actions[Server Actions]
        Middleware[Auth Middleware]
    end
    
    subgraph "Google Cloud Platform"
        FirebaseService[Firebase Service]
        FirestoreService[Firestore Service]
        GeminiService[Gemini AI Service]
        EquipmentService[Equipment Service]
        BOMLogicService[BOM Logic Service]
        MetricsService[Metrics Service]
        CopilotService[Copilot Service]
    end
    
    Browser --> UI
    UI --> NextJS
    NextJS --> API
    NextJS --> Actions
    NextJS --> Middleware
    NextJS --> FirebaseService
```

### Directory Structure
- `src/app`: App Router pages and layouts (Admin & Public).
- `src/components`: Reusable UI elements and complex editors.
- `src/hooks`: Custom data fetching and state hooks (`usePackages`, `useTechnicalFeatures`).
- `src/lib`: Utilities and Firebase service implementations (`firebase.ts`, `types.ts`).
- `src/context`: React Context providers (Auth, Theme).

## 🧱 Data Model (Firestore)
```mermaid
erDiagram
    PACKAGES ||--o{ PACKAGE_ITEMS : contains
    PACKAGE_ITEMS }o--|| SERVICES : references
    PACKAGE_ITEMS }o--|| TECHNICAL_FEATURES : enables
    CATALOG_METADATA ||--o{ EQUIPMENT : "defines options for"
    USERS ||--o{ ROLES : has
    BOM_RULES ||--|{ BOM_PARAMETERS : uses

    PACKAGES {
        string id
        string name
        string short_description
        array items
        array collateral
        boolean active
    }
    TECHNICAL_FEATURES {
        string id
        string name
        string category
    }
    USERS {
        string uid
        string email
        string role
    }
    BOM_RULES {
        string id
        string service
        string condition
        array actions
    }
    BOM_PARAMETERS {
        string id
        string default_value
        string description
    }
    CATALOG_METADATA {
        string id
        map fields
    }
```

## 🔄 Core Data Flows

### 1. AI Design Generation
```mermaid
sequenceDiagram
    participant User
    participant ChatUI
    participant ServerAction
    participant GeminiService
    participant Firestore
    
    User->>ChatUI: Enter message
    ChatUI->>ServerAction: analyzeRequirements(message)
    ServerAction->>Firestore: Fetch context (packages, options)
    ServerAction->>GeminiService: Generate response with context
    GeminiService->>GeminiAPI: Send prompt + context
    ServerAction-->>ChatUI: Stream response
```

### 2. PDF Spec Ingestion
```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant GeminiService
    participant Firestore
    
    Admin->>API: POST /api/ingest (PDF)
    API->>GeminiService: Parse PDF to features
    GeminiService-->>API: Feature objects JSON
    API->>Firestore: Save to pending_features
```

### 3. AI Copilot Suggestions
```mermaid
sequenceDiagram
    participant User
    participant InlineCopilotTrigger
    participant API
    participant GeminiService
    
    User->>InlineCopilotTrigger: Click "Sparkle" icon or Ctrl+Space
    InlineCopilotTrigger->>API: POST /api/copilot-suggest (Context + Prompt)
    API->>GeminiService: Process request using context
    GeminiService-->>InlineCopilotTrigger: Stream text suggestion
    User->>InlineCopilotTrigger: Accept / Reject
```

## 🧱 Key Patterns
- **Server Actions**: Use for form submissions and mutations.
- **Client Components**: access Firebase via Hooks or passed-down data.
- **Styling**: All styles must use `index.css` variables or Tailwind utilities.

## 🔄 State Management
- Prefer **Local State** (`useState`, `useReducer`) for component-specific logic.
- Use **Context** only for truly global data (User Session, Theme, Toast Notifications).

## 🎓 Engineering Lessons & Patterns

### 1. Firestore Sub-collection Security
- **Lesson**: Sub-collections (e.g., `/customer_designs/{id}/versions`) do not automatically inherit parent document permissions in many rule configurations.
- **Pattern**: Use `get()` in `firestore.rules` to verify parent document ownership. This ensures that even empty sub-collections can be safely queried/added to by the owner.
  ```javascript
  match /subcollection/{id} {
    allow read, write: if get(/databases/$(database)/documents/parent/{parentId}).data.userId == request.auth.uid;
  }
  ```

### 2. State Restoration Strategy
- **Pattern**: When restoring a root document (e.g., `DesignProject`) from a snapshot (e.g., `DesignVersion`), always **strip metadata** (version numbers, separate IDs, snapshot dates) before the `updateDoc` call.
- **Goal**: Prevent the main document from adopting version-specific identities, ensuring `updatedAt` is the only timestamp that changes on the root.

### 3. Scaling History (Sub-collections vs Arrays)
- **Lesson**: Storing project history inside the main document (as an array) risks hitting Firestore's **1MB document limit**.
- **Pattern**: Implement versioning as a **Firestore Sub-collection**. This provides infinite history scaling and allows fetching history only when the user explicitly requests the "Version History" modal, reducing initial page load weight.

### 4. Deterministic Snapshots
- **Pattern**: When "Finalizing" a design, clone the equipment/service data *into* the design document. This protects the project from future catalog changes (e.g., a device being discontinued) while keeping the original historical record accurate for engineering/procurement.

### 5. Logic as Data (BOM Configuration)
- **Lesson**: Hardcoding domain logic thresholds (e.g., bandwidth limits, switch sizing logic) creates technical debt and limits adaptability.
- **Pattern**: Move these thresholds into a **Global Parameter Registry** and extract logic into **BOMLogicRules** stored in Firestore.
    - **Implementation**: The engine maps these modular rules for parameter assignments or logic updates, while the **Visual Rule Editor** allows administrators to manage conditions and actions securely without engineering deployments.

### 6. Unified Service Catalog (Stable ID Sync)
- **Lesson**: Data drift between hardcoded seed data and a dynamic "Unified Catalog" is a common source of bugs.
- **Pattern**: When seeding data templates (like Packages), always include the **Stable IDs** of the master catalog items. This allows for resilient, ID-based matching during runtime, preventing "ghost" references when display names or descriptions are updated by administrators.

### 7. Dynamic Metadata Management
- **Lesson**: Hardcoding dropdown options (e.g., Interface Types, Form Factors) requires code deployments for simple business data changes.
- **Pattern**: Store all UI "choice" data in a `catalog_metadata` collection.
    - **Implementation**: The `useCatalogMetadata` hook fetches these options on component mount.
    - **Benefit**: Admins can add new "Recommended Use Cases" or "Mounting Options" via the Admin UI, and these immediately propagate to:
        1. The Equipment Editor UI.
        2. The AI Ingestion Prompt (as validation rules).
        3. The Filter/Search panels.

### 8. End-to-End (E2E) Testing Strategy
- **Lesson**: Relying solely on unit tests leaves complex, multi-screen workflows (like the SA CSV import to BOM generation) vulnerable to integration regressions and unexpected UI state errors.
- **Pattern**: Implement **Playwright E2E Tests** focusing on the "Critical Path."
    - **Implementation**: Instead of hitting live backend services (which causes test flakiness, slows down execution, and costs money for AI APIs), use `page.route()` to **mock network responses**.
    - **Benefit**: This guarantees deterministic tests, allowing the CI/CD pipeline to safely and quickly validate that the Next.js UI components correctly process and flow data through the entire complex asynchronous user journey.

### 9. Workflow Metrics & Telemetry
- **Lesson**: Visibility into long-running, multi-step processes across systems is critical.
- **Pattern**: Implement a dynamic Metrics Dashboard pulling discrete step progress (e.g., Solution Architecture flow metrics). Rather than hardcoding metric values, flow events update centralized tracking allowing dashboards to reflect accurate real-time states and spot bottlenecks.
