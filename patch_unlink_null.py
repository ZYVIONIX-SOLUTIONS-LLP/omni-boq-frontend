
import re

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("productId: undefined,", "productId: null,")
    content = content.replace("productName: undefined,", "productName: null,")
    content = content.replace("activityId: undefined,", "activityId: null,")
    content = content.replace("activityName: undefined,", "activityName: null,")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx")
patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx")

