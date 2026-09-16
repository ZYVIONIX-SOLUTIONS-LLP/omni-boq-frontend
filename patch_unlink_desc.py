
import re

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Clear description when unlinking, so the user sees a visible change.
    unlink_update = """    updateItem(idx, {
      rate: 0,
      amount: 0,
      description: "",
      snapshotData: {"""
      
    old_unlink = """    updateItem(idx, {
      rate: 0,
      amount: 0,
      snapshotData: {"""

    content = content.replace(old_unlink, unlink_update)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx")
patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx")

