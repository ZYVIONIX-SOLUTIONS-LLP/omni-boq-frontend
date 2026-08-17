"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, FolderKanban, Printer, Settings, ListOrdered, Tag, Package, Layers, Coins, TrendingUp, Percent, Receipt, FileText, Calculator, CreditCard, Zap, Type, ArrowUp, ArrowDown, MoreVertical, Hash, Maximize2, Minimize2, Copy, Lock, ShieldAlert, BookOpen, FileSpreadsheet, Briefcase, Unlock } from "lucide-react";

import { getQuotation, updateQuotation, updateQuotationStatus, createQuotationWithClient, getDisplayStatus, Quotation, QuotationItem, QuotationStatus } from "@/app/lib/api/quotations";
import { listActivities, Activity, wiringTypeLabel, getActivityTypes, ActivityType } from "@/app/lib/api/activities";
import { listProducts } from "@/app/lib/catalog/api";
import type { ProductModel } from "@/app/lib/catalog/types";
import { User } from "@/app/lib/api/auth";
import { getUser, AuthUser } from "@/app/lib/auth-storage";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivitySelectionSidebar } from "@/components/quotations/ActivitySelectionSidebar";
import { QuotationItemMaterialDialog } from "@/components/quotations/QuotationItemMaterialDialog";
import { CascadingMaterialMenu } from "@/components/quotations/CascadingMaterialMenu";
import { BrandPreferencesDialog } from "@/components/quotations/BrandPreferencesDialog";
import { HeadingPresetsDialog } from "@/components/quotations/HeadingPresetsDialog";
import { convertQuotationToProject, getProjects, setProjectManualEdit } from "@/app/lib/api/projects";
import Swal from "sweetalert2";
import { exportQuotationToExcel } from "@/app/lib/api/quotationExcelExport";
import type { HeadingPreset } from "@/app/lib/api/headingPresets";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}



