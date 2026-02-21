import re
with open("src/components/admin/EquipmentModal.tsx", "r") as f:
    text = f.read()

# Replace inline setFormData for adding arrays with handleSpecChange
text = text.replace("""onClick={() => setFormData({
                                                ...formData,
                                                specs: {
                                                    ...formData.specs,
                                                    compatible_uplink_modules: [...(specs.compatible_uplink_modules || []), { part_number: "", description: "", ports: 0, speed: "" }]
                                                }
                                            })}""", """onClick={() => handleSpecChange("compatible_uplink_modules", [...(specs.compatible_uplink_modules || []), { part_number: "", description: "", ports: 0, speed: "" }])}""")

text = text.replace("""onClick={() => setFormData({
                                                ...formData,
                                                specs: {
                                                    ...formData.specs,
                                                    compatible_power_supplies: [...(specs.compatible_power_supplies || []), { part_number: "", description: "", capacity_watts: 0, form_factor: "" }]
                                                }
                                            })}""", """onClick={() => handleSpecChange("compatible_power_supplies", [...(specs.compatible_power_supplies || []), { part_number: "", description: "", capacity_watts: 0, form_factor: "" }])}""")

text = text.replace("""onClick={() => setFormData({
                                                ...formData,
                                                specs: {
                                                    ...formData.specs,
                                                    compatible_stacking_options: [...(specs.compatible_stacking_options || []), { part_number: "", description: "", length_cm: 0 }]
                                                }
                                            })}""", """onClick={() => handleSpecChange("compatible_stacking_options", [...(specs.compatible_stacking_options || []), { part_number: "", description: "", length_cm: 0 }])}""")

# Also fix the map implicitly has any type errors
text = text.replace("specs.compatible_uplink_modules?.map((mod, i) =>", "specs.compatible_uplink_modules?.map((mod: any, i: number) =>")
text = text.replace("specs.compatible_power_supplies?.map((psu, i) =>", "specs.compatible_power_supplies?.map((psu: any, i: number) =>")
text = text.replace("specs.compatible_stacking_options?.map((opt, i) =>", "specs.compatible_stacking_options?.map((opt: any, i: number) =>")

with open("src/components/admin/EquipmentModal.tsx", "w") as f:
    f.write(text)
