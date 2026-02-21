import re
with open("src/components/admin/EquipmentModal.tsx", "r") as f:
    text = f.read()

text = text.replace("""onChange={(e) => setFormData({
                                                                ...formData,
                                                                specs: {
                                                                    ...formData.specs,
                                                                    integrated_cellular: e.target.checked,
                                                                    cellular_type: e.target.checked ? specs.cellular_type || "LTE" : undefined
                                                                }
                                                            })}""", """onChange={(e) => { handleSpecChange("integrated_cellular", e.target.checked); if (e.target.checked) handleSpecChange("cellular_type", specs.cellular_type || "LTE"); else handleSpecChange("cellular_type", undefined); }}""")

text = text.replace("""onChange={(e) => setFormData({
                                                                ...formData,
                                                                specs: {
                                                                    ...formData.specs,
                                                                    modular_cellular: e.target.checked
                                                                }
                                                            })}""", """onChange={(e) => handleSpecChange("modular_cellular", e.target.checked)}""")

text = text.replace("""onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: { ...formData.specs, cellular_type: e.target.value as Equipment['specs']['cellular_type'] }
                                                        })}""", """onChange={(e) => handleSpecChange("cellular_type", e.target.value)}""")


text = text.replace("""onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: {
                                                                ...formData.specs,
                                                                integrated_wifi: e.target.checked,
                                                                wifi_standard: e.target.checked ? specs.wifi_standard || "Wi-Fi 6" : undefined
                                                            }
                                                        })}""", """onChange={(e) => { handleSpecChange("integrated_wifi", e.target.checked); if (e.target.checked) handleSpecChange("wifi_standard", specs.wifi_standard || "Wi-Fi 6"); else handleSpecChange("wifi_standard", undefined); }}""")

text = text.replace("""onChange={(e) => setFormData({
                                                            ...formData,
                                                            specs: { ...formData.specs, wifi_standard: e.target.value as Equipment['specs']['wifi_standard'] }
                                                        })}""", """onChange={(e) => handleSpecChange("wifi_standard", e.target.value)}""")

text = text.replace("""onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    specs: {
                                                                        ...formData.specs,
                                                                        stacking_supported: e.target.checked
                                                                    }
                                                                })}""", """onChange={(e) => handleSpecChange("stacking_supported", e.target.checked)}""")

text = text.replace("""onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    specs: {
                                                                        ...formData.specs,
                                                                        stackable: e.target.checked
                                                                    }
                                                                })}""", """onChange={(e) => handleSpecChange("stackable", e.target.checked)}""")

with open("src/components/admin/EquipmentModal.tsx", "w") as f:
    f.write(text)
