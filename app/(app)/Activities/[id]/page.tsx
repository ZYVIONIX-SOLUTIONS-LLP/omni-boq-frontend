"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, Loader2, Sparkles, Trash2, Plus } from "lucide-react";

import { getActivity, updateActivity, Activity, ActivityCharge, duplicateActivity } from "@/app/lib/api/activities";
import { getUser } from "@/app/lib/auth-storage";
import {
  listProducts,
  manufacturersApi,
  categoriesApi,
  attributeDefsApi,
} from "@/app/lib/catalog/api";
import type { AttributeDef, AttributeValues, Manufacturer, CatalogCategory } from "@/app/lib/catalog/types";
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

interface FlattenedProduct {
  id: string;
  displayName: string;
  modelCode: string | null;
  mrp: number | null;
  unit: string;
  categoryId: string;
  categoryName: string;
  manufacturerId: string;
  manufacturerName: string;
  attributes: AttributeValues;
}

/** One alternate make configured for a requirement, if any. Requirements with an empty
 *  options array are plain single-description lines with no switchable make. */
interface RowMakeOption {
  productModelId: string;
  label: string;
  modelCode: string | null;
  mrp: number | null;
}

interface RequirementRow {
  key: string;
  categoryId: string;
  categoryName: string;
  description: string;
  unit: string;
  quantity: number;
  discountPercent: number;
  taxPercent: number;
  options: RowMakeOption[];
  defaultProductModelId: string;
}

interface ChargeRow {
  key: string;
  description: string;
  amount: number;
}

function makeLabel(product: FlattenedProduct): string {
  return product.displayName;
}

