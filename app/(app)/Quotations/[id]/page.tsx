"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, FolderKanban, Printer, Settings, ListOrdered, Tag, Package, Layers, Coins, TrendingUp, Percent, Receipt, FileText, Calculator, CreditCard, Zap, Type, ArrowUp, ArrowDown, MoreVertical, Hash, Maximize2, Minimize2 } from "lucide-react";

import { getQuotation, updateQuotation, Quotation, QuotationItem } from "@/app/lib/api/quotations";
import { listActivities, Activity, wiringTypeLabel, getActivityTypes, ActivityType } from "@/app/lib/api/activities";
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
import { BrandPreferencesDialog } from "@/components/quotations/BrandPreferencesDialog";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

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

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States to track materials configuration
  const [activityRows, setActivityRows] = useState<Record<number, string>>({});
  const [activityCustomizations, setActivityCustomizations] = useState<Record<number, Record<string, string>>>({});

  const [pricingMode, setPricingMode] = useState<"combined" | "separate">("combined");

  // States for Configuration Dialog
  const [configuringIdx, setConfiguringIdx] = useState<number | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // States for Global Brand Defaults
  const [brandPreferencesOpen, setBrandPreferencesOpen] = useState(false);
  const [brandPreferences, setBrandPreferences] = useState<Record<string, { manufacturerId: string; seriesId?: string | null }>>({});

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      const [qData, aRes, pRes, typesRes] = await Promise.all([
        getQuotation(id),
        listActivities({ limit: 1000 }),
        listProducts({ limit: 1000 }),
        getActivityTypes(),
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
        setBrandPreferences(qData.brandPreferences || {});
        
        if (qData.sheetData && typeof qData.sheetData === 'object' && 'pricingMode' in qData.sheetData) {
          setPricingMode((qData.sheetData as any).pricingMode);
        }
      
      setActivities(aRes.items);
      setProducts(pRes.items);
      setActivityTypes(typesRes);
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
         sheetData: { pricingMode },
         brandPreferences
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
        let selectedProdId = undefined;
        const normalizeAttr = (v: any) => String(v ?? "").replace(/\s+/g, "").toLowerCase();

        const validProducts = products.filter(p => {
             if (p.categoryId !== req.categoryId) return false;
             if (req.subCategoryId && p.subCategoryId !== req.subCategoryId) return false;
             if (req.requiredAttributes) {
               for (const [key, val] of Object.entries(req.requiredAttributes)) {
                 // @ts-ignore
                 const pVal = p.attributes?.[key];
                 if (Array.isArray(val)) {
                   if (!val.some(v => normalizeAttr(pVal) === normalizeAttr(v))) return false;
                 } else {
                   if (normalizeAttr(pVal) !== normalizeAttr(val)) return false;
                 }
               }
             }
             return true;
        });

        // 1. Try brand preferences first
        const pref = brandPreferences[req.categoryId];
        console.log(`[DEBUG] req.categoryId: ${req.categoryId}, pref:`, pref);
        console.log(`[DEBUG] validProducts count: ${validProducts.length}`);
        
        if (pref && pref.manufacturerId && validProducts.length > 0) {
          const prefMatch = validProducts.find(p => {
            if (p.manufacturerId !== pref.manufacturerId) return false;
            
            // Check series
            if (pref.seriesId) {
               const seriesPref = String(pref.seriesId).trim().toLowerCase();
               const pSeries = String(p.series || "").trim().toLowerCase();
               const pName = String(p.name || "").trim().toLowerCase();
               
               if (pSeries !== seriesPref && !pName.includes(seriesPref)) {
                 console.log(`[DEBUG] Series mismatch: product '${p.series}' (name: '${p.name}') vs pref '${pref.seriesId}'`);
                 return false;
               }
            }
            return true;
          });
          if (prefMatch) {
             console.log(`[DEBUG] Found brand match! Product ID: ${prefMatch.id}`);
             selectedProdId = prefMatch.id;
          } else {
             console.log(`[DEBUG] No product matched the brand/series preference! falling back.`);
          }
        }
        
        // 2. Try default option from activity definition
        if (!selectedProdId) {
          selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
          if (selectedProdId) console.log(`[DEBUG] Picked admin default: ${selectedProdId}`);
        }

        // 3. Fallback to first valid product
        if (!selectedProdId && validProducts.length > 0) {
          selectedProdId = validProducts[0].id;
          console.log(`[DEBUG] Picked fallback: ${selectedProdId}`);
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

  const thClass = "px-2 py-3 text-left text-[11px] font-bold text-purple-950 uppercase tracking-wide border-r border-b border-purple-200/90 last:border-r-0 whitespace-nowrap bg-purple-100/60 backdrop-blur-md";
  const tdClass = "px-2 py-1.5 align-top border-r border-b border-purple-100/90 last:border-r-0 bg-white/40 backdrop-blur-xs";

  return (
    <div className="flex flex-col bg-slate-50/60 min-h-screen w-full relative print:overflow-visible print:h-auto bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]">
      <div className="flex flex-col h-full w-full print:hidden">
        {/* Header */}
      <div className="sticky top-0 flex shrink-0 items-center justify-between border-b border-purple-200/80 bg-white/80 backdrop-blur-md px-4 py-2 shadow-[0_4px_20px_0_rgba(124,58,237,0.06)] z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/Quotations")}
            className="flex items-center gap-1.5 rounded-none px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-purple-700" />
            <h2 className="text-sm font-bold text-foreground">
              {quotation?.code} — <span className="text-muted-foreground font-medium">{quotation?.project?.name}</span>
            </h2>
          </div>
        </div>
          <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-none border border-emerald-200 transition-all animate-in fade-in shadow-xs">
              <Sparkles className="h-3.5 w-3.5" /> Saved successfully
            </span>
          )}
          
          <div className="flex gap-2">
            <Select value={pricingMode} onValueChange={(val: any) => setPricingMode(val)}>
              <SelectTrigger className="w-[200px] h-9 text-xs font-semibold bg-purple-50/80 backdrop-blur-xs text-purple-700 border-purple-200 rounded-none print:hidden shadow-xs">
                <SelectValue placeholder="Pricing Mode" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-purple-200">
                <SelectItem value="combined">Material + Labour (Combined)</SelectItem>
                <SelectItem value="separate">Material & Labour (Separate)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 hover:bg-purple-50 text-slate-700 shadow-xs print:hidden"
            >
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
          </div>

          <Button
            onClick={() => setBrandPreferencesOpen(true)}
            variant="outline"
            className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 hover:bg-blue-50 hover:text-blue-600 shadow-xs print:hidden"
          >
            <Settings className="h-4 w-4" /> Brand Setup
          </Button>

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 text-purple-700 hover:bg-purple-50 shadow-xs print:hidden"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-purple-600" /> : <Maximize2 className="h-4 w-4 text-purple-600" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 h-9 px-4 rounded-none font-semibold bg-purple-700 text-white hover:bg-purple-800 transition-all shadow-md disabled:opacity-50 print:hidden"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Quotation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex bg-slate-50/50 p-4 print:p-0 print:bg-white print:overflow-visible">
        <div className={`flex-1 ${isFullscreen ? 'max-w-none px-4' : 'max-w-[1400px]'} mx-auto w-full flex flex-col gap-4 print:gap-0 transition-all duration-300`}>
          
          {/* Activity Selection UI & Controls */}
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-2 bg-white/75 backdrop-blur-xl p-4 rounded-none border border-purple-200/80 shadow-[0_4px_24px_0_rgba(124,58,237,0.08)] print:hidden">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Activity Type:</span>
                <Select 
                  value={selectedType || ""} 
                  onValueChange={(val) => {
                    setSelectedType(val);
                    const t = activityTypes.find(x => x.name === val);
                    setSelectedCategory(t?.categories[0]?.name || "");
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9 text-sm font-semibold bg-white border-purple-200/80 rounded-none shadow-xs">
                    <SelectValue placeholder="Select Type..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-purple-200">
                    {activityTypes.map(t => (
                      <SelectItem key={t.id} value={t.name} className="font-semibold cursor-pointer">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedType && activityTypes.find(x => x.name === selectedType)?.categories.length ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cat:</span>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(val) => {
                      setSelectedCategory(val || "");
                      setSidebarOpen(true);
                    }}
                  >
                    <SelectTrigger className="w-[220px] h-9 text-sm font-semibold text-slate-700 bg-slate-50 border-purple-200/80 rounded-none">
                      <SelectValue placeholder="Select Category..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-purple-200">
                      {activityTypes.find(x => x.name === selectedType)?.categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name} className="font-semibold cursor-pointer">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <CascadingMaterialMenu products={products} onSelect={handleAddRawMaterial} />
              <Button 
                onClick={addItemRow} 
                variant="default"
                className="h-9 text-xs gap-1.5 bg-slate-900 hover:bg-black text-white rounded-none shadow-xs whitespace-nowrap font-semibold"
              >
                <Plus className="h-4 w-4" /> Add Custom Item
              </Button>
              <Button 
                onClick={addHeadingRow} 
                variant="outline"
                className="h-9 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 rounded-none shadow-xs whitespace-nowrap font-semibold"
              >
                <Type className="h-4 w-4" /> Add Heading
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-none border border-purple-300/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(124,58,237,0.12)] overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-purple-200">
                    <th className={`${thClass} w-[50px]`}><div className="flex items-center gap-1 justify-center"><ListOrdered className="h-3.5 w-3.5 text-slate-400" /> SL</div></th>
                    <th className={`${thClass} min-w-[450px]`}><div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-emerald-500" /> ITEM NAME / SPEC</div></th>
                    <th className={`${thClass} w-[80px]`}><div className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-blue-500" /> UNIT</div></th>
                    <th className={`${thClass} w-[75px]`}><div className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-orange-500" /> QTY</div></th>
                    {pricingMode === "separate" ? (
                      <>
                        <th className={`${thClass} w-[90px]`}><div className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-blue-500" /> MAT RATE</div></th>
                        <th className={`${thClass} w-[90px]`}><div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> LAB RATE</div></th>
                      </>
                    ) : (
                      <th className={`${thClass} w-[95px]`}><div className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" /> RATE</div></th>
                    )}
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> % PROFIT</div></th>
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Percent className="h-3.5 w-3.5 text-red-500" /> % DISC</div></th>
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5 text-cyan-500" /> % TAX</div></th>
                    <th className={`${thClass} w-[90px]`}><div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-purple-500" /> TAX AMT</div></th>
                    <th className={`${thClass} w-[95px]`}><div className="flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-blue-600" /> SUB TOTAL</div></th>
                    <th className={`${thClass} w-[100px]`}><div className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-emerald-500" /> TOTAL</div></th>
                    <th className={`${thClass} w-[45px]`}><div className="flex items-center gap-1 justify-center"><Zap className="h-3.5 w-3.5 text-slate-800" /> ACT</div></th>
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
                            <td className="px-1.5 py-0.5 align-middle border-r border-b border-purple-200">
                              <Input
                                value={it.snapshotData?.serialNumber ?? ""}
                                onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                                placeholder={it.snapshotData?.serialNumber !== undefined ? "" : String(idx + 1)}
                                className="h-6 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent"
                              />
                            </td>
                            <td className="px-1.5 py-0.5 align-middle border-r border-b border-purple-200">
                              <RichTextEditor
                                content={it.description || ""}
                                onChange={(html) => updateItem(idx, { description: html })}
                                className="h-auto min-h-[24px] text-sm border-transparent hover:border-purple-200 focus:border-primary bg-transparent px-1 py-0.5 w-full text-slate-800 tracking-wide rounded-md outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="SECTION HEADING..."
                              />
                            </td>
                            <td className="border-r border-b border-purple-200 bg-purple-50/30" colSpan={pricingMode === "separate" ? 10 : 9} />
                            <td className="px-1.5 py-0.5 text-center bg-purple-50/50 align-middle border-b border-purple-200">
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center h-6 w-6 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md outline-none">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 font-semibold text-sm">
                                    <DropdownMenuItem onClick={() => insertRowAbove(idx)} className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                      <Plus className="h-4 w-4 mr-2" /> Insert Item Above
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => insertHeadingAbove(idx)} className="cursor-pointer text-purple-600 focus:text-purple-700 focus:bg-purple-50">
                                      <Type className="h-4 w-4 mr-2" /> Insert Heading Above
                                    </DropdownMenuItem>
                                    {it.snapshotData?.serialNumber === "" ? (
                                      <DropdownMenuItem onClick={() => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: undefined } })} className="cursor-pointer text-slate-600 focus:bg-slate-100">
                                        <Hash className="h-4 w-4 mr-2" /> Reset Serial Number
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: "" } })} className="cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                        <Hash className="h-4 w-4 mr-2" /> Remove Serial Number
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
                      }

                      return (
                        <tr key={it.id || idx} className="hover:bg-purple-50/80 transition-colors">
                          <td className={`${tdClass} align-middle`}>
                            <Input
                              value={it.snapshotData?.serialNumber ?? ""}
                              onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                              placeholder={it.snapshotData?.serialNumber !== undefined ? "" : String(idx + 1)}
                              className="h-8 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent text-slate-500"
                            />
                          </td>
                          <td className={tdClass}>
                            <RichTextEditor
                              content={it.description || ""}
                              onChange={(html) => updateItem(idx, { description: html })}
                              className="w-full min-h-[34px] text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary focus:ring-1 focus:ring-purple-500 shadow-sm px-2 py-1.5 font-medium overflow-hidden leading-relaxed text-justify"
                              placeholder="Item description..."
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              value={it.unit}
                              onChange={(e) => updateItem(idx, { unit: e.target.value })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-1 text-center"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-1 text-center"
                            />
                          </td>
                          {pricingMode === "separate" ? (
                            <>
                              <td className={tdClass}>
                                <Input
                                  type="number"
                                  value={isActivity ? Number(it.snapshotData?.materialRate ?? it.rate).toFixed(2) : (it.snapshotData?.materialRate ?? it.rate)}
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
                                  value={isActivity ? Number(it.snapshotData?.labourRate || 0).toFixed(2) : (it.snapshotData?.labourRate || 0)}
                                  onChange={(e) => {
                                    const labRate = Number(e.target.value) || 0;
                                    const matRate = Number(it.snapshotData?.materialRate ?? it.rate) || 0;
                                    updateItem(idx, { 
                                      rate: matRate + labRate, 
                                      snapshotData: { ...it.snapshotData, labourRate: labRate } 
                                    });
                                  }}
                                  readOnly={isActivity}
                                  className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                                />
                              </td>
                            </>
                          ) : (
                            <td className={tdClass}>
                              <Input
                                type="number"
                                value={isActivity ? Number(it.rate).toFixed(2) : it.rate}
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
                                <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md outline-none">
                                  <MoreVertical className="h-4 w-4" />
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
                                  {it.snapshotData?.serialNumber === "" ? (
                                    <DropdownMenuItem onClick={() => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: undefined } })} className="cursor-pointer text-slate-600 focus:bg-slate-100">
                                      <Hash className="h-4 w-4 mr-2" /> Reset Serial Number
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: "" } })} className="cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                      <Hash className="h-4 w-4 mr-2" /> Remove Serial Number
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
              {items.length > 0 && (() => {
                const hasExplicitTax = taxTotalAll > 0;
                const computedSubTotal = hasExplicitTax ? subTotalAll : grandTotalAll / 1.18;
                const computedTax = hasExplicitTax ? taxTotalAll : (grandTotalAll - computedSubTotal);
                const taxLabel = hasExplicitTax ? "Tax Amount:" : "GST @ 18%:";

                return (
                  <div className="bg-white/80 backdrop-blur-md border-t border-purple-200/90 p-4 flex flex-col items-end justify-center gap-1 rounded-none shadow-inner">
                    <div className="flex w-64 justify-between text-xs text-slate-600 font-medium">
                      <span>Sub Total:</span>
                      <span>₹ {computedSubTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex w-64 justify-between text-xs text-slate-600 font-medium pb-2 border-b border-purple-200/80">
                      <span>{taxLabel}</span>
                      <span>₹ {computedTax.toFixed(2)}</span>
                    </div>
                    <div className="flex w-64 justify-between text-sm text-purple-950 font-bold pt-1">
                      <span>Grand Total:</span>
                      <span>₹ {grandTotalAll.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
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
              const slNo = it.snapshotData?.serialNumber ?? (idx + 1).toString();

              if (isHeading) {
                return (
                  <tr key={it.id || idx}>
                    <td className="border border-slate-400 py-3 px-3 text-center align-top text-slate-900 bg-slate-50">{slNo}</td>
                    <td 
                      className="border border-slate-400 py-3 px-3 align-top text-slate-900 bg-slate-50 tracking-wide prose prose-sm max-w-none text-justify" 
                      dangerouslySetInnerHTML={{ __html: it.description || "" }}
                    />
                    <td className="border border-slate-400 py-3 px-3 bg-slate-50" colSpan={pricingMode === "separate" ? 5 : 3} />
                  </tr>
                );
              }

              return (
                <tr key={it.id || idx}>
                  <td className="border border-slate-400 py-3 px-3 text-center align-top text-slate-700">{slNo}</td>
                  <td className="border border-slate-400 py-3 px-3 align-top">
                    <div 
                      className="font-medium text-slate-900 whitespace-pre-wrap text-justify prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: it.description || "" }}
                    />
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

        {(() => {
          const hasExplicitTax = taxTotalAll > 0;
          const computedSubTotal = hasExplicitTax ? subTotalAll : grandTotalAll / 1.18;
          const computedTax = hasExplicitTax ? taxTotalAll : (grandTotalAll - computedSubTotal);
          const taxLabel = hasExplicitTax ? "Tax Amount:" : "GST @ 18%:";

          return (
            <div className="flex justify-end pt-4">
              <div className="w-[300px] text-sm">
                <div className="flex justify-between py-2 text-slate-600 border-b border-slate-200">
                  <span className="font-medium">Sub Total:</span>
                  <span className="font-semibold">₹ {computedSubTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600 border-b border-slate-800">
                  <span className="font-medium">{taxLabel}</span>
                  <span className="font-semibold">₹ {computedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-4 text-slate-900 font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>₹ {grandTotalAll.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}
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
        brandPreferences={brandPreferences}
        onSave={handleSaveCustomizations}
      />

      <BrandPreferencesDialog
        open={brandPreferencesOpen}
        onOpenChange={setBrandPreferencesOpen}
        brandPreferences={brandPreferences}
        onSave={async (prefs) => {
          setBrandPreferences(prefs);
          try {
            await updateQuotation(id, { brandPreferences: prefs });
          } catch (err) {
            console.error("Failed to save brand preferences", err);
          }
        }}
        products={products}
      />
    </div>
  );
}
