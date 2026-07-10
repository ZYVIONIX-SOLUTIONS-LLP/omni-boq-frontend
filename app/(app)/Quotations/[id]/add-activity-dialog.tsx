"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ActivityRequirement,
  listActivities,
  WiringType,
} from "@/app/lib/api/activities";
import { listMaterials, Material } from "@/app/lib/api/materials";
import { addQuotationItem, Quotation } from "@/app/lib/api/quotations";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  wiringType: WiringType;
  onAdded: (updated: Quotation) => void;
}

/** A requirement paired with the estimator's chosen branded material + resolved unit price. */
interface PickedRequirement extends ActivityRequirement {
  materialId: string;
  materialPrice: number;
}

export default function AddActivityDialog({
  open,
  onOpenChange,
  quotationId,
  wiringType,
  onAdded,
}: AddActivityDialogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [selected, setSelected] = useState<Activity | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [picks, setPicks] = useState<PickedRequirement[]>([]);
  // materials by category, cached so switching activities doesn't refetch repeatedly
  const [materialsByCat, setMaterialsByCat] = useState<Record<string, Material[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load activity list for this wiring type
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setPicks([]);
    setQuantity("1");
    setError("");
    setLoadingActivities(true);
    listActivities({ wiringType, limit: 100 })
      .then((res) => setActivities(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load activities"))
      .finally(() => setLoadingActivities(false));
  }, [open, wiringType]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(q));
  }, [activities, search]);

  // When an activity is chosen, fetch the material options for each requirement's category
  const chooseActivity = async (activity: Activity) => {
    setSelected(activity);
    setError("");

    const neededCats = Array.from(new Set(activity.requirements.map((r) => r.categoryId)));
    const missing = neededCats.filter((c) => !materialsByCat[c]);
    let catMap = materialsByCat;
    if (missing.length) {
      const fetched = await Promise.all(
        missing.map((categoryId) =>
          listMaterials({ categoryId, limit: 100 }).then((r) => [categoryId, r.items] as const)
        )
      );
      catMap = { ...materialsByCat, ...Object.fromEntries(fetched) };
      setMaterialsByCat(catMap);
    }

    // Pre-select the first available material per requirement (estimator can change)
    setPicks(
      activity.requirements.map((req) => {
        const options = catMap[req.categoryId] ?? [];
        const first = options[0];
        return {
          ...req,
          materialId: first?.id ?? "",
          materialPrice: first ? Number(first.unitPrice) : 0,
        };
      })
    );
  };

  const setPickMaterial = (index: number, materialId: string) => {
    setPicks((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const options = materialsByCat[p.categoryId] ?? [];
        const mat = options.find((m) => m.id === materialId);
        return { ...p, materialId, materialPrice: mat ? Number(mat.unitPrice) : 0 };
      })
    );
  };

  // Rate for ONE unit = sum(requirement qty × chosen material price)
  const ratePerUnit = useMemo(
    () => picks.reduce((sum, p) => sum + Number(p.quantity) * p.materialPrice, 0),
    [picks]
  );
  const qtyNum = Number(quantity) || 0;
  const lineAmount = ratePerUnit * qtyNum;

  const handleAdd = async () => {
    if (!selected) return;
    if (qtyNum <= 0) {
      setError("Enter a quantity greater than zero");
      return;
    }
    if (picks.some((p) => !p.materialId)) {
      setError("Some required materials have no options yet — add them under Materials first");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await addQuotationItem(quotationId, {
        description: selected.name,
        unit: selected.unit,
        quantity: qtyNum,
        rate: Number(ratePerUnit.toFixed(2)),
        taxRate: 0,
      });
      onAdded(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to quotation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Add {wiringType === "POINT_WIRING" ? "Point Wiring" : "Circuit Wiring"} Activity
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick an activity, choose brands for each required material, set the quantity.
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          /* ── Step 1: choose an activity ── */
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-border"
              />
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {loadingActivities ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : filteredActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activities found. Create them in the Activities section first.
                </p>
              ) : (
                filteredActivities.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => chooseActivity(a)}
                    className="w-full text-left rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-accent transition-all"
                  >
                    <p className="text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.requirements.length} materials required
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ── Step 2: pick brands + quantity ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{selected.name}</p>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelected(null)}
                >
                  ← Choose a different activity
                </button>
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-xs font-semibold text-muted-foreground">
                  Qty ({selected.unit.toLowerCase()}s)
                </label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="rounded-xl border-border h-9"
                />
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th className="text-left font-semibold px-3 py-2">Material</th>
                    <th className="text-left font-semibold px-3 py-2 w-[45%]">Brand / Product</th>
                    <th className="text-right font-semibold px-3 py-2">Qty</th>
                    <th className="text-right font-semibold px-3 py-2">Rate</th>
                    <th className="text-right font-semibold px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick, index) => {
                    const options = materialsByCat[pick.categoryId] ?? [];
                    const catName = pick.category?.name ?? "Category";
                    const lineTotal = Number(pick.quantity) * pick.materialPrice;
                    return (
                      <tr key={index} className="border-t border-border/60">
                        <td className="px-3 py-2">
                          <Badge className="bg-muted text-muted-foreground border-0 rounded-full px-2 text-[10px] font-semibold whitespace-nowrap mb-0.5">
                            {catName}
                          </Badge>
                          <p className="text-foreground">{pick.description}</p>
                        </td>
                        <td className="px-3 py-2">
                          {options.length === 0 ? (
                            <span className="text-red-500">No {catName} in catalog</span>
                          ) : (
                            <Select
                              value={pick.materialId}
                              onValueChange={(v) => v && setPickMaterial(index, v)}
                            >
                              <SelectTrigger className="rounded-lg border-border h-8 text-xs w-full">
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border">
                                {options.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {[m.brand?.name, m.name].filter(Boolean).join(" — ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {Number(pick.quantity)} {pick.unit}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          ₹{pick.materialPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          ₹{lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-foreground">
                      Rate per {selected.unit.toLowerCase()}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">
                      ₹{ratePerUnit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Line total ({qtyNum} × ₹{ratePerUnit.toLocaleString("en-IN", { maximumFractionDigits: 2 })})
              </span>
              <span className="text-lg font-bold text-primary">
                ₹{lineAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {selected && (
            <Button
              className="rounded-xl bg-primary text-white shadow-md shadow-primary/25"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add to Quotation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