function rowMrp(row: RequirementRow): number {
  return row.options.find((o) => o.productModelId === row.defaultProductModelId)?.mrp ?? 0;
}
function rowModelCode(row: RequirementRow): string {
  return row.options.find((o) => o.productModelId === row.defaultProductModelId)?.modelCode ?? "—";
}
function rowDiscAmt(row: RequirementRow): number {
  return (rowMrp(row) * row.discountPercent) / 100;
}
function rowUnitDiscountedPrice(row: RequirementRow): number {
  return rowMrp(row) - rowDiscAmt(row);
}
function rowTaxAmt(row: RequirementRow): number {
  return (rowUnitDiscountedPrice(row) * row.taxPercent) / 100;
}
function rowSubTotal(row: RequirementRow): number {
  return rowUnitDiscountedPrice(row) + rowTaxAmt(row);
}
function rowTotal(row: RequirementRow): number {
  return rowSubTotal(row) * row.quantity;
}

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ActivityEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [flatProducts, setFlatProducts] = useState<FlattenedProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedMfr, setSelectedMfr] = useState("all");
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const rowKeySeq = useRef(0);
  const chargeKeySeq = useRef(0);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [actData, productsData, mfrData, catData, defsData] = await Promise.all([
        getActivity(id),
        listProducts({ limit: 1000 }),
        manufacturersApi.list({ limit: 1000 }),
        categoriesApi.list({ limit: 1000 }),
        attributeDefsApi.list({ limit: 1000 }),
      ]);
      setActivity(actData);
      setCategories(catData.items);
      setManufacturers(mfrData.items);
      setAttributeDefs(defsData.items.filter((d) => d.isActive));

      const flattened: FlattenedProduct[] = productsData.items.map((p) => {
        const displayName = [p.manufacturerName, p.series, p.categoryName, p.modelCode, p.color].filter(Boolean).join(" ");
        return {
          id: p.id,
          displayName,
          modelCode: p.modelCode || null,
          mrp: p.mrp || null,
          unit: p.unit || "NOS",
          categoryId: p.categoryId || "",
          categoryName: p.categoryName || p.category?.name || "—",
          manufacturerId: p.manufacturerId || "",
          manufacturerName: p.manufacturerName || p.manufacturer?.name || "—",
          attributes: p.attributes ?? {},
        };
      });
      setFlatProducts(flattened);

      const loadedRows: RequirementRow[] = (actData.requirements ?? []).map((req) => {
        const options: RowMakeOption[] = (req.options ?? [])
          .filter((o) => o.productModel)
          .map((o) => {
            const v = o.productModel!;
            const manufacturerName = v.manufacturer?.name ?? v.manufacturerName ?? "—";
            const label = [manufacturerName, v.series, v.modelCode].filter(Boolean).join(" ");
            return {
              productModelId: o.productModelId,
              label,
              modelCode: v.modelCode ?? null,
              mrp: v.mrp != null ? Number(v.mrp) : null,
            };
          });
        const defaultOpt = (req.options ?? []).find((o) => o.isDefault) ?? req.options?.[0];
        return {
          key: `r${++rowKeySeq.current}`,
          categoryId: req.categoryId,
          categoryName: req.category?.name ?? "—",
          description: req.description,
          unit: req.unit,
          quantity: Number(req.quantity),
          discountPercent: req.discountPercent != null ? Number(req.discountPercent) : 60,
          taxPercent: req.taxPercent != null ? Number(req.taxPercent) : 16,
          options,
          defaultProductModelId: defaultOpt?.productModelId ?? "",
        };
      });
      setRequirements(loadedRows);

      const loadedCharges: ChargeRow[] = (actData.charges ?? []).map((c: ActivityCharge) => ({
        key: `c${++chargeKeySeq.current}`,
        description: c.description,
        amount: Number(c.amount),
      }));
      setCharges(loadedCharges);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleSave = async () => {
    if (!activity) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const requirementsList = requirements.map((row) => ({
        categoryId: row.categoryId,
        description: row.description,
        unit: row.unit as any,
        quantity: row.quantity,
        discountPercent: row.discountPercent,
        taxPercent: row.taxPercent,
        options:
          row.options.length > 0
            ? row.options.map((o) => ({
                productModelId: o.productModelId,
                isDefault: o.productModelId === row.defaultProductModelId,
              }))
            : undefined,
      }));
      const chargesList = charges
        .filter((c) => c.description.trim())
        .map((c) => ({ description: c.description.trim(), amount: c.amount }));

      const materialCost = requirements.reduce((sum, row) => sum + rowTotal(row), 0);
      const labourCost = charges.reduce((sum, c) => sum + c.amount, 0);

      const user = getUser();
      const isSuper = user?.roles?.includes("SUPERADMIN");
      const isGlobalCopy = !activity.tenantId && !isSuper;

      let targetActivityId = activity.id;
      if (isGlobalCopy) {
        const dup = await duplicateActivity(activity.id, activity.name + " (Copy)");
        targetActivityId = dup.id;
      }

      const updated = await updateActivity(targetActivityId, {
        requirements: requirementsList,
        charges: chargesList,
        materialCost,
        labourCost,
      });

      if (isGlobalCopy) {
        router.replace(`/Activities/${updated.id}`);
        return;
      }

      setActivity(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /** Adds the checked products as ONE requirement — the first checked item becomes the
   *  default make; all of them become switchable alternates via the row's make dropdown. */
  const addSelectedAsRequirement = () => {
    if (selectedIds.length === 0) return;
    const chosen = selectedIds
      .map((vId) => flatProducts.find((v) => v.id === vId))
      .filter((v): v is FlattenedProduct => Boolean(v));
    if (chosen.length === 0) return;

    const defaultProduct = chosen[0];
    const row: RequirementRow = {
      key: `r${++rowKeySeq.current}`,
      categoryId: defaultProduct.categoryId,
      categoryName: defaultProduct.categoryName,
      description: makeLabel(defaultProduct),
      unit: defaultProduct.unit,
      quantity: 1,
      discountPercent: 60,
      taxPercent: 16,
      options: chosen.map((v) => ({ productModelId: v.id, label: makeLabel(v), modelCode: v.modelCode, mrp: v.mrp })),
      defaultProductModelId: defaultProduct.id,
    };
    setRequirements((prev) => [...prev, row]);
    setSelectedIds([]);
  };

  const updateRow = (key: string, patch: Partial<RequirementRow>) => {
    setRequirements((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const switchRowDefaultMake = (key: string, productModelId: string) => {
    setRequirements((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const option = r.options.find((o) => o.productModelId === productModelId);
        return option ? { ...r, defaultProductModelId: productModelId, description: option.label } : r;
      })
    );
  };

  const removeRow = (key: string) => {
    setRequirements((prev) => prev.filter((r) => r.key !== key));
  };

  const addCharge = () => {
    setCharges((prev) => [...prev, { key: `c${++chargeKeySeq.current}`, description: "", amount: 0 }]);
  };
  const updateCharge = (key: string, patch: Partial<ChargeRow>) => {
    setCharges((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };
  const removeCharge = (key: string) => {
    setCharges((prev) => prev.filter((c) => c.key !== key));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const availableManufacturers =
    selectedCat === "all"
      ? manufacturers
      : manufacturers.filter((m) => flatProducts.some((v) => v.categoryId === selectedCat && v.manufacturerName === m.name));

  const categorySpecDefs =
    selectedCat === "all"
      ? []
      : attributeDefs.filter((d) => d.categoryId === selectedCat).sort((a, b) => a.sortOrder - b.sortOrder);

  const filteredProducts = flatProducts.filter((v) => {
    const searchTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchesSearch =
      searchTokens.length === 0 ||
      searchTokens.every(
        (token) =>
          v.displayName.toLowerCase().includes(token) ||
          (v.modelCode ?? "").toLowerCase().includes(token)
      );
    const matchesCat = selectedCat === "all" || v.categoryId === selectedCat;
    const matchesMfr = selectedMfr === "all" || v.manufacturerName === manufacturers.find(m => m.id === selectedMfr)?.name;
    const matchesSpecs = categorySpecDefs.every((def) => {
      const filterVal = specFilters[def.id];
      if (!filterVal) return true;
      const actual = v.attributes?.[def.id];
      if (def.type === "BOOLEAN") return actual === true;
      return String(actual ?? "").toLowerCase() === filterVal.toLowerCase();
    });
    return matchesSearch && matchesCat && matchesMfr && matchesSpecs;
  });

  const totalSubTotal = requirements.reduce((sum, row) => sum + rowUnitDiscountedPrice(row) * row.quantity, 0);
  const totalTax = requirements.reduce((sum, row) => sum + rowTaxAmt(row) * row.quantity, 0);
  const totalMaterial = totalSubTotal + totalTax;
  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
  const grandTotal = totalMaterial + totalCharges;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  const thClass = "px-2.5 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap";
  const tdClass = "px-2.5 py-2 align-top";

  return (
    <div className="flex flex-col bg-white overflow-hidden h-[calc(100vh-0rem)] w-full">
      {/* Sub Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/Activities")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Activities
          </button>
          <div className="h-4 w-px bg-border mx-1" />
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
          {(!activity?.tenantId) && (
            <span className="text-xs font-semibold text-muted-foreground mr-2">Global Activity (Edit saves as copy)</span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-xl h-9 px-4 font-semibold bg-primary text-white hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Activity
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Requirements + Charges */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto bg-slate-50/40 p-4 space-y-4">
          {/* Requirements table */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-border">
                    <th className={thClass}>Item Code</th>
                    <th className={thClass}>Item Name / Spec</th>
                    <th className={thClass}>Qty</th>
                    <th className={thClass}>Rate</th>
                    <th className={thClass}>Disc %</th>
                    <th className={thClass}>Tax %</th>
                    <th className={thClass}>Tax Amt</th>
                    <th className={thClass}>Sub Total</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-muted-foreground">
                        No requirements yet — pick a category on the right, check the make(s) you want, and add them here.
                      </td>
                    </tr>
                  )}
                  {requirements.map((row) => (
                    <tr key={row.key} className="border-b border-border last:border-0 hover:bg-slate-50/60">
                      <td className={`${tdClass} font-mono text-[11px] text-muted-foreground whitespace-nowrap`}>
                        {rowModelCode(row)}
                      </td>
                      <td className={`${tdClass} min-w-[180px]`}>
                        <p className="font-semibold text-foreground">{row.description}</p>
                        <p className="text-[10px] text-primary">{row.categoryName}</p>
                        {row.options.length > 1 && (
                          <select
                            value={row.defaultProductModelId}
                            onChange={(e) => switchRowDefaultMake(row.key, e.target.value)}
                            className="mt-1 h-6 w-full rounded-md border border-border bg-slate-50 text-[10px] px-1"
                          >
                            {row.options.map((o) => (
                              <option key={o.productModelId} value={o.productModelId}>
                                {o.label} — {inr(o.mrp ?? 0)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 0 })}
                          className="h-7 w-16 rounded-md border-border text-xs px-1.5"
                        />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{inr(rowMrp(row))}</td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          value={row.discountPercent}
                          onChange={(e) => updateRow(row.key, { discountPercent: Number(e.target.value) || 0 })}
                          className="h-7 w-16 rounded-md border-border text-xs px-1.5"
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          value={row.taxPercent}
                          onChange={(e) => updateRow(row.key, { taxPercent: Number(e.target.value) || 0 })}
                          className="h-7 w-16 rounded-md border-border text-xs px-1.5"
                        />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{inr(rowTaxAmt(row))}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{inr(rowSubTotal(row))}</td>
                      <td className={`${tdClass} whitespace-nowrap font-bold`}>{inr(rowTotal(row))}</td>
                      <td className={tdClass}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.key)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                          aria-label="Remove requirement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {requirements.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/70 border-t border-border font-semibold">
                      <td colSpan={6} className={`${tdClass} text-right text-muted-foreground`}>Totals</td>
                      <td className={tdClass}>{inr(totalTax)}</td>
                      <td className={tdClass}>{inr(totalSubTotal)}</td>
                      <td className={tdClass}>{inr(totalMaterial)}</td>
                      <td className={tdClass} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Charges table */}
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-border bg-primary/5">
              <p className="text-[11px] font-bold text-foreground">Charges</p>
              <p className="text-[10px] text-muted-foreground">Labour, delivery, testing — any flat cost not tied to a material.</p>
            </div>
            {charges.length > 0 && (
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.key} className="border-b border-border last:border-0">
                      <td className={`${tdClass} w-full`}>
                        <Input
                          placeholder="Description (e.g. Labour)"
                          value={c.description}
                          onChange={(e) => updateCharge(c.key, { description: e.target.value })}
                          className="h-7 rounded-md border-border text-xs"
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={c.amount}
                          onChange={(e) => updateCharge(c.key, { amount: Number(e.target.value) || 0 })}
                          className="h-7 w-28 rounded-md border-border text-xs"
                        />
                      </td>
                      <td className={tdClass}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCharge(c.key)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                          aria-label="Remove charge"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="p-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={addCharge}
                className="gap-1.5 rounded-lg text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Charge
              </Button>
            </div>
          </div>
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

            <Input
              placeholder="Search code, product, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 rounded-lg bg-slate-50 border-border text-xs focus-visible:ring-primary/20"
            />

            <div className="grid grid-cols-2 gap-1.5">
              <Select
                value={selectedCat}
                items={{ all: "Category", ...Object.fromEntries(categories.map((c) => [c.id, c.name])) }}
                onValueChange={(val) => {
                  const nextCat = val || "all";
                  setSelectedCat(nextCat);
                  setSelectedIds([]);
                  setSpecFilters({});
                  if (
                    selectedMfr !== "all" &&
                    !manufacturers.some(
                      (m) => m.id === selectedMfr && flatProducts.some((v) => v.categoryId === nextCat && v.manufacturerName === m.name)
                    )
                  ) {
                    setSelectedMfr("all");
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
            </div>

            {categorySpecDefs.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {categorySpecDefs.map((def) =>
                  def.type === "BOOLEAN" ? (
                    <label
                      key={def.id}
                      className="flex items-center gap-1.5 h-8 rounded-lg bg-slate-50 border border-border text-[10px] px-1.5 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={specFilters[def.id] === "true"}
                        onChange={(e) =>
                          setSpecFilters((prev) => ({ ...prev, [def.id]: e.target.checked ? "true" : "" }))
                        }
                        className="h-3 w-3 rounded border-gray-300"
                      />
                      {def.name}
                    </label>
                  ) : def.type === "SELECT" ? (
                    <select
                      key={def.id}
                      value={specFilters[def.id] ?? ""}
                      onChange={(e) => setSpecFilters((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      className="h-8 rounded-lg bg-slate-50 border border-border text-[10px] px-1.5"
                    >
                      <option value="">{def.name}</option>
                      {def.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      key={def.id}
                      type={def.type === "NUMBER" ? "number" : "text"}
                      placeholder={def.name}
                      value={specFilters[def.id] ?? ""}
                      onChange={(e) => setSpecFilters((prev) => ({ ...prev, [def.id]: e.target.value }))}
                      className="h-8 rounded-lg bg-slate-50 border border-border text-[10px] px-1.5"
                    />
                  )
                )}
              </div>
            )}

            {selectedCat === "all" && (
              <p className="text-[10px] text-muted-foreground bg-slate-50 border border-border rounded-lg px-2 py-1.5">
                Pick a Category above, then check the make(s) you want for that requirement.
              </p>
            )}

            {selectedIds.length > 0 && (
              <Button
                onClick={addSelectedAsRequirement}
                className="w-full h-8.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2"
              >
                {selectedIds.length === 1
                  ? "Add Requirement"
                  : `Add Requirement — ${selectedIds.length} Makes`}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No materials found matching filters
              </div>
            ) : (
              filteredProducts.map((v) => (
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
                        Brand: {v.manufacturerName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-primary">
                        MRP: {inr(Number(v.mrp || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Totals footer */}
      <div className="shrink-0 border-t border-border bg-white px-4 py-2.5 flex items-center justify-end gap-6">
        <span className="text-xs text-muted-foreground">
          Materials: <span className="font-bold text-foreground">{inr(totalMaterial)}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Charges: <span className="font-bold text-foreground">{inr(totalCharges)}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Grand Total: <span className="font-bold text-primary">{inr(grandTotal)}</span>
        </span>
      </div>
    </div>
  );
}
