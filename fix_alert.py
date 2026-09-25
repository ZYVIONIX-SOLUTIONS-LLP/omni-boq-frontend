import os

path = r"app\(app)\Company\documents\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("import { toast } from 'sonner';", "")
c = c.replace('toast.success("Document uploaded successfully");', 'alert("Document uploaded successfully");')
c = c.replace('toast.error("Upload failed: " + res.status + " " + errData);', 'alert("Upload failed: " + res.status + "\\n" + errData);')

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
