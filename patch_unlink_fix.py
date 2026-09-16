
import re

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the old handleUnlinkRow
    pattern = re.compile(
        r"const handleUnlinkRow = \(idx: number\) => \{.*?updateItem\(idx, \{.*?\}\);\s*\};",
        re.DOTALL
    )

    new_func = """const handleUnlinkRow = (idx: number) => {
    setActivityRows((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setActivityCustomizations((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });

    updateItem(idx, {
      rate: 0,
      amount: 0,
      description: "",
      snapshotData: {
        ...items[idx]?.snapshotData,
        activityId: null,
        activityName: null,
        productId: null,
        productName: null,
        materialRate: 0,
        labourRate: 0,
      },
    });
  };"""

    content = pattern.sub(new_func, content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx")
patch_file(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx")

