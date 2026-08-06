"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, FolderKanban, Printer, Settings, ListOrdered, Tag, Package, Layers, Coins, TrendingUp, Percent, Receipt, FileText, Calculator, CreditCard, Zap, Type, ArrowUp, ArrowDown, MoreVertical } from "lucide-react";

import { getQuotation, updateQuotation, Quotation, QuotationItem } from "@/app/lib/api/quotations";
import { listActivities, Activity, WIRING_TYPES, ACTIVITY_CATEGORIES, wiringTypeLabel, WiringType } from "@/app/lib/api/activities";
import { listProducts } from "@/app/lib/catalog/api";
import type { ProductModel } from "@/app/lib/catalog/types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivitySelectionSidebar } from "@/components/quotations/ActivitySelectionSidebar";
import { QuotationItemMaterialDialog } from "@/components/quotations/QuotationItemMaterialDialog";
import { CascadingMaterialMenu } from "@/components/quotations/CascadingMaterialMenu";

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

  const [selectedType, setSelectedType] = useState<WiringType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States to track materials configuration
  const [activityRows, setActivityRows] = useState<Record<number, string>>({});
  const [activityCustomizations, setActivityCustomizations] = useState<Record<number, Record<string, string>>>({});

  const [pricingMode, setPricingMode] = useState<"combined" | "separate">("combined");

  // States for Configuration Dialog
  const [configuringIdx, setConfiguringIdx] = useState<number | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [qData, actData, prodData] = await Promise.all([
        getQuotation(id),
        listActivities(),
        listProducts({ limit: 5000 }), // In a real app we'd paginate or search server-side
      ]);
      setQuotation(qData);
        const qItems = (qData.items || []).map((it: any) => ({
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
          snapshotData: it.snapshotData || {},
        }));

        setItems(qItems);
        setActivityRows(qData.activityRows || {});
        setActivityCustomizations(qData.activityCustomizations || {});
        
        if (qData.sheetData && typeof qData.sheetData === 'object' && 'pricingMode' in qData.sheetData) {
          setPricingMode((qData.sheetData as any).pricingMode);
        }
      
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
      // Create fresh mappings based on current item indices
      const newActivityRows: Record<number, string> = {};
      const newActivityCustomizations: Record<number, Record<string, string>> = {};

      items.forEach((it, idx) => {
         if (it.id && it.id.startsWith("temp-") && it.id.split("-").length > 2) {
             const actId = it.id.split("-").slice(2).join("-"); // Extracted from temp-timestamp-uuid
             newActivityRows[idx] = actId;
             if (activityCustomizations[items.indexOf(it)]) {
                newActivityCustomizations[idx] = activityCustomizations[items.indexOf(it)];
             }
         } else if (activityRows[idx]) {
             newActivityRows[idx] = activityRows[idx];
             if (activityCustomizations[idx]) {
                 newActivityCustomizations[idx] = activityCustomizations[idx];
             }
         }
      });

      await updateQuotation(id, { 
         items,
         activityRows: newActivityRows,
         activityCustomizations: newActivityCustomizations,
         sheetData: { pricingMode }
      });
      setActivityRows(newActivityRows);
      setActivityCustomizations(newActivityCustomizations);
      
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

  const addHeadingRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        description: "NEW SECTION HEADING",
        unit: "",
        quantity: 0,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: prev.length,
        snapshotData: { isHeading: true, serialNumber: "A" }
      }
    ]);
  };

  const handleAddRawMaterial = (product: ProductModel) => {
    const mrp = Number(product.mrp) || 0;
    const disc = Number(product.discountPercent) || 0;
    const rateAfterDisc = mrp * (1 - disc / 100);

    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        description: product.name || "",
        unit: product.unit || "NOS",
        quantity: 1,
        rate: mrp,
        discountPct: disc,
        profitPct: 0,
        taxRate: 0,
        amount: rateAfterDisc,
        sortOrder: prev.length,
        snapshotData: { materialRate: mrp, labourRate: 0 },
      },
    ]);
  };

  const addActivityItems = (newItems: (QuotationItem & { activityId: string })[]) => {
    setItems((prev) => {
      const merged = [...prev, ...newItems];
      
      // Update mappings for newly added items
      const newIdxBase = prev.length;
      newItems.forEach((it, i) => {
        setActivityRows(r => ({ ...r, [newIdxBase + i]: it.activityId }));
      });
      
      return merged.map((it, idx) => ({ ...it, sortOrder: idx }));
    });
  };

  const updateItem = (idx: number, updates: Partial<QuotationItem>) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], ...updates };
      return clone;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    
    // Shift mappings down
    setActivityRows(prev => {
      const next = { ...prev };
      delete next[index];
      Object.keys(next).forEach(k => {
         const key = Number(k);
         if (key > index) {
            next[key - 1] = next[key];
            delete next[key];
         }
      });
      return next;
    });

    setActivityCustomizations(prev => {
      const next = { ...prev };
      delete next[index];
      Object.keys(next).forEach(k => {
         const key = Number(k);
         if (key > index) {
            next[key - 1] = next[key];
            delete next[key];
         }
      });
      return next;
    });
  };

  const insertHeadingAbove = (index: number) => {
    setItems((prev) => {
      const clone = [...prev];
      clone.splice(index, 0, {
        id: `temp-${Date.now()}`,
        description: "",
        unit: "",
        quantity: 0,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: 0,
        snapshotData: { isHeading: true, serialNumber: "" },
      });
      return clone.map((it, idx) => ({ ...it, sortOrder: idx }));
    });
    
    // Shift mappings down from index
    setActivityRows((prev) => {
      const next = { ...prev };
      const keys = Object.keys(next).map(Number).sort((a, b) => b - a);
      for (const k of keys) {
         if (k >= index) {
            next[k + 1] = next[k];
            delete next[k];
         }
      }
      return next;
    });
    
    setActivityCustomizations((prev) => {
      const next = { ...prev };
      const keys = Object.keys(next).map(Number).sort((a, b) => b - a);
      for (const k of keys) {
         if (k >= index) {
            next[k + 1] = next[k];
            delete next[k];
         }
      }
      return next;
    });
  };

  const insertRowAbove = (index: number) => {
    setItems((prev) => {
      const clone = [...prev];
      clone.splice(index, 0, {
        id: `temp-${Date.now()}`,
        description: "",
        unit: "NOS",
        quantity: 1,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: 0,
        snapshotData: { materialRate: 0, labourRate: 0 },
      });
      return clone.map((it, idx) => ({ ...it, sortOrder: idx }));
    });
    
    // Shift mappings down from index
    setActivityRows((prev) => {
      const next = { ...prev };
      // Move everything from index downwards by 1
      const keys = Object.keys(next).map(Number).sort((a, b) => b - a);
      for (const k of keys) {
         if (k >= index) {
            next[k + 1] = next[k];
            delete next[k];
         }
      }
      return next;
    });
    
    setActivityCustomizations((prev) => {
      const next = { ...prev };
      const keys = Object.keys(next).map(Number).sort((a, b) => b - a);
      for (const k of keys) {
         if (k >= index) {
            next[k + 1] = next[k];
            delete next[k];
         }
      }
      return next;
    });
  };

  const handleConfigureMaterials = (idx: number) => {
    setConfiguringIdx(idx);
    setConfigDialogOpen(true);
  };

  const handleSaveCustomizations = (customizations: Record<string, string>, newRate: number) => {
    if (configuringIdx === null) return;
    
    setActivityCustomizations(prev => ({
      ...prev,
      [configuringIdx]: customizations
    }));
    
    const currentItem = items[configuringIdx];
    const labRate = Number(customizations.__labourCost) || 0;
    const matRate = newRate - labRate;
    updateItem(configuringIdx, { 
      rate: newRate, 
      snapshotData: { ...(currentItem?.snapshotData || {}), materialRate: matRate, labourRate: labRate } 
    });
  };

  const filteredActivities = activities.filter(
    a => a.wiringType === selectedType && a.category === selectedCategory
  );

  const handleAddSelectedActivities = (selectedActivities: Activity[]) => {
    const newItems = selectedActivities.map((activity) => {
      let totalMaterialCost = 0;
      
      activity.requirements?.forEach((req: any) => {
        let selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
        
        if (!selectedProdId) {
          const match = products.find(p => {
             if (p.categoryId !== req.categoryId) return false;
             if (req.subCategoryId && p.subCategoryId !== req.subCategoryId) return false;
             if (req.requiredAttributes) {
               for (const [key, val] of Object.entries(req.requiredAttributes)) {
                 // @ts-ignore
                 const pVal = p.attributes?.[key];
                 if (String(pVal ?? "").trim().toLowerCase() !== String(val ?? "").trim().toLowerCase()) return false;
               }
             }
             return true;
          });
          if (match) selectedProdId = match.id;
        }

        if (selectedProdId) {
          const prod = products.find(p => p.id === selectedProdId);
          if (prod) {
            const mrp = Number(prod.mrp) || 0;
            const disc = Number(prod.discountPercent) || 0;
            const actualPrice = mrp * (1 - disc / 100);
            totalMaterialCost += actualPrice * (Number(req.quantity) || 1);
          }
        }
      });

      let totalCharges = 0;
      activity.charges?.forEach((c: any) => {
        totalCharges += Number(c.amount) || 0;
      });

      const labourCost = Number(activity.labourCost) || 0;
      const finalRate = totalMaterialCost + labourCost + totalCharges;

      return {
        id: `temp-${Date.now()}-${activity.id}`,
        activityId: activity.id,
        description: activity.name,
        unit: activity.unit,
        quantity: 1,
        rate: finalRate,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: finalRate,
        snapshotData: { materialRate: totalMaterialCost, labourRate: labourCost + totalCharges }
      } as QuotationItem & { activityId: string };
    });

    addActivityItems(newItems);
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

  const thClass = "px-2 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wide border-r border-b border-purple-200 last:border-r-0 whitespace-nowrap bg-white";
  const tdClass = "px-2 py-2 align-top border-r border-b border-purple-100 last:border-r-0 bg-white/50";

  return (
    <div className="flex flex-col bg-white overflow-hidden h-[calc(100vh-0rem)] w-full relative print:overflow-visible print:h-auto">
      <div className="flex flex-col h-full w-full print:hidden">
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
          
          <div className="flex gap-2">
            <Select value={pricingMode} onValueChange={(val: any) => setPricingMode(val)}>
              <SelectTrigger className="w-[200px] h-9 text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200 print:hidden">
                <SelectValue placeholder="Pricing Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Material + Labour (Combined)</SelectItem>
                <SelectItem value="separate">Material & Labour (Separate)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 h-9 px-3 rounded-lg text-xs font-semibold border-border hover:bg-slate-50 shadow-sm print:hidden"
            >
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 h-9 px-4 rounded-lg font-semibold bg-primary text-white hover:bg-primary/95 transition-all shadow-md disabled:opacity-50 print:hidden"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Quotation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-y-auto bg-slate-50/50 p-4 print:p-0 print:bg-white print:overflow-visible">
        <div className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col gap-4 print:gap-0">
          
          {/* Activity Selection UI & Controls */}
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Wiring Types:</span>
                <Select 
                  value={selectedType || ""} 
                  onValueChange={(val: any) => setSelectedType(val || null)}
                >
                  <SelectTrigger className="w-[180px] h-9 text-sm font-semibold text-slate-700 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select Wiring Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WIRING_TYPES.map(wt => (
                      <SelectItem key={wt} value={wt} className="font-semibold cursor-pointer">
                        {wiringTypeLabel(wt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedType && (
                <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                  <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Category:</span>
                  <Select 
                    value={selectedCategory || ""} 
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      setSidebarOpen(true);
                    }}
                  >
                    <SelectTrigger className="w-[220px] h-9 text-sm font-semibold text-slate-700 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_CATEGORIES[selectedType].map(cat => (
                        <SelectItem key={cat} value={cat} className="font-semibold cursor-pointer">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
              <CascadingMaterialMenu products={products} onSelect={handleAddRawMaterial} />
              <Button 
                onClick={addItemRow} 
                variant="default"
                className="h-9 text-xs gap-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm whitespace-nowrap font-semibold"
              >
                <Plus className="h-4 w-4" /> Add Custom Item
              </Button>
              <Button 
                onClick={addHeadingRow} 
                variant="outline"
                className="h-9 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg shadow-sm whitespace-nowrap font-semibold"
              >
                <Type className="h-4 w-4" /> Add Heading
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/30 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-purple-200">
                    <th className={`${thClass} w-[60px]`}><div className="flex items-center gap-1.5 justify-center"><ListOrdered className="h-3.5 w-3.5 text-slate-400" /> SL</div></th>
                    <th className={`${thClass} min-w-[300px]`}><div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-emerald-500" /> ITEM NAME / SPEC</div></th>
                    <th className={`${thClass} w-[80px]`}><div className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-blue-500" /> UNIT</div></th>
                    <th className={`${thClass} w-[100px]`}><div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-orange-500" /> QTY</div></th>
                    {pricingMode === "separate" ? (
                      <>
                        <th className={`${thClass} w-[100px]`}><div className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-blue-500" /> MAT RATE</div></th>
                        <th className={`${thClass} w-[100px]`}><div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> LAB RATE</div></th>
                      </>
                    ) : (
                      <th className={`${thClass} w-[120px]`}><div className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-amber-500" /> RATE</div></th>
                    )}
                    <th className={`${thClass} w-[80px]`}><div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> % PROFIT</div></th>
                    <th className={`${thClass} w-[80px]`}><div className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5 text-red-500" /> % DISC</div></th>
                    <th className={`${thClass} w-[80px]`}><div className="flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5 text-cyan-500" /> % TAX</div></th>
                    <th className={`${thClass} w-[120px]`}><div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-purple-500" /> TAX AMT</div></th>
                    <th className={`${thClass} w-[120px]`}><div className="flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5 text-blue-600" /> SUB TOTAL</div></th>
                    <th className={`${thClass} w-[120px]`}><div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-emerald-500" /> TOTAL</div></th>
                    <th className={`${thClass} w-[60px]`}><div className="flex items-center gap-1.5 justify-center"><Zap className="h-3.5 w-3.5 text-slate-800" /> ACT</div></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground border-b border-purple-200 bg-white">
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
                      
                      const isActivity = !!activityRows[idx];
                      const isHeading = !!it.snapshotData?.isHeading;

                      if (isHeading) {
                        return (
                          <tr key={it.id || idx} className="hover:bg-purple-100/50 transition-colors bg-purple-50/50">
                            <td className={`${tdClass} align-middle`}>
                              <Input
                                value={it.snapshotData?.serialNumber || ""}
                                onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                                placeholder={String(idx + 1)}
                                className="h-8 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent"
                              />
                            </td>
                            <td className={tdClass} colSpan={pricingMode === "separate" ? 11 : 10}>
                              <textarea
                                value={it.description}
                                onChange={(e) => updateItem(idx, { description: e.target.value })}
                                className="h-10 min-h-[40px] text-sm font-bold border-transparent hover:border-purple-200 focus:border-primary bg-transparent px-2 py-2 w-full text-slate-800 uppercase tracking-wide resize-y rounded-md outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="SECTION HEADING..."
                                rows={1}
                              />
                            </td>
                            <td className={`${tdClass} text-center py-2 bg-white/50 align-middle`}>
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 font-semibold text-sm">
                                    <DropdownMenuItem onClick={() => insertRowAbove(idx)} className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                      <Plus className="h-4 w-4 mr-2" /> Insert Item Above
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => insertHeadingAbove(idx)} className="cursor-pointer text-purple-600 focus:text-purple-700 focus:bg-purple-50">
                                      <Type className="h-4 w-4 mr-2" /> Insert Heading Above
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => removeItem(idx)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                                      <Trash2 className="h-4 w-4 mr-2" /> Remove Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={it.id || idx} className="hover:bg-purple-50/80 transition-colors">
                          <td className={`${tdClass} align-middle`}>
                            <Input
                              value={it.snapshotData?.serialNumber || ""}
                              onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                              placeholder={String(idx + 1)}
                              className="h-8 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent text-slate-500"
                            />
                          </td>
                          <td className={tdClass}>
                            <textarea
                              value={it.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              className="w-full min-h-[44px] text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary focus:ring-1 focus:ring-purple-500 shadow-sm px-2 py-1.5 font-medium resize-y outline-none leading-relaxed"
                              placeholder="Item description..."
                              rows={2}
                            />
                            
                            {/* Materials preview for Activity */}
                            {activityRows[idx] && (() => {
                               const actId = activityRows[idx];
                               const act = activities.find(a => a.id === actId);
                               if (!act || !act.requirements) return null;
                               const customizations = activityCustomizations[idx] || {};
                               return (
                                 <div className="mt-2 text-[10px] text-slate-500 pl-1 leading-tight border-l-2 border-purple-200 ml-1">
                                    {act.requirements.map(req => {
                                       let selectedProdId = customizations[req.id];
                                       if (!selectedProdId) selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
                                       if (!selectedProdId) {
                                          const match = products.find(p => p.categoryId === req.categoryId && (req.subCategoryId ? p.subCategoryId === req.subCategoryId : true));
                                          if (match) selectedProdId = match.id;
                                       }
                                       const prod = products.find(p => p.id === selectedProdId);
                                       if (!prod) return null;
                                       return (
                                         <div key={req.id} className="flex gap-1 mb-0.5">
                                           <span>-</span>
                                           <span className="line-clamp-1">{prod.name} ({Number(req.quantity)} {prod.unit || 'Nos'})</span>
                                         </div>
                                       );
                                    })}
                                 </div>
                               );
                            })()}
                          </td>
                          <td className={tdClass}>
                            <Input
                              value={it.unit}
                              onChange={(e) => updateItem(idx, { unit: e.target.value })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-2"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-2 text-right"
                            />
                          </td>
                          {pricingMode === "separate" ? (
                            <>
                              <td className={tdClass}>
                                <Input
                                  type="number"
                                  value={it.snapshotData?.materialRate ?? it.rate}
                                  onChange={(e) => {
                                    const matRate = Number(e.target.value) || 0;
                                    const labRate = Number(it.snapshotData?.labourRate) || 0;
                                    updateItem(idx, { 
                                      rate: matRate + labRate, 
                                      snapshotData: { ...it.snapshotData, materialRate: matRate } 
                                    });
                                  }}
                                  readOnly={isActivity}
                                  title={isActivity ? "Material Rate is computed from configured materials" : undefined}
                                  className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                                />
                              </td>
                              <td className={tdClass}>
                                <Input
                                  type="number"
                                  value={it.snapshotData?.labourRate || 0}
                                  onChange={(e) => {
                                    const labRate = Number(e.target.value) || 0;
                                    const matRate = Number(it.snapshotData?.materialRate ?? it.rate) || 0;
                                    updateItem(idx, { 
                                      rate: matRate + labRate, 
                                      snapshotData: { ...it.snapshotData, labourRate: labRate } 
                                    });
                                  }}
                                  className={`h-8 text-xs border rounded-md px-2 text-right bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm`}
                                />
                              </td>
                            </>
                          ) : (
                            <td className={tdClass}>
                              <Input
                                type="number"
                                value={it.rate}
                                onChange={(e) => {
                                  const newRate = Number(e.target.value) || 0;
                                  updateItem(idx, { 
                                    rate: newRate,
                                    snapshotData: { ...it.snapshotData, materialRate: newRate, labourRate: 0 }
                                  });
                                }}
                                readOnly={isActivity}
                                title={isActivity ? "Rate is computed from configured materials" : undefined}
                                className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                              />
                            </td>
                          )}
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.profitPct}
                              onChange={(e) => updateItem(idx, { profitPct: Number(e.target.value) || 0 })}
                              readOnly={isActivity}
                              title={isActivity ? "Already added in Configure Materials" : undefined}
                              className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.discountPct}
                              onChange={(e) => updateItem(idx, { discountPct: Number(e.target.value) || 0 })}
                              readOnly={isActivity}
                              title={isActivity ? "Already added in Configure Materials" : undefined}
                              className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              type="number"
                              value={it.taxRate}
                              onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) || 0 })}
                              readOnly={isActivity}
                              title={isActivity ? "Already added in Configure Materials" : undefined}
                              className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                            />
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 text-purple-600 font-medium`}>
                            {taxAmt.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-medium text-slate-600`}>
                            {afterDisc.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-bold text-emerald-700 bg-emerald-50/30`}>
                            {finalAmount.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-center py-2 bg-white align-middle`}>
                            <div className="flex flex-col items-center justify-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 font-semibold text-sm">
                                  <DropdownMenuItem onClick={() => insertRowAbove(idx)} className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                    <Plus className="h-4 w-4 mr-2" /> Insert Item Above
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => insertHeadingAbove(idx)} className="cursor-pointer text-purple-600 focus:text-purple-700 focus:bg-purple-50">
                                    <Type className="h-4 w-4 mr-2" /> Insert Heading Above
                                  </DropdownMenuItem>
                                  {activityRows[idx] && (
                                    <DropdownMenuItem onClick={() => handleConfigureMaterials(idx)} className="cursor-pointer text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                      <Settings className="h-4 w-4 mr-2" /> Configure Materials
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => removeItem(idx)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                                    <Trash2 className="h-4 w-4 mr-2" /> Remove Item
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                          </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Totals Footer */}
              {items.length > 0 && (
                <div className="bg-purple-50/50 border-t border-purple-200 p-4 flex flex-col items-end justify-center gap-1">
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
      </div>
      </div>

      {/* PRINT-ONLY UI */}
      <div className="hidden print:block w-full bg-white text-black font-sans print:p-[1.5cm] min-h-screen">
        <style type="text/css" media="print">
          {`
            @page { margin: 0; size: auto; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          `}
        </style>
        
        <div className="text-center mb-10 pb-6 border-b-4 border-slate-800">
          <h1 className="text-4xl font-black uppercase tracking-widest text-slate-900 mb-2">Quotation</h1>
          <p className="text-lg font-bold text-slate-600">Ref: {quotation?.code}</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10 text-sm">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-2">Client Details</h2>
            <div className="flex flex-col gap-1.5">
              <p className="font-bold text-slate-900 text-base">{quotation?.customer?.name || 'Client Name N/A'}</p>
              {quotation?.customer?.phone && <p className="text-slate-700 font-medium">{quotation.customer.phone}</p>}
              {quotation?.customer?.address && <p className="text-slate-700 whitespace-pre-wrap mt-1">{quotation.customer.address}</p>}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-2">Project Details</h2>
            <div className="flex flex-col gap-1.5">
              <p className="font-bold text-slate-900 text-base">{quotation?.project?.name || 'Project Name N/A'}</p>
              {quotation?.project?.code && <p className="text-slate-700 font-medium">Code: {quotation.project.code}</p>}
            </div>
          </div>
        </div>

        <table className="w-full text-sm border-collapse border border-slate-400 mb-8">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 py-3 px-3 text-center font-bold text-slate-800 w-[5%]">SL</th>
              <th className={`border border-slate-400 py-3 px-3 text-left font-bold text-slate-800 ${pricingMode === "separate" ? "w-[45%]" : "w-[55%]"}`}>ITEM DESCRIPTION</th>
              <th className="border border-slate-400 py-3 px-3 text-center font-bold text-slate-800 w-[10%]">UNIT</th>
              <th className="border border-slate-400 py-3 px-3 text-center font-bold text-slate-800 w-[10%]">QTY</th>
              {pricingMode === "separate" && (
                <>
                  <th className="border border-slate-400 py-3 px-3 text-right font-bold text-slate-800 w-[10%]">MAT RATE</th>
                  <th className="border border-slate-400 py-3 px-3 text-right font-bold text-slate-800 w-[10%]">LAB RATE</th>
                </>
              )}
              <th className="border border-slate-400 py-3 px-3 text-right font-bold text-slate-800 w-[20%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = Number(it.quantity) || 0;
              const rate = Number(it.rate) || 0;
              const disc = Number(it.discountPct) || 0;
              const tax = Number(it.taxRate) || 0;
              const profit = Number(it.profitPct) || 0;
              const matRate = Number(it.snapshotData?.materialRate ?? it.rate) || 0;
              const labRate = Number(it.snapshotData?.labourRate) || 0;

              const baseAmount = qty * rate;
              const withProfit = baseAmount + (baseAmount * profit) / 100;
              const afterDisc = withProfit - (withProfit * disc) / 100;
              const taxAmt = (afterDisc * tax) / 100;
              const finalAmount = afterDisc + taxAmt;
              
              const isHeading = !!it.snapshotData?.isHeading;
              const slNo = it.snapshotData?.serialNumber || (idx + 1).toString();

              if (isHeading) {
                return (
                  <tr key={it.id || idx}>
                    <td className="border border-slate-400 py-3 px-3 text-center align-top font-bold text-slate-900 bg-slate-50">{slNo}</td>
                    <td className="border border-slate-400 py-3 px-3 align-top font-bold text-slate-900 uppercase bg-slate-50 tracking-wide" colSpan={pricingMode === "separate" ? 6 : 4}>
                      {it.description}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={it.id || idx}>
                  <td className="border border-slate-400 py-3 px-3 text-center align-top text-slate-700">{slNo}</td>
                  <td className="border border-slate-400 py-3 px-3 align-top">
                    <div className="font-medium text-slate-900 whitespace-pre-wrap">{it.description}</div>
                    
                    {/* Detailed Materials Breakdown for Activities */}
                    {activityRows[idx] && (() => {
                       const actId = activityRows[idx];
                       const act = activities.find(a => a.id === actId);
                       if (!act || !act.requirements) return null;
                       
                       const customizations = activityCustomizations[idx] || {};
                       
                       return (
                         <div className="mt-2 text-[11px] text-slate-600 pl-1 leading-relaxed border-l border-slate-300 ml-1">
                            {act.requirements.map(req => {
                               let selectedProdId = customizations[req.id];
                               if (!selectedProdId) {
                                 selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
                               }
                               if (!selectedProdId) {
                                  const match = products.find(p => p.categoryId === req.categoryId && (req.subCategoryId ? p.subCategoryId === req.subCategoryId : true));
                                  if (match) selectedProdId = match.id;
                               }
                               const prod = products.find(p => p.id === selectedProdId);
                               if (!prod) return null;
                               
                               return (
                                 <div key={req.id} className="flex gap-2">
                                   <span className="opacity-50">-</span>
                                   <span>{prod.name} ({Number(req.quantity)} {prod.unit || 'Nos'})</span>
                                 </div>
                               );
                            })}
                         </div>
                       );
                    })()}
                  </td>
                  <td className="border border-slate-400 py-3 px-3 text-center align-top text-slate-700">{it.unit}</td>
                  <td className="border border-slate-400 py-3 px-3 text-center font-bold text-slate-900">{qty}</td>
                  {pricingMode === "separate" && (
                    <>
                      <td className="border border-slate-400 py-3 px-3 text-right text-slate-800">{matRate.toFixed(2)}</td>
                      <td className="border border-slate-400 py-3 px-3 text-right text-slate-800">{labRate.toFixed(2)}</td>
                    </>
                  )}
                  <td className="border border-slate-400 py-3 px-3 text-right font-bold text-slate-900">₹ {finalAmount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <div className="w-[300px] text-sm">
            <div className="flex justify-between py-2 text-slate-600 border-b border-slate-200">
              <span className="font-medium">Sub Total:</span>
              <span className="font-semibold">₹ {subTotalAll.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600 border-b border-slate-800">
              <span className="font-medium">Tax Amount:</span>
              <span className="font-semibold">₹ {taxTotalAll.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-4 text-slate-900 font-bold text-lg">
              <span>Grand Total:</span>
              <span>₹ {grandTotalAll.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <ActivitySelectionSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        categoryName={selectedCategory}
        activities={filteredActivities}
        onAddSelected={handleAddSelectedActivities}
      />

      <QuotationItemMaterialDialog
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        activity={configuringIdx !== null && activityRows[configuringIdx] ? activities.find(a => a.id === activityRows[configuringIdx]) : undefined}
        products={products}
        customizations={configuringIdx !== null ? activityCustomizations[configuringIdx] || {} : {}}
        onSave={handleSaveCustomizations}
      />
    </div>
  );
}
