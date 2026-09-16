
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\components\quotations\QuotationItemMaterialDialog.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_filter_1 = """                          // @ts-ignore
                          const pVal = p.attributes?.[key];
                          if (Array.isArray(val)) {
                            if (!val.some(v => String(pVal ?? "").trim().toLowerCase() === String(v).trim().toLowerCase())) return false;
                          } else {
                            if (String(pVal ?? "").trim().toLowerCase() !== String(val ?? "").trim().toLowerCase()) return false;
                          }"""

new_filter_1 = """                          // @ts-ignore
                          const pVal = p.attributes?.[key];
                          const pVals = Array.isArray(pVal) ? pVal.map((x: any) => String(x ?? "").trim().toLowerCase()) : [String(pVal ?? "").trim().toLowerCase()];
                          if (Array.isArray(val)) {
                            const reqVals = val.map((v: any) => String(v).trim().toLowerCase());
                            if (!reqVals.some((v: any) => pVals.includes(v))) return false;
                          } else {
                            const reqVal = String(val ?? "").trim().toLowerCase();
                            if (!pVals.includes(reqVal)) return false;
                          }"""

content = content.replace(old_filter_1, new_filter_1)

old_filter_2 = """                   // @ts-ignore
                   const pVal = p.attributes?.[key];
                   if (Array.isArray(val)) {
                     if (!val.some(v => normalizeAttr(pVal) === normalizeAttr(v))) return false;
                   } else {
                     if (normalizeAttr(pVal) !== normalizeAttr(val)) return false;
                   }"""
                   
new_filter_2 = """                   // @ts-ignore
                   const pVal = p.attributes?.[key];
                   const pVals = Array.isArray(pVal) ? pVal.map((x: any) => normalizeAttr(x)) : [normalizeAttr(pVal)];
                   if (Array.isArray(val)) {
                     if (!val.some((v: any) => pVals.includes(normalizeAttr(v)))) return false;
                   } else {
                     if (!pVals.includes(normalizeAttr(val))) return false;
                   }"""

content = content.replace(old_filter_2, new_filter_2)

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\components\quotations\QuotationItemMaterialDialog.tsx", "w", encoding="utf-8") as f:
    f.write(content)

