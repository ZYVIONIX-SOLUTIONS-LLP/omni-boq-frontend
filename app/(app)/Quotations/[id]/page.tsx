"use client";

import { useEffect, useState, useCallback, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, Loader2, Sparkles, FolderKanban, Printer, X } from "lucide-react";

import Spreadsheet from "@/components/spreadsheet/Spreadsheet";
import { useSpreadsheetStore } from "@/components/spreadsheet/store/spreadsheetStore";
import { cellKey } from "@/components/spreadsheet/utils/cellUtils";
import { getQuotation, updateQuotation, Quotation } from "@/app/lib/api/quotations";
import { listActivities, Activity, ActivityRequirementOption } from "@/app/lib/api/activities";
import {
  listProducts,
  manufacturersApi,
  categoriesApi,
  seriesApi,
  matchesSpecKeyword,
} from "@/app/lib/catalog/api";
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function QuotationEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const store = useSpreadsheetStore();
  const pageRef = useRef<HTMLDivElement>(null);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [flatVariants, setFlatVariants] = useState<FlattenedVariant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"material" | "activity">("material");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedMfr, setSelectedMfr] = useState("all");
  const [selectedSeries, setSelectedSeries] = useState("all");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Preferred manufacturer (+ optional series) per catalog category — drives which
  // configured make wins when an Activity's multi-make requirement is added below.
  type BrandPreferences = Record<string, { manufacturerId: string; seriesId?: string | null }>;
  const [brandPreferences, setBrandPreferences] = useState<BrandPreferences>({});

  // "Add a preference" mini-form state (sidebar panel)
  const [prefCatId, setPrefCatId] = useState("");
  const [prefMfrId, setPrefMfrId] = useState("");
  const [prefSeriesId, setPrefSeriesId] = useState("");

  // Per-row activity tags ("header" | "detail"), keyed by row index. Lets
  // detail-row detection (brand swap, PDF export filtering) rely on real
  // metadata instead of only sniffing the "↳" description prefix.
  const [activityRowTags, setActivityRowTags] = useState<Record<number, "header" | "detail">>({});

  // Resizable catalog sidebar — drag the divider to trade width between the
  // spreadsheet and the sidebar. Width persists across visits.
  const SIDEBAR_MIN_WIDTH = 260;
  const SIDEBAR_MAX_WIDTH = 720;
  const SIDEBAR_WIDTH_KEY = "omni.quotationSidebarWidth";
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const [isResizing, setIsResizing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const n = Number(saved);
      if (Number.isFinite(n)) setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, n)));
    }
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const containerRect = mainContentRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const newWidth = containerRect.right - moveEvent.clientX;
      setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth)));
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setSidebarWidth((w) => {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Monitor fullscreen change for responsive styling
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Clear selections when switching tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  // Load quotation and catalog databases
  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [quoData, productsData, activitiesData, catData, mfrData, serData] = await Promise.all([
        getQuotation(id),
        listProducts({ limit: 1000 }),
        listActivities({ limit: 1000 }),
        categoriesApi.list({ limit: 1000 }),
        manufacturersApi.list({ limit: 1000 }),
        seriesApi.list({ limit: 1000 }),
      ]);

      setQuotation(quoData);
      setActivities(activitiesData.items);
      setCategories(catData.items);
      setManufacturers(mfrData.items);
      setSeriesList(serData.items);

      if (quoData.brandPreferences) {
        setBrandPreferences(quoData.brandPreferences);
      }
      if (quoData.activityRows) {
        const tags: Record<number, "header" | "detail"> = {};
        for (const [rowStr, val] of Object.entries(quoData.activityRows)) {
          if (val === "header" || val === "detail") tags[Number(rowStr)] = val;
        }
        setActivityRowTags(tags);
      }

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

      // Initialize spreadsheet cells (handles both the current multi-sheet
      // workbook shape and the single-sheet shape saved before sheet tabs existed)
      const rawSheetData = quoData.sheetData as
        | { cells?: unknown; sheets?: unknown }
        | null
        | undefined;
      if (rawSheetData && (rawSheetData.sheets || rawSheetData.cells)) {
        store.loadWorkbook(quoData.sheetData);
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
          value: quoData.project?.name || "Summary Row",
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

  // Save the spreadsheet state and totals to Quotation API
  const handleSave = async () => {
    if (!quotation) return;
    setSaving(true);
    setSaveSuccess(false);

    // Totals are always read from the primary (first) sheet — if the user happened
    // to be on a different tab, hop there first and back afterwards.
    const primarySheetId = store.sheets[0]?.id;
    const originalSheetId = store.activeSheetId;
    if (primarySheetId && primarySheetId !== originalSheetId) {
      store.switchToSheet(primarySheetId);
    }

    try {
      const materialCost = Number(store.getEvaluatedCell(1, 11).raw || 0);
      const labourCost = Number(store.getEvaluatedCell(1, 12).raw || 0);
      const subTotal = materialCost + labourCost;

      // Persist whichever tab the user was actually looking at, not the primary
      // sheet we hopped to above just to read totals.
      const sheetData = { ...store.serializeWorkbook(), activeSheetId: originalSheetId };

      const updated = await updateQuotation(quotation.id, {
        subTotal,
        grandTotal: subTotal,
        sheetData,
        brandPreferences,
        activityRows: activityRowTags,
      });

      setQuotation(updated);
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

  // Export a clean, client-facing BOQ (activity/material rows only, no "↳"
  // detail rows) via the browser's print dialog — "Save as PDF" covers the
  // PDF case, "Print" covers the physical-copy case, no extra dependency.
  const handleExportPdf = () => {
    if (!quotation) return;

    const bodyRows: string[] = [];
    let slCounter = 0;
    for (let r = 2; r < store.rowCount; r++) {
      const desc = String(store.getEvaluatedCell(r, 1).display || "").trim();
      if (!desc) continue;
      const isDetail =
        activityRowTags[r] === "detail" ||
        (activityRowTags[r] === undefined && (desc.startsWith("↳") || desc.startsWith("  ↳")));
      if (isDetail) continue;

      const unit = store.getEvaluatedCell(r, 2).display;
      const qty = store.getEvaluatedCell(r, 3).display;
      const matCost = store.getEvaluatedCell(r, 11).display;
      const labCost = store.getEvaluatedCell(r, 12).display;
      const isHeader = activityRowTags[r] === "header";
      slCounter++;
      bodyRows.push(
        `<tr${isHeader ? ' class="hdr"' : ""}><td class="c">${slCounter}</td><td>${escapeHtml(
          desc
        )}</td><td class="c">${escapeHtml(unit)}</td><td class="c">${escapeHtml(
          qty
        )}</td><td class="r">${escapeHtml(matCost)}</td><td class="r">${escapeHtml(labCost)}</td></tr>`
      );
    }

    const grandMaterial = Number(store.getEvaluatedCell(1, 11).raw || 0);
    const grandLabour = Number(store.getEvaluatedCell(1, 12).raw || 0);
    const grandTotal = grandMaterial + grandLabour;
    const inr = (n: number) => `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Couldn't open the print window — check your browser's pop-up blocker.");
      return;
    }
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>BOQ - ${escapeHtml(quotation.code)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #555; margin-bottom: 16px; }
  .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
  .info div { line-height: 1.5; }
  .info b { display: block; font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; }
  th { background: #f3f3f6; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
  tr.hdr { font-weight: bold; background: #fafafa; }
  td.c { text-align: center; }
  td.r { text-align: right; }
  tfoot td { font-weight: bold; background: #f3f3f6; }
  @media print { @page { margin: 16mm; } }
</style>
</head>
<body>
  <h1>Bill of Quantities</h1>
  <div class="sub">Quotation ${escapeHtml(quotation.code)} &middot; ${new Date(
    quotation.createdAt
  ).toLocaleDateString("en-IN")}</div>
  <div class="info">
    <div><b>Client</b>${escapeHtml(quotation.customer?.name || "—")}<br/>${escapeHtml(
      quotation.customer?.phone || ""
    )}<br/>${escapeHtml(quotation.customer?.address || "")}</div>
    <div><b>Project</b>${escapeHtml(quotation.project?.name || "—")}</div>
  </div>
  <table>
    <thead>
      <tr><th>Sl No</th><th>Item</th><th>Unit</th><th>Qty</th><th>Material Cost</th><th>Labour Cost</th></tr>
    </thead>
    <tbody>
      ${bodyRows.join("\n")}
    </tbody>
    <tfoot>
      <tr><td colspan="4"></td><td class="r">${inr(grandMaterial)}</td><td class="r">${inr(
        grandLabour
      )}</td></tr>
      <tr><td colspan="4"></td><td colspan="2" class="r">Grand Total: ${inr(grandTotal)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // Add a material row to spreadsheet
  const addMaterialRow = (newCells: Map<string, any>, r: number, variant: FlattenedVariant) => {
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
  };

  // Resolve a template requirement to a specific catalog variant, per the category's
  // preferred brand/series.
  const resolveRequirementVariant = (
    req: { categoryId: string; description: string; options?: ActivityRequirementOption[] },
    prefs: BrandPreferences,
    variants: FlattenedVariant[]
  ) => {
    const pref = prefs[req.categoryId];

    // Requirement has configured alternate makes (e.g. Switch: Legrand/Schneider) — pick the
    // one matching the category's preferred brand/series among THOSE options only; fall back
    // to whichever the Activity itself marked as default.
    if (req.options && req.options.length > 0) {
      const optionVariants = req.options
        .map((o) => ({ opt: o, v: variants.find((fv) => fv.id === o.variantId) }))
        .filter((x): x is { opt: ActivityRequirementOption; v: FlattenedVariant } => Boolean(x.v));

      if (pref) {
        const matched = optionVariants.find(
          ({ v }) => v.manufacturerId === pref.manufacturerId && (!pref.seriesId || v.seriesId === pref.seriesId)
        );
        if (matched) return matched.v;
      }

      const defaultOpt = optionVariants.find(({ opt }) => opt.isDefault) ?? optionVariants[0];
      if (defaultOpt) return defaultOpt.v;
      // fall through to the generic category search below if none of the options resolved
    }

    // Simple requirement (no configured makes) — search the whole category by preference,
    // then by spec-keyword match, then just anything in the category.
    const catId = req.categoryId;
    if (pref) {
      const brandVars = variants.filter((v) => {
        if (v.categoryId !== catId || v.manufacturerId !== pref.manufacturerId) return false;
        if (pref.seriesId && v.seriesId !== pref.seriesId) return false;
        return true;
      });
      const matched = brandVars.find((v) => matchesSpecKeyword(v.displayName, req.description));
      if (matched) return matched;
    }

    const matchedFallback = variants.find(
      (v) => v.categoryId === catId && matchesSpecKeyword(v.displayName, req.description)
    );
    return matchedFallback || variants.find((v) => v.categoryId === catId) || null;
  };

  // Add an activity parent-child block to spreadsheet. Returns the row tags
  // ("header" for the parent, "detail" for each material row) so the caller
  // can merge them into activityRowTags state.
  const addActivityParentChild = (
    newCells: Map<string, any>,
    startRow: number,
    act: Activity
  ): Record<number, "header" | "detail"> => {
    const n = act.requirements.length;
    const slNo = startRow - 1;
    const tags: Record<number, "header" | "detail"> = { [startRow]: "header" };

    // 1. Write Parent Activity Header Row (index startRow)
    newCells.set(cellKey(startRow, 0), { value: String(slNo), format: { hAlign: "center", bold: true } });
    newCells.set(cellKey(startRow, 1), { value: act.name, format: { hAlign: "left", bold: true } });
    newCells.set(cellKey(startRow, 2), { value: act.unit, format: { hAlign: "center", bold: true } });
    newCells.set(cellKey(startRow, 3), { value: "1.00", format: { hAlign: "center", bold: true, numberFormat: "number2" } });
    
    const firstChildRow = startRow + 2;
    const lastChildRow = startRow + n + 1;
    newCells.set(cellKey(startRow, 11), {
      value: `=SUM(L${firstChildRow}:L${lastChildRow})`,
      format: { hAlign: "right", bold: true, numberFormat: "number2" },
    });
    newCells.set(cellKey(startRow, 12), {
      value: `=SUM(M${firstChildRow}:M${lastChildRow})`,
      format: { hAlign: "right", bold: true, numberFormat: "number2" },
    });

    // 2. Write Child Material Rows (index startRow + 1 to startRow + n)
    act.requirements.forEach((req, idx) => {
      const childRowIdx = startRow + 1 + idx;
      const childRowSp = childRowIdx + 1; // 1-indexed row number for Excel formulas
      tags[childRowIdx] = "detail";

      // Resolve variant based on brand preferences (and the requirement's own configured makes)
      const variant = resolveRequirementVariant(
        { categoryId: req.categoryId, description: req.description, options: req.options },
        brandPreferences,
        flatVariants
      );
      const displayName = variant
        ? `  ↳ ${variant.manufacturerName} ${variant.displayName}`
        : `  ↳ ${req.description}`;
      const unitSymbol = variant ? variant.unit : req.unit;
      const mrp = variant ? String(variant.mrp || 0) : "0.00";

      // Quantities scale based on the Parent's Qty cell (which is at cell D{startRow + 1})
      const parentQtyCell = `D${startRow + 1}`;
      const reqQty = Number(req.quantity);

      newCells.set(cellKey(childRowIdx, 0), { value: "", format: { hAlign: "center" } });
      newCells.set(cellKey(childRowIdx, 1), { value: displayName, format: { hAlign: "left", italic: true } });
      newCells.set(cellKey(childRowIdx, 2), { value: unitSymbol, format: { hAlign: "center" } });
      newCells.set(cellKey(childRowIdx, 3), {
        value: `=${parentQtyCell}*${reqQty}`,
        format: { hAlign: "center", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 5), {
        value: mrp,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 6), {
        value: "60.00",
        format: { hAlign: "center", numberFormat: "number" },
      });
      newCells.set(cellKey(childRowIdx, 7), {
        value: `=F${childRowSp}*(1-G${childRowSp}/100)`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 8), {
        value: `=D${childRowSp}`,
        format: { hAlign: "center", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 9), {
        value: `=H${childRowSp}*I${childRowSp}`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 10), {
        value: "1.16",
        format: { hAlign: "center" },
      });
      newCells.set(cellKey(childRowIdx, 11), {
        value: `=J${childRowSp}*K${childRowSp}`,
        format: { hAlign: "right", numberFormat: "number2" },
      });
      newCells.set(cellKey(childRowIdx, 12), {
        value: "0.00",
        format: { hAlign: "right", numberFormat: "number2" },
      });
    });

    return tags;
  };

  // Swap material brand or add new material
  const addSingleToSheet = (type: "material" | "activity", id: string) => {
    const newCells = new Map(store.cells);
    const activeRow = store.selection.active.row;
    
    // Check if the selected row is a child material detail row — prefer the
    // real row tag, fall back to the "↳" prefix for rows saved before tags
    // existed.
    const cellBValue = String(store.getCellData(activeRow, 1)?.value || "");
    const isDetailRow =
      activityRowTags[activeRow] === "detail" ||
      (activityRowTags[activeRow] === undefined &&
        (cellBValue.trim().startsWith("↳") || cellBValue.trim().startsWith("  ↳")));

    if (type === "material" && isDetailRow) {
      // Overwrite/swap brand make of selected child row
      const variant = flatVariants.find((v) => v.id === id);
      if (variant) {
        newCells.set(cellKey(activeRow, 1), {
          value: `  ↳ ${variant.manufacturerName} ${variant.displayName}`,
          format: { hAlign: "left", italic: true },
        });
        newCells.set(cellKey(activeRow, 2), { value: variant.unit, format: { hAlign: "center" } });
        newCells.set(cellKey(activeRow, 5), {
          value: String(variant.mrp || 0),
          format: { hAlign: "right", numberFormat: "number2" },
        });
        store.loadSheet(newCells, store.rowCount, store.colCount, store.colWidths, store.rowHeights);
      }
      return;
    }

    // Find first empty row starting from Row 3 (index 2)
    let r = 2;
    while (true) {
      const descVal = newCells.get(cellKey(r, 1))?.value;
      if (!descVal || descVal.trim() === "") {
        break;
      }
      r++;
    }

    if (type === "material") {
      const variant = flatVariants.find((v) => v.id === id);
      if (variant) addMaterialRow(newCells, r, variant);
    } else {
      const act = activities.find((a) => a.id === id);
      if (act) {
        const tags = addActivityParentChild(newCells, r, act);
        setActivityRowTags((prev) => ({ ...prev, ...tags }));
      }
    }

    store.loadSheet(newCells, store.rowCount, store.colCount, store.colWidths, store.rowHeights);
  };

  // Bulk Add to Sheet
  const addSelectedToSheet = () => {
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

    let mergedTags: Record<number, "header" | "detail"> = {};
    selectedIds.forEach((sid) => {
      if (activeTab === "material") {
        const variant = flatVariants.find((v) => v.id === sid);
        if (variant) {
          addMaterialRow(newCells, r, variant);
          r++;
        }
      } else {
        const act = activities.find((a) => a.id === sid);
        if (act) {
          const tags = addActivityParentChild(newCells, r, act);
          mergedTags = { ...mergedTags, ...tags };
          r += act.requirements.length + 1; // offset by parent + children count
        }
      }
    });

    if (Object.keys(mergedTags).length > 0) {
      setActivityRowTags((prev) => ({ ...prev, ...mergedTags }));
    }
    store.loadSheet(newCells, store.rowCount, store.colCount, store.colWidths, store.rowHeights);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Brand/Series lists scoped to whichever makes actually exist in the selected category
  // (e.g. a "Switch" category with only Legrand + Schneider stock shows just those two).
  const availableManufacturers =
    selectedCat === "all"
      ? manufacturers
      : manufacturers.filter((m) => flatVariants.some((v) => v.categoryId === selectedCat && v.manufacturerId === m.id));

  const filteredSeriesList = seriesList.filter((s) => {
    if (selectedMfr !== "all" && s.manufacturerId !== selectedMfr) return false;
    if (selectedCat === "all") return true;
    return flatVariants.some(
      (v) => v.categoryId === selectedCat && v.seriesId === s.id && (selectedMfr === "all" || v.manufacturerId === selectedMfr)
    );
  });

  // Same category-scoping for the "Preferred Brands" add-form.
  const prefAvailableManufacturers = !prefCatId
    ? manufacturers
    : manufacturers.filter((m) => flatVariants.some((v) => v.categoryId === prefCatId && v.manufacturerId === m.id));
  const prefAvailableSeries = seriesList.filter((s) => {
    if (prefMfrId && s.manufacturerId !== prefMfrId) return false;
    if (!prefCatId) return true;
    return flatVariants.some(
      (v) => v.categoryId === prefCatId && v.seriesId === s.id && (!prefMfrId || v.manufacturerId === prefMfrId)
    );
  });

  // Filter lists
  const filteredVariants = flatVariants.filter((v) => {
    const matchesSearch =
      v.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (v.modelCode ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "all" || v.categoryId === selectedCat;
    const matchesMfr = selectedMfr === "all" || v.manufacturerId === selectedMfr;
    const matchesSeries = selectedSeries === "all" || v.seriesId === selectedSeries;

    return matchesSearch && matchesCat && matchesMfr && matchesSeries;
  });

  const filteredActivities = activities.filter((a) => {
    const s = search.toLowerCase();
    const inNameOrCode = 
      a.name.toLowerCase().includes(s) ||
      a.code.toLowerCase().includes(s);
      
    if (inNameOrCode) return true;
    
    // Also search inside the activity's materials (requirements)
    return a.requirements.some((req) => 
      req.description.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading quotation sheet...</p>
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
                onClick={() => router.push("/Quotations")}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
              </button>
              <div className="h-4 w-px bg-border mx-1" />
            </>
          )}
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            {quotation?.code} —{" "}
            <span className="text-muted-foreground font-medium">{quotation?.customer?.name} ({quotation?.project?.name})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg shadow-sm border border-emerald-100 transition-all animate-in fade-in slide-in-from-top-1">
              <Sparkles className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleExportPdf}
            className="gap-2 rounded-xl h-9 px-4 font-semibold border-border"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </Button>
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
            Save Quotation
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={mainContentRef} className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Spreadsheet Component */}
        <div className="flex-1 min-w-0 h-full relative">
          <Spreadsheet fullscreenElementRef={pageRef} />
        </div>

        {/* Drag handle — resizes the sidebar (and shrinks/grows the sheet) */}
        <div
          onMouseDown={handleResizeStart}
          className={`relative w-1.5 h-full shrink-0 cursor-col-resize group ${
            isResizing ? "bg-primary/40" : "bg-border hover:bg-primary/30"
          }`}
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* Catalog Sidebar */}
        <div
          style={{ width: sidebarWidth }}
          className="h-full flex flex-col bg-slate-50/50 shrink-0 select-none overflow-hidden"
        >
          {/* Preferred Brands by Category — drives which configured make (Legrand vs.
              Schneider, etc.) an Activity's requirement resolves to when added below. */}
          <div className="p-3 bg-white border-b border-border space-y-2 shrink-0">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1">
              {/* <Sparkles className="h-3.5 w-3.5 text-primary" /> */}
              Preferred Brands by Category
            </h3>

            {Object.keys(brandPreferences).length > 0 && (
              <div className="space-y-1">
                {Object.entries(brandPreferences).map(([catId, pref]) => {
                  const cat = categories.find((c) => c.id === catId);
                  const mfr = manufacturers.find((m) => m.id === pref.manufacturerId);
                  const ser = pref.seriesId ? seriesList.find((s) => s.id === pref.seriesId) : null;
                  return (
                    <div
                      key={catId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-border px-2 py-1.5"
                    >
                      <span className="text-[10px] font-semibold text-foreground truncate">
                        {cat?.name ?? catId}:{" "}
                        <span className="text-primary">{mfr?.name ?? pref.manufacturerId}</span>
                        {ser && <span className="text-muted-foreground"> — {ser.name}</span>}
                      </span>
                      <button
                        onClick={() =>
                          setBrandPreferences((prev) => {
                            const next = { ...prev };
                            delete next[catId];
                            return next;
                          })
                        }
                        className="text-muted-foreground hover:text-red-500 shrink-0"
                        aria-label={`Remove preference for ${cat?.name ?? catId}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              <Select
                value={prefCatId}
                items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
                onValueChange={(val) => {
                  const nextCat = val || "";
                  setPrefCatId(nextCat);
                  // The brand picked so far may not stock anything in the newly chosen
                  // category — reset rather than leave a now-invalid selection in place.
                  if (
                    prefMfrId &&
                    nextCat &&
                    !flatVariants.some((v) => v.categoryId === nextCat && v.manufacturerId === prefMfrId)
                  ) {
                    setPrefMfrId("");
                    setPrefSeriesId("");
                  }
                }}
              >
                <SelectTrigger className="h-7.5 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={prefMfrId}
                items={Object.fromEntries(prefAvailableManufacturers.map((m) => [m.id, m.name]))}
                onValueChange={(val) => {
                  setPrefMfrId(val || "");
                  setPrefSeriesId("");
                }}
              >
                <SelectTrigger className="h-7.5 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  {prefAvailableManufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={prefSeriesId}
                items={Object.fromEntries(prefAvailableSeries.map((s) => [s.id, s.name]))}
                onValueChange={(val) => setPrefSeriesId(val || "")}
                disabled={!prefMfrId}
              >
                <SelectTrigger className="h-7.5 rounded-lg bg-slate-50 border-border text-[10px] px-1.5">
                  <SelectValue placeholder="Series" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-xs">
                  {prefAvailableSeries.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                if (!prefCatId || !prefMfrId) return;
                setBrandPreferences((prev) => ({
                  ...prev,
                  [prefCatId]: { manufacturerId: prefMfrId, seriesId: prefSeriesId || null },
                }));
                setPrefCatId("");
                setPrefMfrId("");
                setPrefSeriesId("");
              }}
              disabled={!prefCatId || !prefMfrId}
              variant="outline"
              className="w-full h-7.5 rounded-lg text-[10px] font-bold border-border"
            >
              Add Preference
            </Button>
          </div>

          <div className="p-3 border-b border-border bg-white shrink-0 space-y-3">
            {/* Segmented Control Tabs */}
            <div className="flex border-b border-border bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <button
                onClick={() => {
                  setActiveTab("material");
                  setSearch("");
                }}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "material"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Material
              </button>
              <button
                onClick={() => {
                  setActiveTab("activity");
                  setSearch("");
                }}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "activity"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Activity
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "material" ? "Search materials..." : "Search activities..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 pl-8.5 rounded-lg bg-slate-50 border-border text-xs focus-visible:ring-primary/20"
              />
            </div>

            {/* Material Specific Filters */}
            {activeTab === "material" && (
              <div className="grid grid-cols-3 gap-1.5">
                <Select
                  value={selectedCat}
                  items={{ all: "Category", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }}
                  onValueChange={(val) => {
                    const nextCat = val || "all";
                    setSelectedCat(nextCat);
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
            )}

            {/* Bulk Add Button */}
            {selectedIds.length > 0 && (
              <Button
                onClick={addSelectedToSheet}
                className="w-full h-8.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
              >
                Add Selected ({selectedIds.length}) to Sheet
              </Button>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
            {activeTab === "material" ? (
              filteredVariants.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No materials found
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
                          onClick={() => addSingleToSheet("material", v.id)}
                          className="rounded-lg h-7 px-2.5 text-[10px] font-bold border-border bg-slate-50 text-slate-700 hover:bg-primary hover:text-white transition-all"
                          variant="outline"
                        >
                          Add to Sheet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No activities found
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-white p-2.5 shadow-sm hover:border-primary/20 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(act.id)}
                      onChange={() => handleToggleSelect(act.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-[11px] font-bold text-foreground leading-tight">
                          {act.name}
                        </h4>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                          Code: {act.code} • Unit: {act.unit}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          Wiring: {act.wiringType === "POINT_WIRING" ? "Point" : "Circuit"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-semibold text-primary">
                            Mat: ₹{Number(act.materialCost || 0).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] font-semibold text-muted-foreground">
                            Lab: ₹{Number(act.labourCost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addSingleToSheet("activity", act.id)}
                          className="rounded-lg h-7 px-2.5 text-[10px] font-bold border-border bg-slate-50 text-slate-700 hover:bg-primary hover:text-white transition-all"
                          variant="outline"
                        >
                          Add to Sheet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
