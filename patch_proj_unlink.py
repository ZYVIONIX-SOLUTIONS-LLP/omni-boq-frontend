
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Link } from \"lucide-react\";", "Link, Unlink } from \"lucide-react\";")

change_btn_activity = """                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isReadOnlyProject}
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
                                  disabled={isReadOnlyProject}
                                  onClick={() => handleUnlinkRow(idx)}
                                  className="h-5 px-1.5 text-[10px] font-bold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 rounded-none cursor-pointer shadow-2xs"
                                >
                                  <Unlink className="w-3 h-3 mr-0.5" /> Unlink
                                </Button>"""

content = content.replace(change_btn_activity, unlink_btn)

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Projects\[id]\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

