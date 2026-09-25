import os

path = r"app\(app)\Activities\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('attributeDefsApi,', 'attributeDefsApi,\n  listProducts,')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
