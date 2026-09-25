import os

path = r"components\layout\app-shell.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('item.label !== "Settings"', 'item.label !== "Company"')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
