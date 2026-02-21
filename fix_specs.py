import re
def fix(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    content = content.replace('(item.specs as any).', '(item as any).specs.')
    content = content.replace('(parsed.specs as any).', '(parsed as any).specs.')
    content = content.replace('(equipment.specs as any).', '(equipment as any).specs.')
    # Also fix the original just in case
    content = content.replace('item.specs.', '(item as any).specs.')
    content = content.replace('parsed.specs.', '(parsed as any).specs.')
    content = content.replace('equipment.specs.', '(equipment as any).specs.')
    
    with open(file_path, 'w') as f:
        f.write(content)

fix("src/app/sa/project/[id]/bom/SpecsModal.tsx")
fix("src/components/admin/EquipmentIngestion.tsx")
fix("src/app/admin/catalog/page.tsx")
fix("__tests__/features/lan-switch-ingestion.test.tsx")
