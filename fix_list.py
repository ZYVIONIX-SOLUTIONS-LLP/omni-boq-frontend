import os

path = r"app\(app)\Quotations\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add get user and roles to page.tsx
if "const user = getUser();" not in c:
    c = c.replace('const [search, setSearch] = useState("");', 'const [search, setSearch] = useState("");\n  const user = getUser();\n  const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPERADMIN");\n  const isLevel3 = !isAdmin && user?.priorityLevel === 3;')

# Hide New Quotation
if "{!isLevel3 && (" not in c:
    c = c.replace('<Button\n              onClick={() => setCreateOpen(true)}', '{!isLevel3 && (\n            <Button\n              onClick={() => setCreateOpen(true)}')
    c = c.replace('New Quotation\n            </Button>\n          </div>', 'New Quotation\n            </Button>\n            )}\n          </div>')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
