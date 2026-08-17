import { useState, useMemo } from "react";
import { Activity } from "@/app/lib/api/activities";
import type { ProductModel } from "@/app/lib/catalog/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Info, CheckCircle2, ChevronRight, Settings2, PackageSearch } from "lucide-react";

interface ActivityConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  products: ProductModel[];
  onAdd: (item: any) => void;
}

export default function ActivityConfigDialog({
  isOpen,
  onClose,
  activities,
  products,
  onAdd,
}: ActivityConfigDialogProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [selections, setSelections] = useState<Record<string, string>>({}); // requirementKey -> productId

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  // Requirements of the selected activity
  const requirements = useMemo(() => {
    return selectedActivity?.requirements || [];
  }, [selectedActivity]);

  // For each requirement, find matching products
  const requirementMatches = useMemo(() => {
    const matches: Record<string, ProductModel[]> = {};
    requirements.forEach((req: any) => {
      matches[req.id || req.key || Math.random().toString()] = products.filter((p) => {
        if (p.categoryId !== req.categoryId) return false;
        if (req.subCategoryId && p.subCategoryId !== req.subCategoryId) return false;
        
        // Match required attributes
        if (req.requiredAttributes) {
          for (const [key, val] of Object.entries(req.requiredAttributes)) {
            if (p.attributes?.[key] !== val) return false;
          }
        }
        return true;
      });
    });
    return matches;
  }, [requirements, products]);

  const handleSelection = (reqKey: string, productId: string) => {
    setSelections((prev) => ({ ...prev, [reqKey]: productId }));
  };

  const handleAdd = () => {
    if (!selectedActivity) return;

    let totalMaterialCost = 0;
    requirements.forEach((req: any) => {
      const reqKey = req.id || req.key;
      const prodId = selections[reqKey];
      if (prodId) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          totalMaterialCost += (Number(prod.mrp) || 0) * (Number(req.quantity) || 1);
        }
      }
    });

    const labourCost = Number(selectedActivity.labourCost) || 0;
    const finalRate = totalMaterialCost + labourCost;

    onAdd({
      description: selectedActivity.name,
      unit: selectedActivity.unit,
      quantity: qty,
      rate: finalRate,
    });
    
    // reset and close
    setSelectedActivityId("");
    setSelections({});
    setQty(1);
    onClose();
  };

  const isReady =
    selectedActivity &&
    requirements.every((req: any) => {
      const key = req.id || req.key;
      const matches = requirementMatches[key];
      return matches && matches.length > 0 ? !!selections[key] : true;
    });

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[1200px] w-[95vw] bg-white border-0 shadow-2xl p-0 overflow-hidden font-sans rounded-none">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 p-6 text-white shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-emerald-400" />
                Configure Activity
              </DialogTitle>
              <DialogDescription className="text-emerald-100/80 text-sm mt-1">
                Select a master activity and resolve its required materials.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-8 bg-slate-50/50">
            
            {/* Step 1: Select Activity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  1
                </div>
                Select Master Activity
              </div>
              <div className="pl-8">
                <Select
                  value={selectedActivityId}
                  onValueChange={(val) => {
                    setSelectedActivityId(val || "");
                    setSelections({});
                  }}
                >
                  <SelectTrigger className="h-11 w-full bg-white border-slate-200 focus:ring-emerald-500/20 text-sm font-medium shadow-sm transition-all hover:border-emerald-500/50">
                    <SelectValue placeholder="Search or select an activity..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {activities.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="py-2.5 cursor-pointer font-medium text-slate-700">
                        {a.name} <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-slate-100 rounded-md">{a.code}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 2: Configure Materials */}
            {selectedActivity && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                    2
                  </div>
                  Resolve Required Materials
                </div>
                
                <div className="pl-8">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {requirements.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">This activity does not require any materials.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {requirements.map((req: any, index: number) => {
                          const reqKey = req.id || req.key || Math.random().toString();
                          const matches = requirementMatches[reqKey] || [];
                          const hasSelection = !!selections[reqKey];

                          return (
                            <div key={reqKey} className={`p-4 transition-colors ${hasSelection ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                {/* Left Side: Requirement Info */}
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                                      {req.category?.name || "Material"}
                                    </span>
                                    {hasSelection && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                                    {req.description}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1"><PackageSearch className="h-3.5 w-3.5" /> Qty: {req.quantity} {req.unit}</span>
                                  </div>
                                </div>

                                {/* Right Side: Product Selection */}
                                <div className="w-full md:w-[600px] shrink-0">
                                  {matches.length > 0 ? (
                                    <Select
                                      value={selections[reqKey] || ""}
                                      onValueChange={(v) => handleSelection(reqKey, v || "")}
                                    >
                                      <SelectTrigger className={`h-10 text-xs w-full shadow-sm transition-all ${hasSelection ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 ring-emerald-500/20' : 'border-slate-200 bg-white'}`}>
                                        <SelectValue placeholder="Choose Make / Series...">
                                           {(() => {
                                             const selId = selections[reqKey];
                                             const sel = matches.find((m) => m.id === selId);
                                             return sel
                                               ? `${sel.manufacturer?.name || sel.manufacturerName || ""} ${sel.series ? `- ${sel.series}` : ""}`.trim()
                                               : "Choose Make / Series...";
                                           })()}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {matches.map((m) => (
                                          <SelectItem key={m.id} value={m.id} className="py-2 text-xs cursor-pointer">
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-slate-700">{m.manufacturer?.name || m.manufacturerName}</span>
                                              <span className="text-[10px] text-muted-foreground">{m.series} • ₹{m.mrp}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                                      <Info className="h-4 w-4" />
                                      No matching products found
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedActivity && (
            <div className="shrink-0 bg-white border-t border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Quantity</label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value) || 1)}
                      className="h-10 w-24 font-bold text-slate-800 border-slate-200 focus-visible:ring-emerald-500 shadow-sm"
                    />
                    <span className="ml-3 text-sm font-semibold text-slate-500">{selectedActivity.unit}</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200 hidden md:block" />
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Labour Rate</label>
                  <p className="text-sm font-bold text-slate-800">₹ {selectedActivity.labourCost || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={!isReady} 
                  onClick={handleAdd}
                  className="h-11 px-6 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 gap-2"
                >
                  Add to Quotation <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
