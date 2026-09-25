import os

path = r"app\(app)\Quotations\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

tax_old = """<input
                                  type="number" step="any"
                                  disabled={isReadOnlyQuotation}
                                  value={it.taxRate}
                                  onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) || 0 })}
                                  className="h-8 text-xs border rounded-md px-2 text-right bg-white border-slate-200 hover:border-slate-300 focus:border-primary shadow-sm disabled:opacity-70"
                                />"""

tax_new = """<select
                                  disabled={isReadOnlyQuotation}
                                  value={it.taxRate}
                                  onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) || 0 })}
                                  className="h-8 text-xs border rounded-md px-1 bg-white border-slate-200 hover:border-slate-300 focus:border-primary shadow-sm disabled:opacity-70 text-right w-full"
                                >
                                  {[0, 0.25, 3, 5, 12, 18, 28].map(tax => (
                                    <option key={tax} value={tax}>{tax}%</option>
                                  ))}
                                </select>"""

c = c.replace(tax_old, tax_new)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)
