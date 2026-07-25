"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, Hammer, Loader2, Sparkles } from "lucide-react";

import Spreadsheet from "@/components/spreadsheet/Spreadsheet";
import { useSpreadsheetStore } from "@/components/spreadsheet/store/spreadsheetStore";
import { cellKey } from "@/components/spreadsheet/utils/cellUtils";
import { getActivity, updateActivity, Activity, ActivityRequirementOption } from "@/app/lib/api/activities";
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

/** One alternate make configured for a spreadsheet row, keyed by row index. Rows absent from
 *  this map behave exactly as before (a single plain material, no dropdown). */
interface RowMakeOption {
  variantId: string;
  label: string;
  mrp: number | null;
}
interface RowMakes {
  options: RowMakeOption[];
  defaultVariantId: string;
}

function makeLabel(variant: FlattenedVariant): string {
  return `${variant.manufacturerName} — ${variant.displayName}`;
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
  const [rowMakes, setRowMakes] = useState<Map<number, RowMakes>>(new Map());
  // The categoryId each loaded requirement row originally had, keyed by row index — used as
  // the save-time fallback when a row's free-text description doesn't string-match any catalog
  // variant's displayName (very common for hand-typed legacy descriptions), instead of a
  // hardcoded category id that may not exist and would violate the categoryId FK constraint.
  const originalCategoryByRow = useRef<Map<number, string>>(new Map());

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
            categoryId: p.categoryId || "",
            categoryName: p.category?.name || p.categoryName || "—",
            manufacturerId: p.manufacturerId || "",
            manufacturerName: p.manufacturer?.name || p.manufacturerName || "—",
            seriesId: p.seriesId || "",
            seriesName: p.series?.name || "—",
          });
        });
      });
      setFlatVariants(flattened);

      // Derive the multi-make dropdown state from the DB requirements regardless of which
      // branch below actually loads the sheet — an activity reopened after a previous save
      // still needs its configured makes restored, not just its raw sheetData cells.
      const loadedRowMakes = new Map<number, RowMakes>();
      const rowDefaults = new Map<number, { description: string; mrp: number }>();
      const loadedCategoryByRow = new Map<number, string>();
      (actData.requirements ?? []).forEach((req, idx) => {
        const r = idx + 2;
        loadedCategoryByRow.set(r, req.categoryId);
        if (!req.options || req.options.length === 0) return;
        const options: RowMakeOption[] = req.options
          .filter((o) => o.variant)
          .map((o) => {
            const v = o.variant!;
            const manufacturerName = v.product?.manufacturer?.name ?? "—";
            const productName = v.product?.name ?? "";
            const displayName =
              v.name && v.name !== "Default" && v.name !== productName
                ? `${productName} - ${v.name}`
                : productName;
            return {
              variantId: o.variantId,
              label: `${manufacturerName} — ${displayName}`,
              mrp: v.priceMrp != null ? Number(v.priceMrp) : null,
            };
          });
        const defaultOpt = req.options.find((o) => o.isDefault) ?? req.options[0];
        if (options.length === 0 || !defaultOpt) return;
        loadedRowMakes.set(r, { options, defaultVariantId: defaultOpt.variantId });
        const defaultLabelOption = options.find((o) => o.variantId === defaultOpt.variantId);
        if (defaultLabelOption) {
          rowDefaults.set(r, {
            description: defaultLabelOption.label,
            mrp: defaultLabelOption.mrp ?? 0,
          });
        }
      });
      setRowMakes(loadedRowMakes);
      originalCategoryByRow.current = loadedCategoryByRow;

      // Initialize spreadsheet cells (handles both the current multi-sheet
      // workbook shape and the single-sheet shape saved before sheet tabs existed)
      const rawSheetData = actData.sheetData as { cells?: unknown; sheets?: unknown } | null | undefined;
      if (rawSheetData && (rawSheetData.sheets || rawSheetData.cells)) {
        store.loadWorkbook(actData.sheetData);
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

            const defaults = rowDefaults.get(r);
            let description = req.description;
            let mrp = 0;
            if (defaults) {
              description = defaults.description;
              mrp = defaults.mrp;
            } else {
              const matchedVar = flattened.find(
                (v) => v.displayName.toLowerCase() === req.description.toLowerCase()
              );
              mrp = matchedVar ? Number(matchedVar.mrp) : 0;
            }

            newCells.set(cellKey(r, 0), { value: String(idx + 1), format: { hAlign: "center" } });
            newCells.set(cellKey(r, 1), { value: description, format: { hAlign: "left" } });
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

    // Requirements + material/labour costs are always read from the primary (first)
    // sheet — if the user happened to be on a different tab, hop there first and
    // back afterwards so Save doesn't silently read the wrong sheet's cells.
    const primarySheetId = store.sheets[0]?.id;
    const originalSheetId = store.activeSheetId;
    if (primarySheetId && primarySheetId !== originalSheetId) {
      store.switchToSheet(primarySheetId);
    }

    try {
      const allVars = flatVariants;
      const requirementsList = [];

      // Extract requirements from row 3 (index 2) onwards
      for (let r = 2; r < 200; r++) {
        const desc = store.getCellData(r, 1)?.value;
        if (!desc || desc.trim() === "") continue;

        const unit = store.getCellData(r, 2)?.value || "NOS";
        const quantity = Number(store.getCellData(r, 3)?.value || 0);
        const makes = rowMakes.get(r);

        // Multi-make rows: resolve categoryId from the default variant directly, since the
        // cell text ("Brand — Product - Variant") won't string-match flatVariants.displayName.
        const matched = makes
          ? allVars.find((v) => v.id === makes.defaultVariantId)
          : allVars.find((v) => v.displayName.toLowerCase() === desc.toLowerCase());
        // Fall back to whatever category this row already had (common for hand-typed
        // descriptions that won't string-match a catalog variant), then to any real
        // category as a last resort — never a hardcoded id, which may not exist and
        // would violate the categoryId foreign key on save.
        const categoryId =
          matched?.categoryId ?? originalCategoryByRow.current.get(r) ?? categories[0]?.id ?? "";

        requirementsList.push({
          categoryId,
          description: desc,
          unit: unit as any,
          quantity,
          options: makes
            ? makes.options.map((o) => ({
                variantId: o.variantId,
                isDefault: o.variantId === makes.defaultVariantId,
              }))
            : undefined,
        });
      }

      // Persist whichever tab the user was actually looking at, not the primary
      // sheet we hopped to above just to read costs/requirements.
      const sheetData = { ...store.serializeWorkbook(), activeSheetId: originalSheetId };

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
      if (primarySheetId && primarySheetId !== originalSheetId) {
        store.switchToSheet(originalSheetId);
      }
      setSaving(false);
    }
  };

  /** Adds the checked materials as ONE row (not one row each) — the first checked item
   *  becomes the default make; all of them become switchable alternates for that line via
   *  the "Configured Makes" panel. This is the only "add" path now: checking a single item
   *  and adding it behaves the same as before (one row, no dropdown), and checking several
   *  makes of the same requirement (e.g. Legrand/Schneider switch) combines them into one
   *  row instead of creating separate, unlinked rows. */
  const addSelectedAsAlternates = () => {
    if (selectedIds.length === 0) return;
    const chosen = selectedIds
      .map((vId) => flatVariants.find((v) => v.id === vId))
      .filter((v): v is FlattenedVariant => Boolean(v));
    if (chosen.length === 0) return;

    const newCells = new Map(store.cells);
    let r = 2;
    while (true) {
      const descVal = newCells.get(cellKey(r, 1))?.value;
      if (!descVal || descVal.trim() === "") break;
      r++;
    }

    const defaultVariant = chosen[0];
    const slNo = r - 1;
    newCells.set(cellKey(r, 0), { value: String(slNo), format: { hAlign: "center" } });
    newCells.set(cellKey(r, 1), { value: makeLabel(defaultVariant), format: { hAlign: "left" } });
    newCells.set(cellKey(r, 2), { value: defaultVariant.unit, format: { hAlign: "center" } });
    newCells.set(cellKey(r, 3), { value: "1.00", format: { hAlign: "center", numberFormat: "number2" } });
    newCells.set(cellKey(r, 5), {
      value: String(defaultVariant.mrp || 0),
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 6), { value: "60.00", format: { hAlign: "center", numberFormat: "number" } });
    newCells.set(cellKey(r, 7), {
      value: `=F${r + 1}*(1-G${r + 1}/100)`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 8), { value: `=D${r + 1}`, format: { hAlign: "center", numberFormat: "number2" } });
    newCells.set(cellKey(r, 9), {
      value: `=H${r + 1}*I${r + 1}`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 10), { value: "1.16", format: { hAlign: "center" } });
    newCells.set(cellKey(r, 11), {
      value: `=J${r + 1}*K${r + 1}`,
      format: { hAlign: "right", numberFormat: "number2" },
    });
    newCells.set(cellKey(r, 12), { value: "0.00", format: { hAlign: "right", numberFormat: "number2" } });

    store.loadSheet(newCells, store.rowCount, store.colCount);
    setRowMakes((prev) => {
      const next = new Map(prev);
      next.set(r, {
        defaultVariantId: defaultVariant.id,
        options: chosen.map((v) => ({ variantId: v.id, label: makeLabel(v), mrp: v.mrp })),
      });
      return next;
    });
    setSelectedIds([]);
  };

  /** Switches a configured row's default make — rewrites that row's description + price
   *  cells to the newly-picked make, live, right in the activity editor. */
  const switchRowDefaultMake = (row: number, variantId: string) => {
    const makes = rowMakes.get(row);
    if (!makes) return;
    const option = makes.options.find((o) => o.variantId === variantId);
    if (!option) return;

    const newCells = new Map(store.cells);
    newCells.set(cellKey(row, 1), { value: option.label, format: { hAlign: "left" } });
    newCells.set(cellKey(row, 5), {
      value: String(option.mrp ?? 0),
      format: { hAlign: "right", numberFormat: "number2" },
    });
    store.loadSheet(newCells, store.rowCount, store.colCount);

    setRowMakes((prev) => {
      const next = new Map(prev);
      next.set(row, { ...makes, defaultVariantId: variantId });
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Brand list scoped to whichever makes actually exist in the selected category (e.g. a
  // "Switch" category with only Legrand + Schneider stock shows just those two brands).
  const availableManufacturers =
    selectedCat === "all"
      ? manufacturers
      : manufacturers.filter((m) => flatVariants.some((v) => v.categoryId === selectedCat && v.manufacturerId === m.id));

  // Series list scoped to category + selected brand.
  const filteredSeriesList = seriesList.filter((s) => {
    if (selectedMfr !== "all" && s.manufacturerId !== selectedMfr) return false;
    if (selectedCat === "all") return true;
    return flatVariants.some(
      (v) => v.categoryId === selectedCat && v.seriesId === s.id && (selectedMfr === "all" || v.manufacturerId === selectedMfr)
    );
  });

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
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50/50">
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
        isFullscreen ? "w-screen h-screen p-2" : "h-[calc(100vh-0rem)] w-full"
      }`}
    >
      {/* Sub Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <>
              <button
                onClick={() => router.push("/superadmin/Activities")}
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
              <Select
                value={selectedCat}
                items={{ all: "Category", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }}
                onValueChange={(val) => {
                  const nextCat = val || "all";
                  setSelectedCat(nextCat);
                  setSelectedIds([]);
                  // Brand/Series may no longer apply under the new category — reset them
                  // rather than silently filtering to an empty list.
                  if (
                    selectedMfr !== "all" &&
                    !manufacturers.some(
                      (m) => m.id === selectedMfr && flatVariants.some((v) => v.categoryId === nextCat && v.manufacturerId === m.id)
                    )
                  ) {
                    setSelectedMfr("all");
                    setSelectedSeries("all");
                  }
                }}
              >
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

              <Select
                value={selectedMfr}
                items={{ all: "Brand", ...Object.fromEntries(availableManufacturers.map((m) => [m.id, m.name])) }}
                onValueChange={(val) => {
                  setSelectedMfr(val || "all");
                  setSelectedSeries("all");
                }}
              >
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="all">Brand</SelectItem>
                  {availableManufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSeries}
                items={{ all: "Series", ...Object.fromEntries(filteredSeriesList.map((s) => [s.id, s.name])) }}
                onValueChange={(val) => setSelectedSeries(val || "all")}
              >
                <SelectTrigger className="h-8 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Series" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  <SelectItem value="all">Series</SelectItem>
                  {filteredSeriesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCat === "all" && (
              <p className="text-[10px] text-muted-foreground bg-slate-50 border border-border rounded-lg px-2 py-1.5">
                Pick a Category above, then check the make(s) you want for that requirement.
              </p>
            )}

            {/* Add selected checkbox(es) as one row — 1 checked = a plain line, 2+ checked =
                one line with switchable alternate makes (all from the same category/series filter). */}
            {selectedIds.length > 0 && (
              <Button
                onClick={addSelectedAsAlternates}
                className="w-full h-8.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2"
              >
                {selectedIds.length === 1
                  ? "Add to Sheet"
                  : `Add to Sheet — ${selectedIds.length} Makes`}
              </Button>
            )}
          </div>

          {/* Configured multi-make rows */}
          {rowMakes.size > 0 && (
            <div className="border-b border-border bg-white shrink-0 p-3 space-y-2 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold text-foreground">Configured Makes</h3>
              {Array.from(rowMakes.entries())
                .sort(([a], [b]) => a - b)
                .map(([row, makes]) => (
                  <div key={row} className="rounded-lg border border-border bg-slate-50/50 p-2 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      Row {row - 1} · {makes.options.length} makes
                    </p>
                    <select
                      value={makes.defaultVariantId}
                      onChange={(e) => switchRowDefaultMake(row, e.target.value)}
                      className="w-full h-7 rounded-md border border-border bg-white text-[11px] px-1.5"
                    >
                      {makes.options.map((o) => (
                        <option key={o.variantId} value={o.variantId}>
                          {o.label} — ₹{(o.mrp ?? 0).toLocaleString("en-IN")}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          )}

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
