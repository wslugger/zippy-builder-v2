import re
with open("__tests__/features/bom-logic.test.tsx", "r") as f:
    text = f.read()

text = text.replace('purpose: ["LAN"],', 'purpose: ["LAN"], role: "LAN",')
text = text.replace('specs: { ports: 48, access_speed: "1GbE" },', 'specs: { stackable: false, port_configuration: { copper1G: 48, mGig: 0, sfp10G: 0 } },')
text = text.replace('specs: { ports: 24, access_speed: "10GbE" },', 'specs: { stackable: false, port_configuration: { copper1G: 0, mGig: 0, sfp10G: 24 } },')

with open("__tests__/features/bom-logic.test.tsx", "w") as f:
    f.write(text)

with open("__tests__/bugs/bom-edge-device-selection.test.tsx", "r") as f:
    text = f.read()

text = text.replace('purpose: ["LAN"],', 'purpose: ["LAN"], role: "LAN",')
text = text.replace('specs: {', 'specs: { stackable: false,')

with open("__tests__/bugs/bom-edge-device-selection.test.tsx", "w") as f:
    f.write(text)