export default function QuotationEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [adminProfile, setAdminProfile] = useState<User | AuthUser | null>(null);
  
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

  // Status & Revision Dialog States
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [savingRevision, setSavingRevision] = useState(false);

  const currentUser = getUser();
  const userRole = currentUser?.roles?.[0] || "";
  const isStaff = userRole === "STAFF";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
  const currentStatus = quotation ? getDisplayStatus(quotation) : "DRAFT";
  const isLockedForStaff = isStaff && (currentStatus === "FINAL" || currentStatus === "SENT" || currentStatus === "ACCEPTED");
  const isNegotiationEligible = currentStatus === "FINAL" || currentStatus === "SENT" || currentStatus === "ACCEPTED";

  // Project Conversion & Manual Edit States
  const [manualEditUnlocked, setManualEditUnlocked] = useState(false);
  const qSnap = (quotation as any)?.snapshotData || (quotation as any)?.sheetData || {};
  const isConvertedToProject = !!(qSnap.isConvertedToProject || getProjects().some(p => p.quotationId === id));
  const convertedProject = getProjects().find(p => p.quotationId === id);
  
  const isLockedByStatus = currentStatus === "SENT" || currentStatus === "ACCEPTED" || isConvertedToProject || isLockedForStaff;
  const isReadOnlyQuotation = isLockedByStatus && !manualEditUnlocked;

  // Profit Shift State for Post-Negotiation Adjustments
  const [profitShift, setProfitShift] = useState<number>(0);

  const handleProfitShift = (delta: number) => {
    setProfitShift((prev) => prev + delta);
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.snapshotData?.isHeading) return it;
        const curProfit = Number(it.profitPct) || 0;
        const newProfit = Math.max(0, curProfit + delta);
        return {
          ...it,
          profitPct: newProfit,
        };
      })
    );
  };

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
  const [headingPresetsOpen, setHeadingPresetsOpen] = useState(false);

  useEffect(() => {
    setAdminProfile(getUser());
  }, []);

  const handleConvertToProject = () => {
    if (!quotation) return;
    Swal.fire({
      title: "Convert Quotation to Project?",
      text: `Convert accepted quotation ${quotation.code || ""} into an active Project? Once converted, this quotation will be locked in Read-Only mode to preserve project BOQ baseline.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Convert to Project",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        const proj = convertQuotationToProject(quotation);
        setQuotation((prev: any) => prev ? {
          ...prev,
          snapshotData: {
            ...((prev as any).snapshotData || (prev as any).sheetData || {}),
            isConvertedToProject: true,
            projectId: proj.id,
            projectCode: proj.code,
          }
        } : null);

        Swal.fire({
          title: "Project Created Successfully!",
          text: `Accepted quotation converted to Project ${proj.code}. Quotation is now locked in Read-Only mode.`,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Go to Projects Workspace",
          cancelButtonText: "Stay on Quotation",
          confirmButtonColor: "#7c3aed",
        }).then((res) => {
          if (res.isConfirmed) {
            router.push("/Projects");
          }
        });
      }
    });
  };

  const handleToggleManualEdit = () => {
    if (manualEditUnlocked) {
      setManualEditUnlocked(false);
      setProjectManualEdit(id, false);
      Swal.fire("Re-Locked", "Quotation has been re-locked in Read-Only project baseline mode.", "info");
    } else {
      Swal.fire({
        title: "Unlock Manual Editing?",
        text: "This quotation is linked to an active Project. Editing values will modify your project BOQ baseline. Are you sure you want to enable manual editing?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d97706",
        confirmButtonText: "Yes, Enable Manual Edit",
        cancelButtonText: "Keep Locked",
      }).then((res) => {
        if (res.isConfirmed) {
          setManualEditUnlocked(true);
          setProjectManualEdit(id, true);
        }
      });
    }
  };

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

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!quotation) return;
    setUpdatingStatus(true);
    try {
      const isFinal = newStatus === "FINAL";
      await updateQuotationStatus(quotation.id, newStatus);
      const updatedSheet = {
        ...(quotation.sheetData && typeof quotation.sheetData === "object" ? quotation.sheetData : {}),
        pricingMode,
        isFinalized: isFinal,
        displayStatus: newStatus,
      };
      await updateQuotation(quotation.id, { sheetData: updatedSheet });
      setQuotation((prev) => (prev ? { ...prev, status: newStatus, sheetData: updatedSheet } : null));
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveAsRevision = async () => {
    if (!quotation) return;
    setSavingRevision(true);
    try {
      const defaultNote = revisionNote.trim() || `After negotiation meeting on ${new Date().toLocaleDateString("en-IN")}`;
      
      const newQuotation = await createQuotationWithClient({
        clientName: quotation.customer?.name || "Client",
        clientPhone: quotation.customer?.phone || undefined,
        clientAddress: quotation.customer?.address || undefined,
        projectName: quotation.project?.name || "Project",
        parentQuotationId: quotation.id,
        revisionNote: defaultNote,
      });

      // Populate revision copy with full quotation data
      await updateQuotation(newQuotation.id, {
        sheetData: {
          ...(quotation.sheetData && typeof quotation.sheetData === "object" ? quotation.sheetData : {}),
          pricingMode,
          parentQuotationId: quotation.id,
          revisionNote: defaultNote,
          profitShift: profitShift,
        },
        activityRows: quotation.activityRows,
        activityCustomizations: quotation.activityCustomizations,
        brandPreferences: quotation.brandPreferences,
        items: items.map((it, idx) => ({
          id: it.id || `item-${idx}`,
          description: it.description,
          unit: it.unit as any,
          quantity: Number(it.quantity) || 0,
          rate: Number(it.rate) || 0,
          discountPct: Number(it.discountPct) || 0,
          profitPct: Number(it.profitPct) || 0,
          taxRate: Number(it.taxRate) || 0,
          amount: Number(it.amount) || 0,
          sortOrder: it.sortOrder ?? idx,
        })),
      });

      setRevisionDialogOpen(false);
      router.push(`/Quotations/${newQuotation.id}`);
    } catch (err) {
      console.error("Failed to save revision", err);
    } finally {
      setSavingRevision(false);
    }
  };

  const handleSave = async () => {
    if (isLockedForStaff) return;
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
    const catId = product.categoryId;
    const categoryPref = catId ? (brandPreferences as any)[catId] : undefined;

    // Overriding: If Admin set profit, discount, or tax in Brand & Category Setup, use Admin values over material creation values
    const profit = categoryPref?.defaultProfitPct ?? 0;
    const disc = categoryPref?.defaultDiscountPct ?? (Number(product.discountPercent) || 0);
    const tax = categoryPref?.defaultTaxPct ?? 0;

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
        profitPct: profit,
        taxRate: tax,
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

  const handleInsertPresetHeading = (preset: HeadingPreset) => {
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        description: preset.description || `<p><strong>${preset.title}</strong></p>`,
        unit: "",
        quantity: 0,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: prev.length,
        snapshotData: { isHeading: true, serialNumber: "" }
      }
    ]);
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

      // Check category preferences override
      const firstReqCatId = activity.requirements?.[0]?.categoryId;
      const categoryPref = firstReqCatId ? (brandPreferences as any)[firstReqCatId] : undefined;
      const profit = categoryPref?.defaultProfitPct ?? 0;
      const discount = categoryPref?.defaultDiscountPct ?? 0;
      const tax = categoryPref?.defaultTaxPct ?? 0;

      return {
        id: `temp-${Date.now()}-${activity.id}`,
        activityId: activity.id,
        description: activity.name,
        unit: activity.unit,
        quantity: 1,
        rate: finalRate,
        discountPct: discount,
        profitPct: profit,
        taxRate: tax,
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

  items.forEach((it, idx) => {
    const isActivity = !!activityRows[idx];
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;

    if (isActivity) {
      const finalAmount = qty * rate;
      subTotalAll += finalAmount;
      grandTotalAll += finalAmount;
    } else {
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
    }
  });

  const thClass = "px-2 py-3 text-left text-[11px] font-bold text-purple-950 uppercase tracking-wide border-r border-b border-purple-200/90 last:border-r-0 whitespace-nowrap bg-purple-100/95 backdrop-blur-md sticky top-0 z-20 shadow-2xs";
  const tdClass = "px-2 py-1.5 align-top border-r border-b border-purple-100/90 last:border-r-0 bg-white/40 backdrop-blur-xs";

  return (
    <div className="flex flex-col bg-slate-50/60 min-h-screen w-full relative print:overflow-visible print:h-auto bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]">
      <div className="flex flex-col h-full w-full print:hidden">
        {/* Header (Row 1) */}
      <div className="sticky top-0 h-[52px] flex shrink-0 items-center justify-between border-b border-purple-200/80 bg-white/95 backdrop-blur-md px-4 py-2 shadow-[0_4px_20px_0_rgba(124,58,237,0.06)] z-40">
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

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 print:hidden">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <Select
              value={currentStatus}
              disabled={isStaff || updatingStatus || isReadOnlyQuotation}
              onValueChange={(val: any) => handleStatusChange(val)}
            >
              <SelectTrigger className={`w-[130px] h-9 text-xs font-bold rounded-none border shadow-2xs disabled:opacity-50 ${
                currentStatus === "FINAL" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                currentStatus === "DRAFT" ? "bg-slate-100 text-slate-700 border-slate-300" :
                "bg-purple-50 text-purple-700 border-purple-200"
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-purple-200">
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="FINAL">FINAL (Lock Staff)</SelectItem>
                <SelectItem value="SENT">SENT</SelectItem>
                <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="EXPIRED">EXPIRED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Select disabled={isReadOnlyQuotation} value={pricingMode} onValueChange={(val: any) => setPricingMode(val)}>
              <SelectTrigger className="w-[190px] h-9 text-xs font-semibold bg-purple-50/80 backdrop-blur-xs text-purple-700 border-purple-200 rounded-none print:hidden shadow-xs disabled:opacity-50">
                <SelectValue placeholder="Pricing Mode" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-purple-200">
                <SelectItem value="combined">Material + Labour (Combined)</SelectItem>
                <SelectItem value="separate">Material & Labour (Separate)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              disabled={isReadOnlyQuotation}
              onClick={() => window.print()}
              className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 hover:bg-purple-50 text-slate-700 shadow-xs print:hidden disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
          </div>

          {currentStatus === "ACCEPTED" && !isConvertedToProject && (
            <Button
              onClick={handleConvertToProject}
              className="gap-1.5 h-9 px-3.5 rounded-none text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md print:hidden cursor-pointer"
              title="Convert this Accepted Quotation into an Active Project"
            >
              <Briefcase className="h-4 w-4" /> Convert to Project
            </Button>
          )}

          {isAdmin && isNegotiationEligible && (
            <Button
              variant="outline"
              disabled={isReadOnlyQuotation}
              onClick={() => {
                setRevisionNote(`After negotiation meeting on ${new Date().toLocaleDateString("en-IN")}`);
                setRevisionDialogOpen(true);
              }}
              className="gap-1.5 h-9 px-3 rounded-none text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-xs print:hidden disabled:opacity-50"
              title="Save As Revision after negotiation meeting"
            >
              <Copy className="h-3.5 w-3.5 text-amber-600" /> Save As Revision
            </Button>
          )}

          <Button
            onClick={() => setBrandPreferencesOpen(true)}
            disabled={isReadOnlyQuotation}
            variant="outline"
            className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 hover:bg-blue-50 hover:text-blue-600 shadow-xs print:hidden disabled:opacity-50"
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

          {!isLockedForStaff && (
            <Button
              onClick={handleSave}
              disabled={saving || isReadOnlyQuotation}
              className="gap-2 h-9 px-4 rounded-none font-semibold bg-purple-700 text-white hover:bg-purple-800 transition-all shadow-md disabled:opacity-50 print:hidden"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Quotation
            </Button>
          )}
        </div>
      </div>

      {/* Locked Read-Only Banner */}
      {isLockedByStatus && !manualEditUnlocked && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4.5 h-4.5 text-emerald-200" />
            <span>
              {isConvertedToProject
                ? `Active Project Baseline (${convertedProject?.code || qSnap?.projectCode || "PRJ-ACTIVE"}): This accepted quotation was converted into a Project. It is locked in Read-Only mode.`
                : `Quotation Locked (Status: ${currentStatus}): All editing features are locked in Read-Only mode.`}
            </span>
          </div>
          <Button
            onClick={handleToggleManualEdit}
            variant="outline"
            size="sm"
            className="h-7 text-xs font-bold border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 rounded-none shadow-2xs cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Enable Manual Editing
          </Button>
        </div>
      )}

      {/* Manual Edit Unlocked Banner */}
      {isLockedByStatus && manualEditUnlocked && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-white" />
            <span>Manual Editing Unlocked ({currentStatus} Status): Editing features are temporarily enabled.</span>
          </div>
          <Button
            onClick={handleToggleManualEdit}
            variant="outline"
            size="sm"
            className="h-7 text-xs font-bold border-amber-300 bg-white text-amber-900 hover:bg-amber-50 rounded-none shadow-2xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
            Re-Lock Quotation
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex bg-slate-50/50 p-4 print:p-0 print:bg-white print:overflow-visible">
        <div className={`flex-1 ${isFullscreen ? 'max-w-none px-4' : 'max-w-[1400px]'} mx-auto w-full flex flex-col gap-4 print:gap-0 transition-all duration-300`}>
          
          {/* Activity Selection UI & Controls (Row 2) */}
          <div className="sticky top-[52px] z-30 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-none border-b border-purple-200/80 shadow-xs print:hidden">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Activity Type:</span>
                <Select 
                  disabled={isReadOnlyQuotation}
                  value={selectedType || ""} 
                  onValueChange={(val) => {
                    setSelectedType(val);
                    const t = activityTypes.find(x => x.name === val);
                    setSelectedCategory(t?.categories[0]?.name || "");
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9 text-sm font-semibold bg-white border-purple-200/80 rounded-none shadow-xs disabled:opacity-50">
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
                    disabled={isReadOnlyQuotation}
                    value={selectedCategory} 
                    onValueChange={(val) => {
                      setSelectedCategory(val || "");
                      setSidebarOpen(true);
                    }}
                  >
                    <SelectTrigger className="w-[220px] h-9 text-sm font-semibold text-slate-700 bg-slate-50 border-purple-200/80 rounded-none disabled:opacity-50">
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
            {/* Quick Profit Shift Controller for Post-Negotiation */}
            {isNegotiationEligible && (
              <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-300 px-3 py-1 rounded-none shadow-2xs">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Profit Shift:
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isReadOnlyQuotation}
                    onClick={() => handleProfitShift(-2)}
                    className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs disabled:opacity-50"
                    title="Decrease all item profits by 2%"
                  >
                    -2%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isReadOnlyQuotation}
                    onClick={() => handleProfitShift(-1)}
                    className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs disabled:opacity-50"
                    title="Decrease all item profits by 1%"
                  >
                    -1%
                  </Button>
                  <span className="text-xs font-black text-amber-950 px-2 py-0.5 bg-amber-200/80 rounded min-w-[36px] text-center">
                    {profitShift >= 0 ? `+${profitShift}%` : `${profitShift}%`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isReadOnlyQuotation}
                    onClick={() => handleProfitShift(+1)}
                    className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs disabled:opacity-50"
                    title="Increase all item profits by 1%"
                  >
                    +1%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isReadOnlyQuotation}
                    onClick={() => handleProfitShift(+2)}
                    className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs disabled:opacity-50"
                    title="Increase all item profits by 2%"
                  >
                    +2%
                  </Button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <CascadingMaterialMenu products={products} onSelect={handleAddRawMaterial} disabled={isReadOnlyQuotation} />
              <Button 
                onClick={addItemRow} 
                disabled={isReadOnlyQuotation}
                variant="default"
                className="h-9 text-xs gap-1.5 bg-slate-900 hover:bg-black text-white rounded-none shadow-xs whitespace-nowrap font-semibold disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add Custom Item
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger disabled={isReadOnlyQuotation} className="h-9 px-3 text-xs gap-1.5 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-none shadow-xs whitespace-nowrap font-semibold inline-flex items-center outline-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
                  <Type className="h-4 w-4" /> Add Heading
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs font-semibold">
                  <DropdownMenuItem onClick={addHeadingRow} className="cursor-pointer text-slate-700">
                    <Type className="h-4 w-4 mr-2 text-purple-600" /> Blank Section Heading
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHeadingPresetsOpen(true)} className="cursor-pointer text-purple-700 font-bold bg-purple-50/50 focus:bg-purple-100">
                    <BookOpen className="h-4 w-4 mr-2 text-purple-700" /> Preset Heading Templates...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-none border border-purple-300/80 bg-white/60 backdrop-blur-xl shadow-md flex flex-col max-h-[calc(100vh-180px)] overflow-auto">
            <div className="min-w-full">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-purple-200">
                    <th className={`${thClass} w-[50px]`}><div className="flex items-center gap-1 justify-center"><ListOrdered className="h-3.5 w-3.5 text-slate-400" /> SL</div></th>
                    <th className={`${thClass} min-w-[360px]`}><div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-emerald-500" /> ITEM NAME / SPEC</div></th>
                    <th className={`${thClass} w-[110px]`}><div className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-blue-500" /> UNIT</div></th>
                    <th className={`${thClass} w-[85px]`}><div className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-orange-500" /> QTY</div></th>
                    {pricingMode === "separate" ? (
                      <>
                        <th className={`${thClass} w-[115px]`}><div className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-blue-500" /> MAT RATE</div></th>
                        <th className={`${thClass} w-[115px]`}><div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> LAB RATE</div></th>
                      </>
                    ) : (
                      <th className={`${thClass} w-[125px]`}><div className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" /> RATE</div></th>
                    )}
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> % PROFIT</div></th>
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Percent className="h-3.5 w-3.5 text-red-500" /> % DISC</div></th>
                    <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5 text-cyan-500" /> % TAX</div></th>
                    <th className={`${thClass} w-[105px]`}><div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-purple-500" /> TAX AMT</div></th>
                    <th className={`${thClass} w-[115px]`}><div className="flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-blue-600" /> SUB TOTAL</div></th>
                    <th className={`${thClass} w-[125px]`}><div className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-emerald-500" /> TOTAL</div></th>
                    {profitShift !== 0 && (
                      <th className={`${thClass} w-[105px] text-amber-950 bg-amber-100/90`}><div className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-600" /> DIFF</div></th>
                    )}
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
                      const isActivity = !!activityRows[idx];
                      const isHeading = !!it.snapshotData?.isHeading;

                      const qty = Number(it.quantity) || 0;
                      const rate = Number(it.rate) || 0;
                      const disc = Number(it.discountPct) || 0;
                      const tax = Number(it.taxRate) || 0;
                      const profit = Number(it.profitPct) || 0;

                      let baseAmount = 0;
                      let withProfit = 0;
                      let afterDisc = 0;
                      let taxAmt = 0;
                      let finalAmount = 0;

                      if (isActivity) {
                        finalAmount = qty * rate;
                      } else {
                        baseAmount = qty * rate;
                        withProfit = baseAmount + (baseAmount * profit) / 100;
                        afterDisc = withProfit - (withProfit * disc) / 100;
                        taxAmt = (afterDisc * tax) / 100;
                        finalAmount = afterDisc + taxAmt;
                      }

                      if (isHeading) {
                        return (                          <tr key={it.id || idx} className="hover:bg-purple-100/50 transition-colors bg-purple-50/50">
                            <td className="px-1.5 py-0.5 align-middle border-r border-b border-purple-200">
                              <Input
                                value={it.snapshotData?.serialNumber ?? ""}
                                disabled={isReadOnlyQuotation}
                                onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                                placeholder={it.snapshotData?.serialNumber !== undefined ? "" : String(idx + 1)}
                                className="h-6 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-1.5 py-0.5 align-middle border-r border-b border-purple-200">
                              <RichTextEditor
                                content={it.description || ""}
                                readOnly={isReadOnlyQuotation}
                                onChange={(html) => updateItem(idx, { description: html })}
                                className="h-auto min-h-[24px] text-sm border-transparent hover:border-purple-200 focus:border-primary bg-transparent px-1 py-0.5 w-full text-slate-800 tracking-wide rounded-md outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="SECTION HEADING..."
                              />
                            </td>
                            <td className="border-r border-b border-purple-200 bg-purple-50/30" colSpan={pricingMode === "separate" ? (profitShift !== 0 ? 11 : 10) : (profitShift !== 0 ? 10 : 9)} />
                            <td className="px-1.5 py-0.5 text-center bg-purple-50/50 align-middle border-b border-purple-200">
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger disabled={isReadOnlyQuotation} className="inline-flex shrink-0 items-center justify-center h-6 w-6 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md outline-none disabled:opacity-50 disabled:pointer-events-none">
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
                              disabled={isReadOnlyQuotation}
                              onChange={(e) => updateItem(idx, { snapshotData: { ...it.snapshotData, serialNumber: e.target.value } })}
                              placeholder={it.snapshotData?.serialNumber !== undefined ? "" : String(idx + 1)}
                              className="h-8 text-xs font-bold text-center border-transparent hover:border-purple-200 focus:border-primary px-1 w-full bg-transparent text-slate-500 disabled:opacity-70"
                            />
                          </td>
                          <td className={tdClass}>
                            <RichTextEditor
                              content={it.description || ""}
                              readOnly={isReadOnlyQuotation}
                              onChange={(html) => updateItem(idx, { description: html })}
                              className="w-full min-h-[34px] text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary focus:ring-1 focus:ring-purple-500 shadow-sm px-2 py-1.5 font-medium overflow-hidden leading-relaxed text-justify"
                              placeholder="Item description..."
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              value={it.unit}
                              disabled={isReadOnlyQuotation}
                              onChange={(e) => updateItem(idx, { unit: e.target.value })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-1 text-center disabled:opacity-70"
                            />
                          </td>
                          <td className={tdClass}>
                            <Input
                              disabled={isReadOnlyQuotation}
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                              className="h-8 text-xs border border-purple-200 bg-white rounded-md hover:border-purple-300 focus:border-primary shadow-sm px-1 text-center disabled:opacity-70"
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
                                  readOnly={isActivity || isReadOnlyQuotation}
                                  title={isActivity ? "Material Rate is computed from configured materials" : undefined}
                                  className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity || isReadOnlyQuotation ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
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
                                  readOnly={isActivity || isReadOnlyQuotation}
                                  className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity || isReadOnlyQuotation ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
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
                                readOnly={isActivity || isReadOnlyQuotation}
                                title={isActivity ? "Rate is computed from configured materials" : undefined}
                                className={`h-8 text-xs border rounded-md px-2 text-right ${isActivity || isReadOnlyQuotation ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed shadow-none" : "bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm"}`}
                              />
                            </td>
                          )}
                          <td className={tdClass}>
                            {isActivity ? (
                              <div className="h-8 flex items-center justify-center text-xs text-slate-400 font-bold">--</div>
                            ) : (
                              <Input
                                type="number"
                                disabled={isReadOnlyQuotation}
                                value={it.profitPct}
                                onChange={(e) => updateItem(idx, { profitPct: Number(e.target.value) || 0 })}
                                className="h-8 text-xs border rounded-md px-2 text-right bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm disabled:opacity-70"
                              />
                            )}
                          </td>
                          <td className={tdClass}>
                            {isActivity ? (
                              <div className="h-8 flex items-center justify-center text-xs text-slate-400 font-bold">--</div>
                            ) : (
                              <Input
                                type="number"
                                disabled={isReadOnlyQuotation}
                                value={it.discountPct}
                                onChange={(e) => updateItem(idx, { discountPct: Number(e.target.value) || 0 })}
                                className="h-8 text-xs border rounded-md px-2 text-right bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm disabled:opacity-70"
                              />
                            )}
                          </td>
                          <td className={tdClass}>
                            {isActivity ? (
                              <div className="h-8 flex items-center justify-center text-xs text-slate-400 font-bold">--</div>
                            ) : (
                              <Input
                                type="number"
                                disabled={isReadOnlyQuotation}
                                value={it.taxRate}
                                onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) || 0 })}
                                className="h-8 text-xs border rounded-md px-2 text-right bg-white border-purple-200 hover:border-purple-300 focus:border-primary shadow-sm disabled:opacity-70"
                              />
                            )}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 text-purple-600 font-medium`}>
                            {isActivity ? <span className="text-slate-400 font-bold flex justify-center">--</span> : taxAmt.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-medium text-slate-600`}>
                            {isActivity ? <span className="text-slate-400 font-bold flex justify-center">--</span> : afterDisc.toFixed(2)}
                          </td>
                          <td className={`${tdClass} text-right py-3 pr-4 font-bold text-emerald-700 bg-emerald-50/30`}>
                            {finalAmount.toFixed(2)}
                          </td>
                          {profitShift !== 0 && (
                            <td className={`${tdClass} text-right py-3 pr-3 font-bold bg-amber-50/60`}>
                              {(() => {
                                const origProfit = Math.max(0, profit - profitShift);
                                const origWithProfit = baseAmount + (baseAmount * origProfit) / 100;
                                const origAfterDisc = origWithProfit - (origWithProfit * disc) / 100;
                                const origTaxAmt = (origAfterDisc * tax) / 100;
                                const origFinal = origAfterDisc + origTaxAmt;
                                const itemDiff = finalAmount - origFinal;
                                return (
                                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border ${
                                    itemDiff >= 0 ? "text-emerald-800 bg-emerald-100 border-emerald-300" : "text-red-800 bg-red-100 border-red-300"
                                  }`}>
                                    {itemDiff >= 0 ? `+₹${itemDiff.toFixed(0)}` : `-₹${Math.abs(itemDiff).toFixed(0)}`}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
                          <td className={`${tdClass} text-center py-2 bg-white align-middle`}>
                            <div className="flex flex-col items-center justify-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger disabled={isReadOnlyQuotation} className="inline-flex shrink-0 items-center justify-center h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md outline-none disabled:opacity-50 disabled:pointer-events-none">
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
      <div className="hidden print:block w-full bg-white text-black font-sans" style={{padding: '1.2cm 1.5cm', minHeight: '100vh'}}>
        <style type="text/css" media="print">
          {`
            @page { margin: 0; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
            .print-blue { color: #0D2B6B !important; }
            .print-blue-bg { background-color: #0D2B6B !important; color: white !important; }
            .print-blue-light-bg { background-color: #F4F8FF !important; }
            .print-blue-border { border-color: #0D2B6B !important; }
          `}
        </style>

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-6">
          {/* Left: Title */}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-wide mb-0.5" style={{color: '#0D2B6B'}}>QUOTATION</h1>
            <p className="text-sm font-medium text-slate-500">Ref: {quotation?.code}</p>
          </div>
          {/* Right: Company Logo / Letterhead */}
          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-black text-base uppercase tracking-wide" style={{color: '#0D2B6B'}}>
                  {adminProfile?.companyName || 'YOUR COMPANY'}
                </p>
                {adminProfile?.email && (
                  <p className="text-xs text-slate-500">{adminProfile.email}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black" style={{backgroundColor: '#0D2B6B'}}>
                {(adminProfile?.companyName || 'C')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* ── CLIENT & PROJECT DETAILS CARD ── */}
        <div className="border border-slate-200 rounded-sm mb-5 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* Client Details */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E88FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="text-xs font-bold uppercase tracking-widest" style={{color: '#0D2B6B'}}>Client Details</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{quotation?.customer?.name || '—'}</p>
              {quotation?.customer?.phone && <p className="text-slate-600 text-xs mt-0.5">{quotation.customer.phone}</p>}
              {quotation?.customer?.address && <p className="text-slate-600 text-xs mt-0.5">{quotation.customer.address}</p>}
            </div>
            {/* Project Details */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E88FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span className="text-xs font-bold uppercase tracking-widest" style={{color: '#0D2B6B'}}>Project Details</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{quotation?.project?.name || '—'}</p>
              {quotation?.project?.code && <p className="text-slate-600 text-xs mt-0.5">Code: {quotation.project.code}</p>}
            </div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <table className="w-full text-xs border-collapse mb-5" style={{borderColor: '#0D2B6B'}}>
          <thead>
            <tr style={{backgroundColor: '#0D2B6B', color: 'white'}}>
              <th className="py-2.5 px-2 text-center font-bold border border-white/20 w-[5%]">SL.</th>
              <th className={`py-2.5 px-3 text-left font-bold border border-white/20 ${pricingMode === "separate" ? "w-[43%]" : "w-[53%]"}`}>ITEM DESCRIPTION</th>
              <th className="py-2.5 px-2 text-center font-bold border border-white/20 w-[10%]">UNIT</th>
              <th className="py-2.5 px-2 text-center font-bold border border-white/20 w-[8%]">QTY</th>
              {pricingMode === "separate" && (
                <>
                  <th className="py-2.5 px-2 text-right font-bold border border-white/20 w-[9%]">MAT RATE</th>
                  <th className="py-2.5 px-2 text-right font-bold border border-white/20 w-[9%]">LAB RATE</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right font-bold border border-white/20 w-[15%]">TOTAL</th>
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
                  <tr key={it.id || idx} style={{backgroundColor: '#f8f8f8'}}>
                    <td className="border border-slate-300 py-2 px-2 text-center align-top font-bold text-slate-800">{slNo}</td>
                    <td
                      className="border border-slate-300 py-2 px-3 align-top font-bold text-slate-800 prose prose-xs max-w-none"
                      dangerouslySetInnerHTML={{ __html: it.description || "" }}
                    />
                    <td className="border border-slate-300 py-2 px-2" colSpan={pricingMode === "separate" ? 5 : 3} />
                  </tr>
                );
              }

              return (
                <tr key={it.id || idx}>
                  <td className="border border-slate-300 py-2 px-2 text-center align-top text-slate-600">{slNo}</td>
                  <td className="border border-slate-300 py-2 px-3 align-top">
                    <div
                      className="text-slate-800 prose prose-xs max-w-none text-justify"
                      dangerouslySetInnerHTML={{ __html: it.description || "" }}
                    />
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center align-top text-slate-600">{it.unit}</td>
                  <td className="border border-slate-300 py-2 px-2 text-center align-top font-bold text-slate-800">{qty}</td>
                  {pricingMode === "separate" && (
                    <>
                      <td className="border border-slate-300 py-2 px-2 text-right text-slate-700">{matRate.toFixed(2)}</td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-slate-700">{labRate.toFixed(2)}</td>
                    </>
                  )}
                  <td className="border border-slate-300 py-2 px-3 text-right font-bold text-slate-900">₹ {finalAmount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── TERMS + TOTALS ── */}
        {(() => {
          const hasExplicitTax = taxTotalAll > 0;
          const computedSubTotal = hasExplicitTax ? subTotalAll : grandTotalAll / 1.18;
          const computedTax = hasExplicitTax ? taxTotalAll : (grandTotalAll - computedSubTotal);
          const taxLabel = hasExplicitTax ? "Tax Amount" : "GST @ 18%";

          return (
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Terms & Notes */}
              <div>
                <p className="font-bold text-sm text-slate-800 mb-2">Terms & Notes</p>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>This quotation is valid for 30 days from the date of issue.</li>
                  <li>Payment Terms: 100% Advance / As mutually agreed.</li>
                  <li>Material will be as per specification and subject to availability.</li>
                </ul>
                {quotation?.termsAndConditions && (
                  <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{quotation.termsAndConditions}</p>
                )}
              </div>
              {/* Totals Box */}
              <div>
                <div className="border border-slate-200 overflow-hidden rounded-sm">
                  <div className="flex justify-between px-4 py-2.5 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-700">Sub Total</span>
                    <span className="text-sm font-bold text-slate-900">₹ {computedSubTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-700">{taxLabel}</span>
                    <span className="text-sm font-bold text-slate-900">₹ {computedTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3" style={{backgroundColor: '#1a5c38'}}>
                    <span className="text-sm font-black text-white">Grand Total</span>
                    <span className="text-sm font-black text-white">₹ {grandTotalAll.toFixed(2)}</span>
                  </div>
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
        brandPreferences={brandPreferences as any}
        onSave={async (prefs) => {
          setBrandPreferences(prefs as any);
          try {
            await updateQuotation(id, { brandPreferences: prefs as any });
            
            // Automatically apply category profit, discount, and tax defaults to quotation items
            setItems((prevItems) =>
              prevItems.map((it) => {
                const prod = products.find((p) => p.name === it.description || p.id === it.id);
                const catId = prod?.categoryId;
                if (catId && prefs[catId]) {
                  const categoryPref = prefs[catId];
                  return {
                    ...it,
                    profitPct: categoryPref.defaultProfitPct ?? it.profitPct,
                    discountPct: categoryPref.defaultDiscountPct ?? it.discountPct,
                    taxRate: categoryPref.defaultTaxPct ?? it.taxRate,
                  };
                }
                return it;
              })
            );
          } catch (err) {
            console.error("Failed to save brand preferences", err);
          }
        }}
        products={products}
      />

      {/* Save As Revision (Negotiation) Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-amber-200 rounded-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-600" />
              Save As Revision (Post Negotiation)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new revision copy of this quotation for negotiation adjustments. The original quotation will remain untouched.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Revision Title / Negotiation Note *
              </label>
              <Input
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="e.g. After negotiation meeting on 13/08/2026"
                className="text-xs h-10 rounded-none border-amber-200 bg-white focus-visible:ring-amber-500 font-medium"
              />
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 text-xs text-purple-900 rounded-none space-y-1">
              <p className="font-bold">Original Quotation: {quotation?.code}</p>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                The new revision will start in <span className="font-bold">DRAFT</span> status and carry over all line items, brand setups, and spreadsheet configurations.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-none border-slate-300" onClick={() => setRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsRevision}
              disabled={savingRevision}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-md"
            >
              {savingRevision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Create Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HeadingPresetsDialog
        open={headingPresetsOpen}
        onOpenChange={setHeadingPresetsOpen}
        onSelectPreset={handleInsertPresetHeading}
      />
    </div>
  );
}
