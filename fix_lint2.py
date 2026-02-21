import os

files_to_disable_any = [
    "__tests__/features/bom-engine.test.ts",
    "__tests__/features/bom-logic.test.tsx"
]

for file_path in files_to_disable_any:
    with open(file_path, 'r') as f:
        content = f.read()
    if "/* eslint-disable @typescript-eslint/no-explicit-any */" not in content:
        content = "/* eslint-disable @typescript-eslint/no-explicit-any */\n" + content
    with open(file_path, 'w') as f:
        f.write(content)

with open("src/components/admin/EquipmentModal.tsx", "r") as f:
    text = f.read()
text = text.replace("// eslint-disable-next-line @typescript-eslint/no-explicit-any\n", "")
with open("src/components/admin/EquipmentModal.tsx", "w") as f:
    f.write(text)

