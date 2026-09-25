import os
import re

path = r"app\(app)\Quotations\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

if "const isLevel1 = " not in c:
    c = c.replace('const isStaff = userRole === "STAFF";', 'const isStaff = userRole === "STAFF";\n  const user = getUser();\n  const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPERADMIN");\n  const isLevel1 = !isAdmin && user?.priorityLevel === 1;\n  const isLevel2 = !isAdmin && user?.priorityLevel === 2;\n  const isLevel3 = !isAdmin && user?.priorityLevel === 3;')

# Disable status dropdown if not admin and not level 1
c = c.replace('disabled={isStaff || updatingStatus || isReadOnlyQuotation}', 'disabled={(!isAdmin && !isLevel1) || updatingStatus || isReadOnlyQuotation}')

# Hide Revision button if not admin and not level 1
pattern_revision = r'(<\s*Button\s*onClick=\{\(\) => \{\s*if \(isLockedByStatus && !manualEditUnlocked\) return;\s*setRevisionDialogOpen\(true\);\s*\}\}.*?Save As Revision\s*</Button>)'
replacement = r'{ (isAdmin || isLevel1) && (\1) }'
c = re.sub(pattern_revision, replacement, c, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
