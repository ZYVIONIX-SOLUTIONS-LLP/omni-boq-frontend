
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

change_btn_material = """                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isReadOnlyQuotation}
                                  onClick={() => {
                                    setLinkingIdx(idx);
                                    setLinkDialogOpen(true);
                                  }}
                                  className="h-5 px-1.5 text-[10px] font-bold text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-none cursor-pointer shadow-2xs"
                                >
                                  <Link className="w-3 h-3 mr-0.5" /> Change
                                </Button>"""

unlink_btn = """                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isReadOnlyQuotation}
                                  onClick={() => handleUnlinkRow(idx)}
                                  className="h-5 px-1.5 text-[10px] font-bold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 rounded-none cursor-pointer shadow-2xs"
                                >
                                  <Unlink className="w-3 h-3 mr-0.5" /> Unlink
                                </Button>"""

# We only want to replace the FIRST occurrence which should be the material one (the second one was already replaced in previous script)
content = content.replace(change_btn_material, unlink_btn, 1)

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Quotations\[id]\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

