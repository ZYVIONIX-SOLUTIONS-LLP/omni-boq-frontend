
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Link } from \"lucide-react\";", "Link, Unlink } from \"lucide-react\";")

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

