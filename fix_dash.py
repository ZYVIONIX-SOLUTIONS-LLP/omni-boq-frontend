import os

path = r"app\(app)\Dashboard\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# Add getUser to Dashboard
if "import { getUser }" not in c:
    c = c.replace('import { listUsers } from "@/app/lib/api/auth";', 'import { listUsers } from "@/app/lib/api/auth";\nimport { getUser } from "@/app/lib/auth-storage";')

# Update useEffect
old_effect = """    useEffect(() => {
      Promise.all([
        listQuotations({ limit: 1000 }),
        listUsers()
      ]).then(([resQ, resU]) => {"""

new_effect = """    useEffect(() => {
      const user = getUser();
      const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPERADMIN");
      
      Promise.all([
        listQuotations({ limit: 1000 }),
        isAdmin ? listUsers().catch(() => []) : Promise.resolve([])
      ]).then(([resQ, resU]) => {"""

if old_effect in c:
    c = c.replace(old_effect, new_effect)
else:
    print("WARNING: old_effect not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
