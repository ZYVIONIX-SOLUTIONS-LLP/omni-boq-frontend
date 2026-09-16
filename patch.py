
import re

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Materials\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import_select = """
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
"""
content = re.sub(r"import \{ Button \} from \"@/components/ui/button\";", import_select.lstrip() + "import { Button } from \"@/components/ui/button\";", content)

content = re.sub(r"ProductListRow,", "ProductListRow,\\n  ProductFilters,", content)

states_to_add = """
  const [filtersData, setFiltersData] = useState<ProductFilters | null>(null);

  // Active filters for API
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [activeSeries, setActiveSeries] = useState<string>("all");
  const [activeAttributes, setActiveAttributes] = useState<Record<string, string>>({});

  // UI filters (draft)
  const [draftCategoryId, setDraftCategoryId] = useState<string>("all");
  const [draftSeries, setDraftSeries] = useState<string>("all");
  const [draftAttributes, setDraftAttributes] = useState<Record<string, string>>({});

  const handleCategoryChange = (val: string) => {
    setDraftCategoryId(val);
    setDraftSeries("all");
    setDraftAttributes({});
  };

  const applyFilters = () => {
    setActiveCategoryId(draftCategoryId);
    setActiveSeries(draftSeries);
    
    const cleanedAttrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(draftAttributes)) {
      if (v !== "all") cleanedAttrs[k] = v;
    }
    setActiveAttributes(cleanedAttrs);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftCategoryId("all");
    setDraftSeries("all");
    setDraftAttributes({});
    setActiveCategoryId("all");
    setActiveSeries("all");
    setActiveAttributes({});
    setPage(1);
  };

  const selectedCategoryData = draftCategoryId !== "all" 
    ? filtersData?.categories.find(c => c.categoryId === draftCategoryId)
    : null;
"""
content = re.sub(r"(const \[error, setError\] = useState\(\"\"\);)", r"\1\n" + states_to_add, content)

load_func = """    try {
      const result = await listProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        scope,
        categoryId: activeCategoryId === "all" ? undefined : activeCategoryId,
        seriesId: activeSeries === "all" ? undefined : activeSeries,
        attributes: Object.keys(activeAttributes).length > 0 ? JSON.stringify(activeAttributes) : undefined,
      });
      setItems(result.items);
      setMeta(result.meta);
      if (result.filters) setFiltersData(result.filters);
      setSelectedIds(new Set());"""
content = re.sub(r"    try \{\s*const result = await listProducts\(\{[\s\S]*?setSelectedIds\(new Set\(\)\);", load_func, content)

content = re.sub(r"\}, \[page, debouncedSearch, scope\]\);", "}, [page, debouncedSearch, scope, activeCategoryId, activeSeries, activeAttributes]);", content)

filters_ui = """
        <div className="flex flex-wrap items-center gap-2 w-full mt-2 lg:mt-0 lg:w-auto">
          <Select value={draftCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px] h-10 bg-white/80 rounded-none border-purple-200/80 shadow-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {filtersData?.categories.map((c: any) => (
                <SelectItem key={c.categoryId} value={c.categoryId}>{c.categoryName || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCategoryData && selectedCategoryData.series.length > 0 && (
            <Select value={draftSeries} onValueChange={setDraftSeries}>
              <SelectTrigger className="w-[160px] h-10 bg-white/80 rounded-none border-purple-200/80 shadow-xs">
                <SelectValue placeholder="Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {selectedCategoryData.series.map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedCategoryData && selectedCategoryData.attributes.map((attr: any) => (
            <Select key={attr.id} value={draftAttributes[attr.id] || "all"} onValueChange={(val) => setDraftAttributes(p => ({...p, [attr.id]: val}))}>
              <SelectTrigger className="w-[140px] h-10 bg-white/80 rounded-none border-purple-200/80 shadow-xs">
                <SelectValue placeholder={attr.name} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any {attr.name}</SelectItem>
                {attr.values.map((v: string) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          <Button onClick={applyFilters} className="h-10 rounded-none bg-purple-700 hover:bg-purple-800 text-white shadow-xs">
            Filter
          </Button>
          {(draftCategoryId !== "all" || draftSeries !== "all" || Object.keys(draftAttributes).length > 0) && (
            <Button variant="outline" onClick={clearFilters} className="h-10 rounded-none border-purple-200/80 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-xs">
              Clear
            </Button>
          )}
        </div>
"""

content = re.sub(r"(<div className=\"relative w-full max-w-xs\">[\s\S]*?</div>)", r"\1\n" + filters_ui, content)

with open(r"c:\Users\pvish\Zyvionix\Omni Projects\omni-boq-frontend\app\(app)\Materials\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)


