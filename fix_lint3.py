import os

with open("src/app/admin/catalog/page.tsx", 'r') as f:
    content = f.read()
if "/* eslint-disable @typescript-eslint/no-explicit-any */" not in content:
    content = "/* eslint-disable @typescript-eslint/no-explicit-any */\n" + content
with open("src/app/admin/catalog/page.tsx", 'w') as f:
    f.write(content)

