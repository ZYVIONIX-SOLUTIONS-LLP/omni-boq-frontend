"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, Loader2, Sparkles, Trash2, Plus } from "lucide-react";

import { getActivity, updateActivity, Activity, ActivityCharge, duplicateActivity } from "@/app/lib/api/activities";
import { getUser } from "@/app/lib/auth-storage";
import {
  categoriesApi,
  subCategoriesApi,
  attributeDefsApi,
} from "@/app/lib/catalog/api";
import type { AttributeDef, CatalogCategory, SubCategory } from "@/app/lib/catalog/types";
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

interface RequirementRow {
  key: string;
  categoryId: string;
  categoryName: string;
  subCategoryId?: string;
  subCategoryName?: string;
  description: string;
  unit: string;
  quantity: number;
  requiredAttributes: Record<string, any>;
}

interface ChargeRow {
  key: string;
  description: string;
  amount: number;
}

export default function ActivityEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const rowKeySeq = useRef(0);
  const chargeKeySeq = useRef(0);

  // Form states for new requirement
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubCat, setSelectedSubCat] = useState("");
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
  const [reqQuantity, setReqQuantity] = useState(1);
  const [reqUnit, setReqUnit] = useState("NOS");
  const [reqDescription, setReqDescription] = useState("");

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [actData, catData, subCatData, defsData] = await Promise.all([
        getActivity(id),
        categoriesApi.list({ limit: 1000 }),
        subCategoriesApi.list({ limit: 1000 }),
        attributeDefsApi.list({ limit: 1000 }),
      ]);
      setActivity(actData);
      setCategories(catData.items);
      setSubCategories(subCatData.items.filter(s => s.isActive));
      setAttributeDefs(defsData.items.filter((d) => d.isActive));

      const loadedRows: RequirementRow[] = (actData.requirements ?? []).map((req: any) => ({
        key: `r${++rowKeySeq.current}`,
        categoryId: req.categoryId,
        categoryName: req.category?.name ?? "—",
        subCategoryId: req.subCategoryId,
        subCategoryName: req.subCategory?.name ?? "—",
        description: req.description,
        unit: req.unit,
        quantity: Number(req.quantity),
        requiredAttributes: req.requiredAttributes ?? {},
      }));
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
        subCategoryId: row.subCategoryId || undefined,
        description: row.description || row.categoryName,
        unit: row.unit as any,
        quantity: row.quantity,
        requiredAttributes: row.requiredAttributes,
      }));
      
      const chargesList = charges
        .filter((c) => c.description.trim())
        .map((c) => ({ description: c.description.trim(), amount: c.amount }));

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
        labourCost,
      });

      if (isGlobalCopy) {
        router.replace(`/superadmin/Activities/${updated.id}`);
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

  const handleAddRequirement = () => {
    if (!selectedCat) return;
    const cat = categories.find(c => c.id === selectedCat);
    const sub = subCategories.find(s => s.id === selectedSubCat);
    
    if (!cat) return;
    
    // Convert string specs to proper types based on defs
    const typedSpecs: Record<string, any> = {};
    Object.keys(specFilters).forEach(key => {
      const def = attributeDefs.find(d => d.id === key);
      const val = specFilters[key];
      if (!val) return;
      if (def?.type === "NUMBER") typedSpecs[key] = Number(val);
      else if (def?.type === "BOOLEAN") typedSpecs[key] = val === "true";
      else typedSpecs[key] = val;
    });

    const row: RequirementRow = {
      key: `r${++rowKeySeq.current}`,
      categoryId: cat.id,
      categoryName: cat.name,
      subCategoryId: sub?.id,
      subCategoryName: sub?.name,
      description: reqDescription || sub?.name || cat.name,
      unit: reqUnit || "NOS",
      quantity: reqQuantity || 1,
      requiredAttributes: typedSpecs,
    };
    
    setRequirements((prev) => [...prev, row]);
    
    // Reset form
    setSelectedCat("");
    setSelectedSubCat("");
    setSpecFilters({});
    setReqDescription("");
    setReqQuantity(1);
  };

  const removeRow = (key: string) => {
    setRequirements((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<RequirementRow>) => {
    setRequirements((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
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

  const categorySpecDefs = selectedCat 
    ? attributeDefs.filter((d) => d.categoryId === selectedCat).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const availableSubCats = selectedCat
    ? subCategories.filter(s => s.categoryId === selectedCat)
    : [];

  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);

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
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/superadmin/Activities")}
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

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 min-w-0 h-full overflow-y-auto bg-slate-50/40 p-4 space-y-4">
          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-border">
                    <th className={thClass}>Category</th>
                    <th className={thClass}>SubCategory</th>
                    <th className={thClass}>Description / Specs</th>
                    <th className={thClass}>Unit</th>
                    <th className={thClass}>Qty</th>
                    <th className={thClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground">
                        No requirements yet — add from the sidebar.
                      </td>
                    </tr>
                  )}
                  {requirements.map((row) => (
                    <tr key={row.key} className="border-b border-border last:border-0 hover:bg-slate-50/60">
                      <td className={`${tdClass} min-w-[120px]`}>
                        <p className="font-semibold text-foreground">{row.categoryName}</p>
                      </td>
                      <td className={`${tdClass} min-w-[120px]`}>
                         <p className="text-muted-foreground">{row.subCategoryName || "—"}</p>
                      </td>
                      <td className={`${tdClass} min-w-[180px]`}>
                        <Input
                           value={row.description}
                           onChange={(e) => updateRow(row.key, { description: e.target.value })}
                           className="h-7 text-xs w-full mb-1"
                           placeholder="Requirement Description"
                        />
                        {Object.keys(row.requiredAttributes).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(row.requiredAttributes).map(([k, v]) => {
                              const defName = attributeDefs.find(d => d.id === k)?.name || k;
                              return (
                                <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-secondary-foreground">
                                  {defName}: {String(v)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className={tdClass}>
                         <Input
                           value={row.unit}
                           onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                           className="h-7 w-16 text-xs"
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 0 })}
                          className="h-7 w-16 text-xs"
                        />
                      </td>
                      <td className={tdClass}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.key)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-border bg-primary/5">
              <p className="text-[11px] font-bold text-foreground">Charges</p>
              <p className="text-[10px] text-muted-foreground">Labour, delivery, testing — flat cost.</p>
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

        <div className="w-px bg-border h-full shrink-0" />

        {/* Sidebar */}
        <div className="w-[330px] h-full flex flex-col bg-slate-50/50 shrink-0 border-l border-border select-none p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Add Requirement</h3>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Category *</label>
              <Select value={selectedCat} onValueChange={(v) => { setSelectedCat(v || ""); setSelectedSubCat(""); setSpecFilters({}); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedCat && availableSubCats.length > 0 && (
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold">SubCategory</label>
                 <Select value={selectedSubCat} onValueChange={(v) => setSelectedSubCat(v || "")}>
                   <SelectTrigger className="h-9 text-xs">
                     <SelectValue placeholder="Select SubCategory" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="">None</SelectItem>
                     {availableSubCats.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
            )}

            {categorySpecDefs.length > 0 && (
              <div className="space-y-2">
                 <label className="text-xs font-semibold">Required Specifications</label>
                 <div className="grid grid-cols-2 gap-2">
                  {categorySpecDefs.map((def) =>
                    def.type === "BOOLEAN" ? (
                      <label key={def.id} className="flex items-center gap-1.5 text-[10px]">
                        <input
                          type="checkbox"
                          checked={specFilters[def.id] === "true"}
                          onChange={(e) => setSpecFilters(prev => ({ ...prev, [def.id]: e.target.checked ? "true" : "" }))}
                          className="rounded border-gray-300"
                        />
                        {def.name}
                      </label>
                    ) : def.type === "SELECT" ? (
                      <select
                        key={def.id}
                        value={specFilters[def.id] ?? ""}
                        onChange={(e) => setSpecFilters(prev => ({ ...prev, [def.id]: e.target.value }))}
                        className="h-8 rounded-lg bg-white border border-border text-[10px] px-1.5"
                      >
                        <option value="">{def.name}</option>
                        {def.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        key={def.id}
                        type={def.type === "NUMBER" ? "number" : "text"}
                        placeholder={def.name}
                        value={specFilters[def.id] ?? ""}
                        onChange={(e) => setSpecFilters(prev => ({ ...prev, [def.id]: e.target.value }))}
                        className="h-8 rounded-lg bg-white border border-border text-[10px] px-1.5"
                      />
                    )
                  )}
                 </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description (Optional)</label>
              <Input
                 value={reqDescription}
                 onChange={e => setReqDescription(e.target.value)}
                 placeholder="Custom description..."
                 className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Qty</label>
                <Input type="number" value={reqQuantity} onChange={e => setReqQuantity(Number(e.target.value) || 1)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Unit</label>
                <Input value={reqUnit} onChange={e => setReqUnit(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <Button onClick={handleAddRequirement} disabled={!selectedCat} className="w-full mt-4">
              Add Requirement
            </Button>
          </div>
        </div>
      </div>
      
      <div className="shrink-0 border-t border-border bg-white px-4 py-2.5 flex items-center justify-end gap-6">
        <span className="text-xs text-muted-foreground">
          Charges: <span className="font-bold text-foreground">{totalCharges}</span>
        </span>
      </div>
    </div>
  );
}
