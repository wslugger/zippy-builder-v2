import { WorkflowStep } from "./types";

export const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = [
    { id: 'scope-selection', label: '1. Project Scope', path: 'scope' },
    { id: 'package-selection', label: '2. Package Selection', path: 'package-selection' },
    { id: 'summary', label: '3. Review Package', path: 'summary' },
    { id: 'customize', label: '4. Customize', path: 'customize' },
    { id: 'design-doc', label: '5. Design Doc', path: 'design-doc' },
    { id: 'bom-builder', label: '6. BOM Builder', path: 'bom' },
    { id: 'hld', label: '7. HLD', path: 'hld' },
];
