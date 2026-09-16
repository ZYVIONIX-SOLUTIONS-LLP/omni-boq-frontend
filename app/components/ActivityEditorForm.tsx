"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Sparkles, Trash2, Plus } from "lucide-react";

import { getActivity, updateActivity, Activity, ActivityCharge, duplicateActivity } from "@/app/lib/api/activities";
import { getUser } from "@/app/lib/auth-storage";
import { getProduct } from "@/app/lib/catalog/api";
import { ProductModel } from "@/app/lib/catalog/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import ProductCombo from "@/components/ui/product-combo";
import { MaterialEditorForm } from "@/app/components/MaterialEditorForm";

interface RequirementRow {
  key: string;
  categoryId: string; // derived from selected product or fallback
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  discountPct: number;
  taxRate: number;
  productModelId?: string;
}

interface ChargeRow {
  key: string;
  description: string;
  amount: number;
}

export function ActivityEditorForm({
  id,
  onSuccess,
  onCancel,
}: {
  id: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const rowKeySeq = useRef(0);
  const chargeKeySeq = useRef(0);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [activeRowKeyForMaterial, setActiveRowKeyForMaterial] = useState<string | null>(null);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const actData = await getActivity(id);
      setActivity(actData);

      const loadedRows: RequirementRow[] = [];
      for (const req of (actData.requirements ?? [])) {
        const opt = req.options?.find((o: any) => o.isDefault) || req.options?.[0];
        let mrp = 0;
        let prodId = opt?.productModelId;
        
        if (prodId && opt?.productModel) {
          mrp = Number(opt.productModel.mrp) || 0;
        }

        loadedRows.push({
          key: `r${++rowKeySeq.current}`,
          categoryId: req.categoryId,
          description: req.description,
          unit: req.unit,
          quantity: Number(req.quantity) || 1,
          rate: mrp,
          discountPct: Number(req.discountPercent) || 0,
          taxRate: Number(req.taxPercent) || 0,
          productModelId: prodId,
        });
      }
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
        categoryId: row.categoryId || "00000000-0000-0000-0000-000000000000",
        description: row.description || "Material",
        unit: row.unit as any,
        quantity: row.quantity,
        discountPercent: row.discountPct,
        taxPercent: row.taxRate,
        options: row.productModelId ? [{ productModelId: row.productModelId, isDefault: true }] : [],
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
        router.replace(`/Activities/${updated.id}`);
        return;
      }

      setActivity(updated);
      if (onSuccess) {
        onSuccess(updated.id);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save activity");
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    setRequirements((prev) => [...prev, {
      key: `r${++rowKeySeq.current}`,
      categoryId: "",
      description: "",
      unit: "NOS",
      quantity: 1,
      rate: 0,
      discountPct: 0,
      taxRate: 0,
    }]);
  };

  const removeRow = (key: string) => {
    setRequirements((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<RequirementRow>) => {
    setRequirements((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleProductSelect = async (rowKey: string, productId: string, productName: string) => {
    if (!productId) {
      updateRow(rowKey, { productModelId: undefined, description: "", rate: 0 });
      return;
    }
    // fetch product to get category, unit, mrp
    try {
      const p = await getProduct(productId);
      if (!p) return;
      updateRow(rowKey, { 
        productModelId: p.id,
        description: p.modelCode || p.name || productName,
        categoryId: p.categoryId || "",
        unit: p.unit || "NOS",
        rate: Number(p.mrp) || 0
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMaterial = (rowKey: string) => {
    setActiveRowKeyForMaterial(rowKey);
    setIsMaterialModalOpen(true);
  };

  const onMaterialCreated = async (newProductId: string) => {
    setIsMaterialModalOpen(false);
    if (activeRowKeyForMaterial) {
      await handleProductSelect(activeRowKeyForMaterial, newProductId, "");
      setActiveRowKeyForMaterial(null);
    }
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

  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);

  if (loading || !activity) {
    return (
      <div className="flex h-[calc(100vh-0rem)] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-slate-700 whitespace-nowrap";
  const tdClass = "px-4 py-2 align-middle";

  return (
    <div className="flex flex-col bg-slate-50/50 overflow-hidden h-[calc(100vh-0rem)] w-full">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onCancel) onCancel();
              else router.back();
            }}
            className="text-muted-foreground hover:text-foreground h-9"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase">
              {activity.category}
            </span>
            {activity.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <Sparkles className="h-4 w-4" /> Saved successfully
            </span>
          )}
          {(!activity?.tenantId) && (
            <span className="text-xs font-bold text-muted-foreground mr-2">Global Activity (Saves as copy)</span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-xl h-10 px-6 font-bold bg-primary text-white shadow-md hover:bg-primary/95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Activity
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full overflow-hidden mb-6">
          <div className="overflow-x-auto min-h-[380px] pb-36">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className={`${thClass} w-12`}>SL</th>
                  <th className={`${thClass} min-w-[300px]`}>MATERIAL / SPEC</th>
                  <th className={`${thClass} w-20`}>UNIT</th>
                  <th className={`${thClass} w-24 text-right`}>QTY</th>
                  <th className={`${thClass} w-28 text-right`}>RATE</th>
                  <th className={`${thClass} w-24 text-right`}>% DISC</th>
                  <th className={`${thClass} w-24 text-right`}>% TAX</th>
                  <th className={`${thClass} min-w-[100px] text-right`}>AMOUNT</th>
                  <th className={`${thClass} w-12 text-center`}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((row, idx) => {
                  const baseAmount = row.quantity * row.rate;
                  const afterDisc = baseAmount - (baseAmount * row.discountPct) / 100;
                  const taxAmt = (afterDisc * row.taxRate) / 100;
                  const amount = afterDisc + taxAmt;

                  return (
                    <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`${tdClass} text-slate-500 font-medium`}>{idx + 1}</td>
                      <td className={tdClass}>
                        <ProductCombo
                          value={row.productModelId || ""}
                          valueLabel={row.description}
                          onChange={(id, name) => handleProductSelect(row.key, id, name)}
                          onCreate={() => handleCreateMaterial(row.key)}
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                          className="h-8 w-20 text-xs text-slate-700 bg-transparent border-transparent hover:border-slate-200 focus:bg-white transition-all shadow-none"
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 0 })}
                          className="h-8 w-full text-xs text-right font-semibold text-slate-700 bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none text-right"
                        />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Input
                          type="number"
                          value={row.rate}
                          onChange={(e) => updateRow(row.key, { rate: Number(e.target.value) || 0 })}
                          className="h-8 w-full text-xs text-right text-slate-500 bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none text-right"
                        />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Input
                          type="number"
                          value={row.discountPct}
                          onChange={(e) => updateRow(row.key, { discountPct: Number(e.target.value) || 0 })}
                          className="h-8 w-full text-xs text-right text-slate-500 bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none text-right"
                        />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Input
                          type="number"
                          value={row.taxRate}
                          onChange={(e) => updateRow(row.key, { taxRate: Number(e.target.value) || 0 })}
                          className="h-8 w-full text-xs text-right text-slate-500 bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none text-right"
                        />
                      </td>
                      <td className={`${tdClass} text-right font-bold text-slate-900`}>
                        {amount.toFixed(2)}
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.key)}
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="h-8 gap-2 text-xs font-bold text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100"
            >
              <Plus className="w-3.5 h-3.5" /> Add Material
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-2xl">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Charges</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Labour, delivery, testing — flat cost.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-3">Total</span>
              <span className="text-base font-black text-slate-900">₹{totalCharges.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-2">
            {charges.map((c) => (
              <div key={c.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group">
                <Input
                  placeholder="Description (e.g. Labour)"
                  value={c.description}
                  onChange={(e) => updateCharge(c.key, { description: e.target.value })}
                  className="h-9 flex-1 text-sm bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none font-medium"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={c.amount}
                    onChange={(e) => updateCharge(c.key, { amount: Number(e.target.value) || 0 })}
                    className="h-9 w-32 pl-7 pr-3 text-sm font-bold text-right bg-transparent border-transparent hover:border-slate-200 focus:bg-white shadow-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCharge(c.key)}
                  className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="p-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={addCharge}
                className="h-8 gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add Charge
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isMaterialModalOpen} onOpenChange={setIsMaterialModalOpen}>
        <DialogContent className="max-w-4xl p-0 h-[85vh] flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto">
            <MaterialEditorForm 
              editId={null}
              onSuccess={onMaterialCreated} 
              onCancel={() => setIsMaterialModalOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
