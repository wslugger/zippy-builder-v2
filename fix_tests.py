import re
def fix(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # lan-switch-ingestion.test.tsx:
    content = content.replace('item.specs.stacking_supported', '(item as any).specs.stacking_supported')
    content = content.replace('item.specs.stacking_bandwidth_gbps', '(item as any).specs.stacking_bandwidth_gbps')
    content = content.replace('item.specs.forwarding_rate_mpps', '(item as any).specs.forwarding_rate_mpps')
    content = content.replace('item.specs.switching_capacity_gbps', '(item as any).specs.switching_capacity_gbps')
    content = content.replace('item.specs.primary_power_supply', '(item as any).specs.primary_power_supply')

    # bom-edge-device-selection.test.tsx:
    content = content.replace('ports: 24, access_speed: "1GbE"', 'port_configuration: { copper1G: 24, mGig: 0, sfp10G: 0 }')

    with open(file_path, 'w') as f:
        f.write(content)

fix("__tests__/features/lan-switch-ingestion.test.tsx")
fix("__tests__/bugs/bom-edge-device-selection.test.tsx")

import os
os.system("npx tsc --noEmit && npm run lint && npm run test")
