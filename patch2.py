
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Materials\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const handleCategoryChange = (val: string) => {", "const handleCategoryChange = (val: string | null) => {\n    if (!val) return;")
content = content.replace("onValueChange={setDraftSeries}", "onValueChange={(val) => { if (val) setDraftSeries(val) }}")
content = content.replace("onValueChange={(val) => setDraftAttributes(p => ({...p, [attr.id]: val}))}", "onValueChange={(val) => { if (val) setDraftAttributes(p => ({...p, [attr.id]: val})) }}")

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Materials\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

