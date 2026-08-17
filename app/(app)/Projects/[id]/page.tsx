"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Briefcase, Calendar, CheckCircle2, Clock, Coins, Copy, CreditCard,
  FileText, FolderKanban, Layers, ListOrdered, Lock, Maximize2, Minimize2, MoreVertical,
  Package, Percent, Plus, Printer, Receipt, RefreshCw, Save, Settings, ShieldAlert,
  Sparkles, Tag, Trash2, TrendingUp, Type, Unlock, User, Zap, Calculator, GitBranch
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getProjectById, addProjectRevision, updateProjectStatus, Project, ProjectRevision } from "@/app/lib/api/projects";
import { listActivities, Activity, getActivityTypes, ActivityType } from "@/app/lib/api/activities";
import { listProducts } from "@/app/lib/catalog/api";
import type { ProductModel } from "@/app/lib/catalog/types";

import { ActivitySelectionSidebar } from "@/components/quotations/ActivitySelectionSidebar";
import { QuotationItemMaterialDialog } from "@/components/quotations/QuotationItemMaterialDialog";
import { CascadingMaterialMenu } from "@/components/quotations/CascadingMaterialMenu";
import { BrandPreferencesDialog } from "@/components/quotations/BrandPreferencesDialog";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import Swal from "sweetalert2";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [activeRevision, setActiveRevision] = useState<ProjectRevision | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Activity customization mappings
  const [activityRows, setActivityRows] = useState<Record<number, string>>({});
  const [activityCustomizations, setActivityCustomizations] = useState<Record<number, Record<string, string>>>({});
  const [brandPreferences, setBrandPreferences] = useState<Record<string, { manufacturerId: string; seriesId?: string | null }>>({});

  // Dialogs & Fullscreen
  const [configuringIdx, setConfiguringIdx] = useState<number | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [brandPreferencesOpen, setBrandPreferencesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rate Revision Dialog State
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [savingRevision, setSavingRevision] = useState(false);

  // Escalation / Profit Shift Controller
  const [profitShift, setProfitShift] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pData = getProjectById(id);
      if (pData) {
        setProject(pData);
        
        // Find active revision or latest
        const currentRev = (pData.revisions || []).find((r) => r.id === pData.activeRevisionId) || pData.revisions?.[0];
        if (currentRev) {
          setActiveRevision(currentRev);
          setItems(currentRev.items || []);
          setActivityRows(currentRev.activityRows || {});
          setActivityCustomizations(currentRev.activityCustomizations || {});
          setBrandPreferences(currentRev.brandPreferences || {});
        }
      }

      const [aRes, pRes, typesRes] = await Promise.all([
        listActivities({ limit: 1000 }),
        listProducts({ limit: 1000 }),
        getActivityTypes(),
      ]);
      setActivities(aRes.items || []);
      setProducts(pRes.items || []);
      setActivityTypes(typesRes || []);
    } catch (e) {
      console.error("Error loading project details", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching selected revision from Directory
  const handleSelectRevision = (revId: string) => {
    if (!project) return;
    const rev = (project.revisions || []).find((r) => r.id === revId);
    if (rev) {
      setActiveRevision(rev);
      setItems(rev.items || []);
      setActivityRows(rev.activityRows || {});
      setActivityCustomizations(rev.activityCustomizations || {});
      setBrandPreferences(rev.brandPreferences || {});
      setProfitShift(0);
    }
  };

  // Escalation Profit Shift
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

  // Calculations for totals
  let subTotalAll = 0;
  let taxTotalAll = 0;
  let grandTotalAll = 0;

  items.forEach((it, idx) => {
    const isHeading = it.snapshotData?.isHeading;
    const isActivity = it.snapshotData?.isActivity || !!activityRows[idx];

    if (isHeading) return;

    const qty = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;

    if (isActivity) {
      const actTotal = qty * rate;
      subTotalAll += actTotal;
      grandTotalAll += actTotal;
    } else {
      const p = Number(it.profitPct) || 0;
      const d = Number(it.discountPct) || 0;
      const t = Number(it.taxRate) || 0;

      const baseAmount = qty * rate;
      const profitAmt = baseAmount * (p / 100);
      const discAmt = (baseAmount + profitAmt) * (d / 100);
      const sub = baseAmount + profitAmt - discAmt;
      const tax = sub * (t / 100);
      const total = sub + tax;

      subTotalAll += sub;
      taxTotalAll += tax;
      grandTotalAll += total;
    }
  });

  // Save As New Rate Revision
  const handleSaveRateRevision = async () => {
    if (!project) return;
    setSavingRevision(true);
    try {
      const defaultNote = revisionNote.trim() || `Rate revision on ${new Date().toLocaleDateString("en-IN")}`;
      const result = addProjectRevision(project.id, {
        revisionNote: defaultNote,
        items,
        subTotal: subTotalAll,
        taxTotal: taxTotalAll,
        grandTotal: grandTotalAll,
        activityRows,
        activityCustomizations,
        brandPreferences,
      });

      if (result) {
        setProject(result.project);
        setActiveRevision(result.revision);
        setRevisionDialogOpen(false);
        setRevisionNote("");
        setProfitShift(0);
        Swal.fire({
          title: "Rate Revision Saved!",
          text: `Saved as Revision ${result.revision.revisionNumber} (${defaultNote}). This is now the latest active project BOQ.`,
          icon: "success",
          confirmButtonColor: "#7c3aed",
        });
      }
    } catch (e) {
      console.error("Failed to save rate revision", e);
    } finally {
      setSavingRevision(false);
    }
  };

  const handleStatusChange = (newStatus: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD") => {
    if (!project) return;
    const updated = updateProjectStatus(project.id, newStatus);
    if (updated) {
      setProject(updated);
      Swal.fire("Status Updated", `Project status changed to ${newStatus.replace("_", " ")}`, "success");
    }
  };

  // Add Item / Heading handlers
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
      },
    ]);
  };

  const addHeadingRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        description: "",
        unit: "",
        quantity: 0,
        rate: 0,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: 0,
        sortOrder: prev.length,
        snapshotData: { isHeading: true, serialNumber: "" },
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemField = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: val };
      return clone;
    });
  };

  const handleAddRawMaterial = (prod: ProductModel) => {
    const defaultProfit = 0;
    const defaultDisc = Number(prod.discountPercent) || 0;
    const defaultTax = Number(prod.gstRate) || Number((prod as any).gstPercent) || 0;

    setItems((prev) => [
      ...prev,
      {
        id: `prod-${prod.id}-${Date.now()}`,
        description: prod.name,
        unit: prod.unit || "NOS",
        quantity: 1,
        rate: Number(prod.mrp) || 0,
        discountPct: defaultDisc,
        profitPct: defaultProfit,
        taxRate: defaultTax,
        amount: Number(prod.mrp) || 0,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleAddSelectedActivities = (selectedActivities: Activity[]) => {
    const newItems = selectedActivities.map((activity) => {
      const defaultMatCost = Number(activity.materialCost) || 0;
      const defaultLabCost = Number(activity.labourCost) || 0;
      const calculatedRate = defaultMatCost + defaultLabCost;

      return {
        id: `act-${activity.id}-${Date.now()}`,
        description: activity.name,
        unit: activity.unit || "POINT",
        quantity: 1,
        rate: calculatedRate,
        discountPct: 0,
        profitPct: 0,
        taxRate: 0,
        amount: calculatedRate,
        sortOrder: items.length,
        snapshotData: { isActivity: true },
      };
    });

    const startIdx = items.length;
    setItems((prev) => [...prev, ...newItems]);

    setActivityRows((prev) => {
      const updated = { ...prev };
      selectedActivities.forEach((act, idx) => {
        updated[startIdx + idx] = act.id;
      });
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-slate-500 min-h-screen flex items-center justify-center">
        Loading Project BOQ Workspace...
      </div>
    );
  }

  if (!project || !activeRevision) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center space-y-4 min-h-screen flex flex-col items-center justify-center">
        <Briefcase className="w-12 h-12 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800">Project Not Found</h2>
        <p className="text-xs text-slate-500">The requested project baseline could not be located.</p>
        <Button onClick={() => router.push("/Projects")} variant="outline" className="rounded-none text-xs">
          Back to Projects
        </Button>
      </div>
    );
  }

  const thClass = "p-2.5 text-left text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-r border-purple-200/90 bg-purple-100/70 select-none whitespace-nowrap";
  const isLatestRevision = activeRevision.isLatest;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 min-h-screen bg-slate-50/50">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-purple-200/80 pb-4 bg-white p-4 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/Projects")}
              className="h-8 text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50 rounded-none shadow-2xs gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
            </Button>
            <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
              {project.code}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Ref: {project.quotationCode}
            </span>
            {isLatestRevision ? (
              <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Latest Rate Baseline
              </span>
            ) : (
              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" /> Past Revision Archive
              </span>
            )}
          </div>

          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 pt-1">
            <Briefcase className="w-5 h-5 text-purple-700" />
            {project.title}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Client: <span className="font-bold text-slate-700">{project.clientName}</span> | Converted: {new Date(project.convertedAt).toLocaleDateString("en-IN")}
          </p>
        </div>

        {/* Project Revision Directory & Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Revision Directory Dropdown */}
          <div className="flex items-center gap-1.5 bg-purple-50/80 border border-purple-200 px-3 py-1 rounded-none shadow-2xs">
            <GitBranch className="w-4 h-4 text-purple-700" />
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
              Rate Revision Directory:
            </span>
            <Select value={activeRevision.id} onValueChange={(val) => handleSelectRevision(val || "")}>
              <SelectTrigger className="h-8 text-xs font-bold text-slate-800 bg-white border-purple-300 rounded-none w-[230px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-purple-200 font-semibold text-xs">
                {(project.revisions || []).map((rev) => (
                  <SelectItem key={rev.id} value={rev.id} className="cursor-pointer font-medium">
                    Rev {rev.revisionNumber}: {rev.revisionNote} {rev.isLatest ? "(LATEST)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              setRevisionNote(`Rate revision on ${new Date().toLocaleDateString("en-IN")}`);
              setRevisionDialogOpen(true);
            }}
            className="gap-1.5 h-9 px-3.5 rounded-none text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer"
            title="Save current rates as a new project rate revision version"
          >
            <Copy className="h-3.5 w-3.5 text-white" /> Save As Rate Revision
          </Button>

          <Button
            onClick={() => setBrandPreferencesOpen(true)}
            variant="outline"
            className="gap-2 h-9 px-3 rounded-none text-xs font-semibold border-purple-200 hover:bg-blue-50 hover:text-blue-600 shadow-xs"
          >
            <Settings className="h-4 w-4" /> Brand Setup
          </Button>
        </div>
      </div>

      {/* Main Project BOQ Controls & Escalation Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-purple-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Escalation / Profit Shift Controller */}
          <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-300 px-3 py-1 rounded-none shadow-2xs">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              Rate Escalation Shift:
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProfitShift(-2)}
                className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs"
                title="Decrease all item rates by 2%"
              >
                -2%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProfitShift(-1)}
                className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs"
                title="Decrease all item rates by 1%"
              >
                -1%
              </Button>
              <span className="text-xs font-black text-amber-950 px-1">
                {profitShift > 0 ? `+${profitShift}%` : `${profitShift}%`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProfitShift(+1)}
                className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs"
                title="Increase all item rates by 1%"
              >
                +1%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleProfitShift(+2)}
                className="h-7 px-2 text-xs font-extrabold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-none shadow-2xs"
                title="Increase all item rates by 2%"
              >
                +2%
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
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

      {/* Project BOQ Table Container */}
      <div className="rounded-none border border-purple-300/80 bg-white shadow-md flex flex-col overflow-auto">
        <div className="min-w-full">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-purple-200">
                <th className={`${thClass} w-[50px]`}><div className="flex items-center gap-1 justify-center"><ListOrdered className="h-3.5 w-3.5 text-slate-400" /> SL</div></th>
                <th className={`${thClass} min-w-[360px]`}><div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-emerald-500" /> ITEM NAME / SPECIFICATION</div></th>
                <th className={`${thClass} w-[110px]`}><div className="flex items-center gap-1"><Package className="h-3.5 w-3.5 text-blue-500" /> UNIT</div></th>
                <th className={`${thClass} w-[85px]`}><div className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-orange-500" /> QTY</div></th>
                <th className={`${thClass} w-[125px]`}><div className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" /> RATE</div></th>
                <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> % PROFIT</div></th>
                <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Percent className="h-3.5 w-3.5 text-red-500" /> % DISC</div></th>
                <th className={`${thClass} w-[65px]`}><div className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5 text-cyan-500" /> % TAX</div></th>
                <th className={`${thClass} w-[105px]`}><div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-purple-500" /> TAX AMT</div></th>
                <th className={`${thClass} w-[115px]`}><div className="flex items-center gap-1"><Calculator className="h-3.5 w-3.5 text-blue-600" /> SUB TOTAL</div></th>
                <th className={`${thClass} w-[125px]`}><div className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-emerald-500" /> TOTAL</div></th>
                <th className={`${thClass} w-[45px]`}><div className="flex items-center gap-1 justify-center"><Zap className="h-3.5 w-3.5 text-slate-800" /> ACT</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/70">
              {items.map((item, index) => {
                const isHeading = item.snapshotData?.isHeading;
                const isActivity = item.snapshotData?.isActivity || !!activityRows[index];

                if (isHeading) {
                  return (
                    <tr key={item.id || index} className="bg-purple-100/80 font-bold border-y border-purple-200">
                      <td colSpan={11} className="p-2.5 px-4 text-purple-950 font-black tracking-wide text-xs">
                        <RichTextEditor
                          content={item.description}
                          onChange={(val) => updateItemField(index, "description", val)}
                          placeholder="Section Heading Title..."
                          className="min-h-[36px] bg-transparent text-purple-950 font-black text-xs border-0 shadow-none focus-within:ring-0"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-none"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;

                if (isActivity) {
                  const itemTotal = qty * rate;

                  return (
                    <tr key={item.id || index} className="hover:bg-purple-50/40 transition-colors">
                      <td className="p-2 text-center font-bold text-slate-500 border-r border-purple-100">{index + 1}</td>
                      <td className="p-2 border-r border-purple-100">
                        <div className="flex items-center justify-between gap-2">
                          <RichTextEditor
                            content={item.description}
                            onChange={(val) => updateItemField(index, "description", val)}
                            placeholder="Activity description..."
                            className="min-h-[36px] bg-transparent text-xs border-0 shadow-none flex-1 font-semibold text-slate-800"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setConfiguringIdx(index);
                              setConfigDialogOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] font-bold border-purple-300 text-purple-700 hover:bg-purple-100 rounded-none shadow-2xs shrink-0"
                          >
                            Configure
                          </Button>
                        </div>
                      </td>
                      <td className="p-2 border-r border-purple-100">
                        <Input
                          value={item.unit || "POINT"}
                          onChange={(e) => updateItemField(index, "unit", e.target.value)}
                          className="h-8 text-xs uppercase text-center font-bold border-purple-200 rounded-none bg-white"
                        />
                      </td>
                      <td className="p-2 border-r border-purple-100">
                        <Input
                          type="number"
                          value={qty}
                          onChange={(e) => updateItemField(index, "quantity", Number(e.target.value))}
                          className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white"
                        />
                      </td>
                      <td className="p-2 border-r border-purple-100 text-right font-extrabold text-slate-800">
                        ₹{rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 border-r border-purple-100 text-center font-medium text-slate-400">--</td>
                      <td className="p-2 border-r border-purple-100 text-center font-medium text-slate-400">--</td>
                      <td className="p-2 border-r border-purple-100 text-center font-medium text-slate-400">--</td>
                      <td className="p-2 border-r border-purple-100 text-center font-medium text-slate-400">--</td>
                      <td className="p-2 border-r border-purple-100 text-center font-medium text-slate-400">--</td>
                      <td className="p-2 border-r border-purple-100 text-right font-black text-emerald-700">
                        ₹{itemTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-none"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                // Standard Material Item Row
                const p = Number(item.profitPct) || 0;
                const d = Number(item.discountPct) || 0;
                const t = Number(item.taxRate) || 0;

                const baseAmount = qty * rate;
                const profitAmt = baseAmount * (p / 100);
                const discAmt = (baseAmount + profitAmt) * (d / 100);
                const sub = baseAmount + profitAmt - discAmt;
                const tax = sub * (t / 100);
                const total = sub + tax;

                return (
                  <tr key={item.id || index} className="hover:bg-purple-50/40 transition-colors">
                    <td className="p-2 text-center font-bold text-slate-500 border-r border-purple-100">{index + 1}</td>
                    <td className="p-2 border-r border-purple-100">
                      <RichTextEditor
                        content={item.description}
                        onChange={(val) => updateItemField(index, "description", val)}
                        placeholder="Item specification..."
                        className="min-h-[36px] bg-transparent text-xs border-0 shadow-none font-semibold text-slate-800"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        value={item.unit || "NOS"}
                        onChange={(e) => updateItemField(index, "unit", e.target.value)}
                        className="h-8 text-xs uppercase text-center font-bold border-purple-200 rounded-none bg-white"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        type="number"
                        value={qty}
                        onChange={(e) => updateItemField(index, "quantity", Number(e.target.value))}
                        className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        type="number"
                        value={rate}
                        onChange={(e) => updateItemField(index, "rate", Number(e.target.value))}
                        className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        type="number"
                        value={p}
                        onChange={(e) => updateItemField(index, "profitPct", Number(e.target.value))}
                        className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white text-emerald-700"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        type="number"
                        value={d}
                        onChange={(e) => updateItemField(index, "discountPct", Number(e.target.value))}
                        className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white text-red-600"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100">
                      <Input
                        type="number"
                        value={t}
                        onChange={(e) => updateItemField(index, "taxRate", Number(e.target.value))}
                        className="h-8 text-xs text-right font-bold border-purple-200 rounded-none bg-white text-cyan-700"
                      />
                    </td>
                    <td className="p-2 border-r border-purple-100 text-right font-semibold text-slate-700">
                      ₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 border-r border-purple-100 text-right font-semibold text-slate-700">
                      ₹{sub.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 border-r border-purple-100 text-right font-black text-emerald-700">
                      ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItemRow(index)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Project Bottom Totals Footer Bar */}
        <div className="bg-purple-50/90 border-t border-purple-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-600">
            Active Revision: <span className="font-extrabold text-purple-900">Rev {activeRevision.revisionNumber} ({activeRevision.revisionNote})</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Sub Total</span>
              <span className="font-extrabold text-slate-800 text-sm">₹{subTotalAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Tax Total</span>
              <span className="font-extrabold text-slate-800 text-sm">₹{taxTotalAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-none shadow-sm">
              <span className="font-bold uppercase tracking-wider block text-[10px] text-emerald-100">Project Grand Total</span>
              <span className="font-black text-base">₹{grandTotalAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save As Rate Revision Modal Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-amber-200 rounded-none shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-600" />
              Save As New Project Rate Revision
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Save updated rates/quantities as a new revision version in your Project Rate Revision Directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Revision Title / Reason *
              </label>
              <Input
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="e.g. Rate escalation Q3 2026 update"
                className="h-9 text-xs bg-white border-amber-300 rounded-none font-semibold"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)} className="rounded-none text-xs border-slate-300">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRateRevision}
              disabled={savingRevision}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              {savingRevision ? "Saving Revision..." : "Save Rate Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Material Configure Dialog */}
      <QuotationItemMaterialDialog
        isOpen={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        activity={configuringIdx !== null && activityRows[configuringIdx] ? activities.find(a => a.id === activityRows[configuringIdx]) : undefined}
        products={products}
        customizations={configuringIdx !== null ? activityCustomizations[configuringIdx] || {} : {}}
        brandPreferences={brandPreferences}
        onSave={(updatedCustomizations, updatedRate) => {
          if (configuringIdx !== null) {
            setActivityCustomizations((prev) => ({
              ...prev,
              [configuringIdx]: updatedCustomizations,
            }));
            updateItemField(configuringIdx, "rate", updatedRate);
            updateItemField(configuringIdx, "amount", updatedRate * (items[configuringIdx]?.quantity || 1));
          }
          setConfigDialogOpen(false);
        }}
      />

      <BrandPreferencesDialog
        open={brandPreferencesOpen}
        onOpenChange={setBrandPreferencesOpen}
        brandPreferences={brandPreferences as any}
        onSave={async (prefs) => {
          setBrandPreferences(prefs as any);
        }}
        products={products}
      />
    </div>
  );
}
