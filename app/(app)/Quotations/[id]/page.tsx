"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, FolderKanban, Printer, Settings } from "lucide-react";

import { getQuotation, updateQuotation, Quotation, QuotationItem } from "@/app/lib/api/quotations";
import { listActivities, Activity } from "@/app/lib/api/activities";
import { listProducts } from "@/app/lib/catalog/api";
import type { ProductModel } from "@/app/lib/catalog/types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ActivityConfigDialog from "@/components/quotations/ActivityConfigDialog";

interface PageProps {
  params: Promise<{ id: string }>;
}



export default function QuotationEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [qData, actData, prodData] = await Promise.all([
        getQuotation(id),
        listActivities(),
        listProducts({ limit: 5000 }), // In a real app we'd paginate or search server-side
      ]);
      setQuotation(qData);
      setItems((qData.items || []).map((it: any) => ({
        id: it.id,
        description: it.description,
        unit: it.unit,
        quantity: Number(it.quantity) || 0,
        rate: Number(it.rate) || 0,
        discountPct: Number(it.discountPct) || 0,
        profitPct: Number(it.profitPct) || 0,
        taxRate: Number(it.taxRate) || 0,
        amount: Number(it.amount) || 0,
        sortOrder: it.sortOrder || 0,
      })));
      setActivities(actData.items);
      setProducts(prodData.items);
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
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateQuotation(id, { items });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        description: "",
        unit: "NOS",
        quantity: 1,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: prev.length,
      }
    ]);
  };

  const updateItem = (index: number, patch: Partial<QuotationItem>) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...patch };
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddActivity = (item: any) => {
    setItems((prev) => [...prev, { ...item, id: `temp-${Date.now()}`, sortOrder: prev.length, discountPct: 0, profitPct: 0, taxRate: 0, amount: 0 }]);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading quotation...</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  let subTotalAll = 0;
  let taxTotalAll = 0;
  let grandTotalAll = 0;

  items.forEach((it) => {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    const disc = Number(it.discountPct) || 0;
    const tax = Number(it.taxRate) || 0;
    const profit = Number(it.profitPct) || 0;

    const baseAmount = qty * rate;
    const withProfit = baseAmount + (baseAmount * profit) / 100;
    const afterDisc = withProfit - (withProfit * disc) / 100;
    const taxAmt = (afterDisc * tax) / 100;
    const finalAmount = afterDisc + taxAmt;

    subTotalAll += afterDisc;
    taxTotalAll += taxAmt;
    grandTotalAll += finalAmount;
  });

  const thClass = "px-2 py-2 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wide border-r border-border last:border-r-0 whitespace-nowrap bg-primary/5";
  const tdClass = "px-2 py-1.5 align-top border-r border-border last:border-r-0";

  return (
    <div className="flex flex-col bg-white overflow-hidden h-[calc(100vh-0rem)] w-full">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-2 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/Quotations")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-slate-100 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {quotation?.code} — <span className="text-muted-foreground font-medium">{quotation?.project?.name}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-all animate-in fade-in">
              <Sparkles className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
          
          <Button
            variant="outline"
            className="gap-2 h-9 px-3 rounded-lg text-xs font-semibold border-border hover:bg-slate-50 shadow-sm"
          >
            <Printer className="h-4 w-4" /> Export PDF
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 h-9 px-4 rounded-lg font-semibold bg-primary text-white hover:bg-primary/95 transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Quotation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-y-auto bg-slate-50/50 p-4">
        <div className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col gap-4">
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={addItemRow} 
              variant="default"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Custom Item
            </Button>
            <Button 
              onClick={() => setIsActivityModalOpen(true)}
              variant="outline"
              className="h-8 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10 rounded-lg"
            >
              <Settings className="h-3.5 w-3.5" /> Add Activity
            </Button>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${thClass} w-[50px] text-center`}>SL</th>
                    <th className={`${thClass} min-w-[300px]`}>ITEM NAME / SPEC</th>
                    <th className={`${thClass} w-[80px]`}>UNIT</th>
                    <th className={`${thClass} w-[100px]`}>QTY</th>
                    <th className={`${thClass} w-[120px]`}>RATE</th>
                    <th className={`${thClass} w-[80px]`}>% PROFIT</th>
                    <th className={`${thClass} w-[80px]`}>% DISC</th>
                    <th className={`${thClass} w-[80px]`}>% TAX</th>
                    <th className={`${thClass} w-[120px]`}>TAX AMT</th>
                    <th className={`${thClass} w-[120px]`}>SUB TOTAL</th>
                    <th className={`${thClass} w-[120px]`}>TOTAL</th>
                    <th className={`${thClass} w-[50px] text-center`}>ACT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground border-b border-border">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FolderKanban className="h-8 w-8 text-slate-300" />
                          <p>No items in quotation. Add a custom item or activity.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const qty = Number(it.quantity) || 0;
                      const rate = Number(it.rate) || 0;
                      const disc = Number(it.discountPct) || 0;
                      const tax = Number(it.taxRate) || 0;
                      const profit = Number(it.profitPct) || 0;

                      const baseAmount = qty * rate;
                      const withProfit = baseAmount + (baseAmount * profit) / 100;
                      const afterDisc = withProfit - (withProfit * disc) / 100;
                      const taxAmt = (afterDisc * tax) / 100;
                      const finalAmount = afterDisc + taxAmt;

                      return (
                        <tr key={it.id || idx} className="border-b border-border last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className={`${tdClass} text-center font-medium text-slate-500 py-3`}>{idx + 1}</td>
                          <td className={tdClass}>
                            <Input
                              value={it.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 font-medium"
                              placeholder="Item description..."
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              value={it.unit}
                              onChange={(e) => updateItem(idx, { unit: e.target.value })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 text-right"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.rate}
                              onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 text-right"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.profitPct}
                              onChange={(e) => updateItem(idx, { profitPct: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 text-right"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.discountPct}
                              onChange={(e) => updateItem(idx, { discountPct: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 text-right"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.taxRate}
                              onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border-transparent hover:border-border focus:border-primary shadow-none px-2 text-right"
                            />
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 text-slate-500`}>
                            {taxAmt.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-medium text-slate-600`}>
                            {afterDisc.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-bold text-foreground`}>
                            {finalAmount.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-center py-2`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(idx)}
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Footer */}
            {items.length > 0 && (
              <div className="bg-primary/5 border-t border-border p-4 flex flex-col items-end justify-center gap-1">
                <div className="flex w-64 justify-between text-xs text-slate-600 font-medium">
                  <span>Sub Total:</span>
                  <span>₹ {subTotalAll.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between text-xs text-slate-600 font-medium pb-2 border-b border-border/50">
                  <span>Tax Amount:</span>
                  <span>₹ {taxTotalAll.toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between text-sm text-foreground font-bold pt-1">
                  <span>Grand Total:</span>
                  <span>₹ {grandTotalAll.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityConfigDialog
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        activities={activities}
        products={products}
        onAdd={handleAddActivity}
      />
    </div>
  );
}
