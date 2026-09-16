
import re

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the Change button for Material (which has shrink-0 and setLinkingIdx)
    # We will replace its onClick and content.
    
    # We can use regex to find all <Button ... <Link ... /> Change </Button> and replace them.
    pattern = re.compile(
        r"<Button[^>]*?onClick=\{\(\) => \{\s*setLinkingIdx\(idx\);\s*setLinkDialogOpen\(true\);\s*\}\}[^>]*?>\s*<Link[^>]*?/>\s*Change\s*</Button>",
        re.DOTALL
    )
    
    def repl(m):
        btn = m.group(0)
        btn = btn.replace("setLinkingIdx(idx);", "")
        btn = btn.replace("setLinkDialogOpen(true);", "handleUnlinkRow(idx)")
        btn = btn.replace("<Link ", "<Unlink ")
        btn = btn.replace("/> Change", "/> Unlink")
        # Change class colors to red
        btn = btn.replace("text-slate-600", "text-red-600")
        btn = btn.replace("border-slate-200", "border-red-200")
        btn = btn.replace("bg-slate-50", "bg-red-50")
        btn = btn.replace("hover:bg-slate-100", "hover:bg-red-100")
        return btn

    content = pattern.sub(repl, content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx")
patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx")

