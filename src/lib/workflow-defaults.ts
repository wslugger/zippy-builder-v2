import { WorkflowStep } from "./types";

export const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = [
    { id: 'package-selection', label: '1. Package Selection', path: 'package-selection' },
    { id: 'summary', label: '2. Review Package', path: 'summary' },
    { id: 'customize', label: '3. Customize', path: 'customize' },
    { id: 'design-doc', label: '4. Design Doc', path: 'design-doc' },
    { id: 'bom-builder', label: '5. BOM Builder', path: 'bom-builder' },
    { id: 'hld', label: '6. HLD', path: 'hld' },
];
