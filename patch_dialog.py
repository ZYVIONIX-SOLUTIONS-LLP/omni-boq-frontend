
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\components\quotations\QuotationItemMaterialDialog.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Hide Trash bin if isLinkedActivity
content = content.replace("<td className=\"px-2 py-2 text-center\">\n                          <Button", "{!activity && (\n                        <td className=\"px-2 py-2 text-center\">\n                          <Button")
content = content.replace("<Trash2 className=\"w-4 h-4\" />\n                          </Button>\n                        </td>", "<Trash2 className=\"w-4 h-4\" />\n                          </Button>\n                        </td>\n                      )}")
# Also add empty th for alignment
content = content.replace("<th className=\"px-2 py-3 font-semibold text-slate-700 text-xs w-10 text-center\"></th>", "{!activity && <th className=\"px-2 py-3 font-semibold text-slate-700 text-xs w-10 text-center\"></th>}")

# 2. Hide Add Material Row if isLinkedActivity
add_row = """              <div className="p-4 border-t border-slate-100 flex items-center gap-4 bg-white/50">
                <Button
                  variant="outline"
                  onClick={() => {"""
content = content.replace(add_row, "              {!activity && (\n" + add_row)

end_add_row = """                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Material Row
                </Button>
              </div>"""
content = content.replace(end_add_row, end_add_row + "\n              )}")

# 3. Add Badge in Header
header = """            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Configure Materials
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1">
              {activity?.name}
            </DialogDescription>"""
new_header = """            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              {activity ? "Configure Activity Requirements" : "Configure Custom Materials"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              {activity ? (
                <>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold border border-purple-200">Linked Activity</span>
                  {activity.name}
                </>
              ) : (
                 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">Custom Activity</span>
              )}
            </DialogDescription>"""
content = content.replace(header, new_header)

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\components\quotations\QuotationItemMaterialDialog.tsx", "w", encoding="utf-8") as f:
    f.write(content)

