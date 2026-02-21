import os
import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # In SpecsModal.tsx, replace equipment.specs -> (equipment.specs as any)
    if "SpecsModal.tsx" in file_path:
        content = content.replace('equipment.specs.', '(equipment.specs as any).')

    # In EquipmentIngestion.tsx, replace parsed.specs -> (parsed.specs as any)
    if "EquipmentIngestion.tsx" in file_path:
        content = content.replace('parsed.specs.', '(parsed.specs as any).')
        content = content.replace('item.specs.', '(item.specs as any).')

    with open(file_path, 'w') as f:
        f.write(content)

fix_file("src/app/sa/project/[id]/bom/SpecsModal.tsx")
fix_file("src/components/admin/EquipmentIngestion.tsx")
