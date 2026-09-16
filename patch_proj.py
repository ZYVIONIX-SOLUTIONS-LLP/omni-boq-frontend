
import re
with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("listProducts({ limit: 1000 }),", "listProducts({ limit: 10000 }),")

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

