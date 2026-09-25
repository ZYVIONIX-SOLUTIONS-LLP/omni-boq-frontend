import os
import re

path = r"app\(app)\Quotations\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Ensure isLevel1 is defined
if "const isLevel1 = " not in c:
    c = c.replace('const isLevel3 = !isAdmin && user?.priorityLevel === 3;', 'const isLevel1 = !isAdmin && user?.priorityLevel === 1;\n  const isLevel3 = !isAdmin && user?.priorityLevel === 3;')

# Hide in AG Grid
ag_grid_pattern = r'(<DropdownMenuItem onClick=\{\(\) => p\.data && openSaveAsRevision\(p\.data\)\}>\s*<Copy className="h-3\.5 w-3\.5 text-amber-600" />\s*Save As Revision\s*</DropdownMenuItem>)'
c = re.sub(ag_grid_pattern, r'{(isAdmin || isLevel1) && \1}', c)

# Hide in Directory View
dir_view_pattern = r'(<DropdownMenuItem onClick=\{\(\) => openSaveAsRevision\(q\)\}>\s*<Copy className="h-3\.5 w-3\.5 text-amber-600" />\s*Save As Revision \(Negotiation\)\s*</DropdownMenuItem>)'
c = re.sub(dir_view_pattern, r'{(isAdmin || isLevel1) && \1}', c)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
