"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, Hammer, Loader2, Sparkles } from "lucide-react";

import Spreadsheet from "@/components/spreadsheet/Spreadsheet";
import { useSpreadsheetStore } from "@/components/spreadsheet/store/spreadsheetStore";
import { cellKey } from "@/components/spreadsheet/utils/cellUtils";
import { getActivity, updateActivity, Activity } from "@/app/lib/api/activities";
import {
  listProducts,
  manufacturersApi,
  categoriesApi,
  seriesApi,
} from "@/app/app/../../app/lib/catalog/api";
import type { Manufacturer, CatalogCategory, ProductSeries } from "@/app/lib/catalog/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface FlattenedVariant {
  id: string;
  productId: string;
  productName: string;
  name: string;
  displayName: string;
  modelCode: string | null;
  mrp: number | null;
  unit: string;
  categoryId: string;
  categoryName: string;
  manufacturerId: string;
  manufacturerName: string;
  seriesId: string;
  seriesName: string;
}

export default function ActivityEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSpreadsheetStore();
  const pageRef = useRef<HTMLDivElement>(null);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [flatVariants, setFlatVariants] = useState<FlattenedVariant[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedMfr, setSelectedMfr] = useState("all");
  const [selectedSeries, setSelectedSeries] = useState("all");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Monitor fullscreen change for responsive styling
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Load activity and master catalog data
  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [actData, productsData, catData, mfrData, serData] = await Promise.all([
        getActivity(id),
        listProducts({ limit: 1000 }),
        categoriesApi.list({ limit: 1000 }),
        manufacturersApi.list({ limit: 1000 }),
        seriesApi.list({ limit: 1000 }),
      ]);

      setActivity(actData);
      setCategories(catData.items);
      setManufacturers(mfrData.items);
      setSeriesList(serData.items);

      // Flatten products to variants
      const flattened: FlattenedVariant[] = [];
      productsData.items.forEach((p) => {
        const summaries = p.variantSummaries || [];
        summaries.forEach((v) => {
          const displayName =
            v.name && v.name !== "Default" && v.name !== p.name
              ? `${p.name} - ${v.name}`
              : p.name;
          flattened.push({
            id: v.id,
            productId: p.id,
            productName: p.name,
            name: v.name,
            displayName,
            modelCode: v.modelCode,
            mrp: v.mrp,
            unit: p.unitName || "NOS",
            categoryId: p.categoryId,
            categoryName: p.category?.name || "—",
            manufacturerId: p.manufacturerId,
            manufacturerName: p.manufacturer?.name || "—",
            seriesId: p.seriesId || "",
            seriesName: p.series?.name || "—",
          });
        });
      });
      setFlatVariants(flattened);

      // Initialize spreadsheet cells
      if (actData.sheetData && actData.sheetData.cells) {
        const loadedCells = new Map<string, any>(actData.sheetData.cells);
        store.loadSheet(loadedCells, actData.sheetData.rowCount, actData.sheetData.colCount);
      } else {
        const newCells = new Map<string, any>(store.cells);

        // Clear existing cells below row 0
        newCells.forEach((_, key) => {
          const [rStr] = key.split(",");
          const r = parseInt(rStr, 10);
          if (r > 0) newCells.delete(key);
        });

        // 1. Summary Row (Row 2 - index 1)
        newCells.set(cellKey(1, 0), { value: "a", format: { bold: true, hAlign: "center" } });
        newCells.set(cellKey(1, 1), {
          value: actData.name,
          format: { bold: true, hAlign: "left" },
        });

        newCells.set(cellKey(1, 11), {
          value: "=SUM(L3:L100)",
          format: { bold: true, hAlign: "right", numberFormat: "number2" },
        });
        newCells.set(cellKey(1, 12), {
          value: "=SUM(M3:M100)",
          format: { bold: true, hAlign: "right", numberFormat: "number2" },
        });

        // 2. Load existing requirements from DB if any
        if (actData.requirements && actData.requirements.length > 0) {
          actData.requirements.forEach((req, idx) => {
            const r = idx + 2; // start at row index 2 (Row 3)
            const matchedVar = flattened.find(
              (v) => v.displayName.toLowerCase() === req.description.toLowerCase()
            );
            const mrp = matchedVar ? Number(matchedVar.mrp) : 0;

            newCells.set(cellKey(r, 0), { value: String(idx + 1), format: { hAlign: "center" } });
            newCells.set(cellKey(r, 1), { value: req.description, format: { hAlign: "left" } });
            newCells.set(cellKey(r, 2), { value: req.unit, format: { hAlign: "center" } });
            newCells.set(cellKey(r, 3), {
              value: String(req.quantity),
              format: { hAlign: "center", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 5), {
              value: String(mrp),
              format: { hAlign: "right", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 6), {
              value: "60.00",
              format: { hAlign: "center", numberFormat: "number" },
            });
            newCells.set(cellKey(r, 7), {
              value: `=F${r + 1}*(1-G${r + 1}/100)`,
              format: { hAlign: "right", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 8), {
              value: `=D${r + 1}`,
              format: { hAlign: "center", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 9), {
              value: `=H${r + 1}*I${r + 1}`,
              format: { hAlign: "right", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 10), {
              value: "1.16",
              format: { hAlign: "center" },
            });
            newCells.set(cellKey(r, 11), {
              value: `=J${r + 1}*K${r + 1}`,
              format: { hAlign: "right", numberFormat: "number2" },
            });
            newCells.set(cellKey(r, 12), {
              value: "0.00",
              format: { hAlign: "right", numberFormat: "number2" },
            });
          });
        }

        store.loadSheet(newCells, store.rowCount, store.colCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Save the spreadsheet state to activity API
  const handleSave = async () => {
    if (!activity) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const allVars = flatVariants;
      const requirementsList = [];

      // Extract requirements from row 3 (index 2) onwards
      for (let r = 2; r < 200; r++) {
        const desc = store.getCellData(r, 1)?.value;
        if (!desc || desc.trim() === "") continue;

        const unit = store.getCellData(r, 2)?.value || "NOS";
        const quantity = Number(store.getCellData(r, 3)?.value || 0);

        // Find categoryId by looking up in materials catalog
        const matched = allVars.find((v) => v.displayName.toLowerCase() === desc.toLowerCase());
        const categoryId = matched ? matched.categoryId : "cat-wire"; // fallback category

        requirementsList.push({
          categoryId,
          description: desc,
          unit: unit as any,
          quantity,
        });
      }

      const sheetData = {
        rowCount: store.rowCount,
        colCount: store.colCount,
        cells: Array.from(store.cells.entries()),
      };

      const materialCost = Number(store.getEvaluatedCell(1, 11).raw || 0);
      const labourCost = Number(store.getEvaluatedCell(1, 12).raw || 0);

      const updated = await updateActivity(activity.id, {
        requirements: requirementsList,
        sheetData,
        materialCost,
        labourCost,
      });

      setActivity(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Add material from catalog to spreadsheet
  const addMaterialToSheet = (variant: FlattenedVariant) => {
    const newCells = new Map(store.cells);

    // Find first empty row index starting from Row 3 (index 2)
    let r = 2;
    while (true) {
      const descVal = newCells.get(cellKey(r, 1))?.value;
      if (!descVal || descVal.trim() === "") {
        break;
      }
      r++;
    }

    // Populate row cells
    const slNo = r - 1;
    newCells.set(cellKey(r, 0), { value: String(slNo), format: { hAlign: "center" } });
    newCells.set(cellKey(r, 1), { value: variant.displayName, format: { hAlign: "left" } });
    newCells.set(cellKey(r, 2), { value: variant.unit, format: { hAlign: "center" } });
    newCells.set(cellKey(r, 3), {
      value: "1.00",
      format: { hAlign: "center", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 5), {
      value: String(variant.mrp || 0),
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 6), {
      value: "60.00",
      format: { hAlign: "center", numberFormat: "number" },
    });
    newCells.set(cellKey(r, 7), {
      value: `=F${r + 1}*(1-G${r + 1}/100)`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 8), {
      value: `=D${r + 1}`,
      format: { hAlign: "center", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 9), {
      value: `=H${r + 1}*I${r + 1}`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 10), {
      value: "1.16",
      format: { hAlign: "center" },
    });
    newCells.set(cellKey(r, 11), {
      value: `=J${r + 1}*K${r + 1}`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 12), {
      value: "0.00",
      format: { hAlign: "right", numberFormat: "number2" },
    });

    store.loadSheet(newCells, store.rowCount, store.colCount);
  };

  const addSelectedMaterialsToSheet = () => {
    if (selectedIds.length === 0) return;
    const newCells = new Map(store.cells);

    // Find first empty row index starting from Row 3 (index 2)
    let r = 2;
    while (true) {
      const descVal = newCells.get(cellKey(r, 1))?.value;
      if (!descVal || descVal.trim() === "") {
        break;
      }
      r++;
    }

    selectedIds.forEach((vId) => {
      const variant = flatVariants.find((v) => v.id === vId);
      if (!variant) return;

      const slNo = r - 1;
      newCells.set(cellKey(r, 0), { value: String(slNo), format: { hAlign: "center" } });
      newCells.set(cellKey(r, 1), { value: variant.displayName, format: { hAlign: "left" } });
      newCells.set(cellKey(r, 2), { value: variant.unit, format: { hAlign: "center" } });
      newCells.set(cellKey(r, 3), {
        value: "1.00",
        format: { hAlign: "center", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 5), {
        value: String(variant.mrp || 0),
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 6), {
        value: "60.00",
        format: { hAlign: "center", numberFormat: "number" },
      });
      newCells.set(cellKey(r, 7), {
        value: `=F${r + 1}*(1-G${r + 1}/100)`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 8), {
        value: `=D${r + 1}`,
        format: { hAlign: "center", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 9), {
        value: `=H${r + 1}*I${r + 1}`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 10), {
        value: "1.16",
        format: { hAlign: "center" },
      });
      newCells.set(cellKey(r, 11), {
        value: `=J${r + 1}*K${r + 1}`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(r, 12), {
        value: "0.00",
        format: { hAlign: "right", numberFormat: "number2" },
      });

      r++;
    });

    store.loadSheet(newCells, store.rowCount, store.colCount);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filter materials catalog
  const filteredVariants = flatVariants.filter((v) => {
    const searchTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch =
      searchTokens.length === 0 ||
      searchTokens.every(
        (token) =>
          v.displayName.toLowerCase().includes(token) ||
          v.productName.toLowerCase().includes(token) ||
          (v.modelCode ?? "").toLowerCase().includes(token) ||
          v.name.toLowerCase().includes(token)
      );
    const matchesCat = selectedCat === "all" || v.categoryId === selectedCat;
    const matchesMfr = selectedMfr === "all" || v.manufacturerId === selectedMfr;
    const matchesSeries = selectedSeries === "all" || v.seriesId === selectedSeries;
    
    return matchesSearch && matchesCat && matchesMfr && matchesSeries;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading activity sheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className={`flex flex-col bg-white overflow-hidden ${
        isFullscreen ? "w-screen h-screen p-2" : "h-[calc(100vh-3rem)] w-full"
      }`}
    >
      {/* Sub Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <>
              <button
                onClick={() => router.push("/Activities")}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Activities
              </button>
              <div className="h-4 w-px bg-border mx-1" />
            </>
          )}
          <h2 className="text-sm font-bold text-foreground">
            {activity?.code} — <span className="text-muted-foreground font-medium">{activity?.name}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg shadow-sm border border-emerald-100 transition-all animate-in fade-in slide-in-from-top-1">
              <Sparkles className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-xl h-9 px-4 font-semibold bg-primary text-white hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Activity
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Spreadsheet Component */}
        <div className="flex-1 min-w-0 h-full relative">
          <Spreadsheet fullscreenElementRef={pageRef} />
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-border h-full shrink-0" />

        {/* Material Catalog Sidebar */}
        <div className="w-[330px] h-full flex flex-col bg-slate-50/50 shrink-0 border-l border-border select-none">
          <div className="p-3 border-b border-border bg-white shrink-0 space-y-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              Material Catalog
            </h3>
            
            {/* Search Input */}
            <Input
              placeholder="Search code, product, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 rounded-lg bg-slate-50 border-border text-xs focus-visible:ring-primary/20"
            />
            
            {/* Horizontal Filter Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              <Select value={selectedCat} onValueChange={(val) => setSelectedCat(val || "all")}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="all">Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMfr} onValueChange={(val) => setSelectedMfr(val || "all")}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="all">Brand</SelectItem>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSeries} onValueChange={(val) => setSelectedSeries(val || "all")}>
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Series" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="all">Series</SelectItem>
                  {seriesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Multi-select Action Button */}
            {selectedIds.length > 0 && (
              <Button
                onClick={addSelectedMaterialsToSheet}
                className="w-full mt-2 h-8.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                Add Selected ({selectedIds.length}) to Sheet
              </Button>
            )}
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredVariants.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No materials found matching filters
              </div>
            ) : (
              filteredVariants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-white p-2.5 shadow-sm hover:border-primary/20 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(v.id)}
                    onChange={() => handleToggleSelect(v.id)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="text-[11px] font-bold text-foreground leading-tight">
                        {v.displayName}
                      </h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                        Code: {v.modelCode || "—"} • Unit: {v.unit}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Brand: {v.manufacturerName} • Series: {v.seriesName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-primary">
                        MRP: ₹{Number(v.mrp || 0).toLocaleString("en-IN")}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => addMaterialToSheet(v)}
                        className="rounded-lg h-7 px-2.5 text-[10px] font-bold border-border bg-slate-50 text-slate-700 hover:bg-primary hover:text-white transition-all hover:shadow-sm"
                        variant="outline"
                      >
                        Add to Sheet
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
