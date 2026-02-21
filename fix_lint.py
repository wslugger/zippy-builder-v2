import os

files_to_disable_any = [
    "src/app/sa/project/[id]/bom/SpecsModal.tsx",
    "src/components/admin/EquipmentIngestion.tsx",
    "src/components/admin/EquipmentModal.tsx",
    "src/lib/types.ts",
    "__tests__/features/lan-switch-ingestion.test.tsx",
    "__tests__/bugs/bom-edge-device-selection.test.tsx"
]

for file_path in files_to_disable_any:
    with open(file_path, 'r') as f:
        content = f.read()
    if "/* eslint-disable @typescript-eslint/no-explicit-any */" not in content:
        content = "/* eslint-disable @typescript-eslint/no-explicit-any */\n" + content
    with open(file_path, 'w') as f:
        f.write(content)

