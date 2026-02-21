import re
with open("src/components/admin/EquipmentModal.tsx", "r") as f:
    text = f.read()

text = text.replace("const handleSpecChange = <K extends keyof Equipment['specs']>(field: K, value: any) => {", "const handleSpecChange = (field: string, value: any) => {")
text = text.replace("const numericFields: (keyof Equipment['specs'])[] = [", "const numericFields: string[] = [")

with open("src/components/admin/EquipmentModal.tsx", "w") as f:
    f.write(text)
