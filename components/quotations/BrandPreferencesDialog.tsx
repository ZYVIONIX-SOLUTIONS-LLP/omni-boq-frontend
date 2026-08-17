"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductModel } from "@/app/lib/catalog/types";
import { categoriesApi, manufacturersApi } from "@/app/lib/catalog/api";
import { Plus, Trash2, Settings, Percent, TrendingUp, Receipt } from "lucide-react";

export interface BrandPrefItem {
  manufacturerId: string;
  seriesId?: string | null;
  defaultProfitPct?: number | null;
  defaultTaxPct?: number | null;
  defaultDiscountPct?: number | null;
}

interface BrandPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandPreferences: Record<string, BrandPrefItem>;
  onSave: (preferences: Record<string, BrandPrefItem>) => void;
  products: ProductModel[];
}

export function BrandPreferencesDialog({
  open,
  onOpenChange,
  brandPreferences,
  onSave,
  products
}: BrandPreferencesDialogProps) {
  const [localPreferences, setLocalPreferences] = useState<Record<string, BrandPrefItem>>({});
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [manufacturerMap, setManufacturerMap] = useState<Map<string, string>>(new Map());

  // Fetch full category & manufacturer taxonomy for proper name resolution
  useEffect(() => {
    if (open) {
      setLocalPreferences(brandPreferences || {});

      Promise.all([
        categoriesApi.all().catch(() => []),
        manufacturersApi.all().catch(() => []),
      ]).then(([cats, mfrs]) => {
        const cMap = new Map<string, string>();
        cats.forEach((c: any) => {
          if (c.id && c.name) cMap.set(c.id, c.name);
        });
        setCategoryMap(cMap);

        const mMap = new Map<string, string>();
        mfrs.forEach((m: any) => {
          if (m.id && m.name) mMap.set(m.id, m.name);
        });
        setManufacturerMap(mMap);
      });
    }
  }, [open, brandPreferences]);

  // Derive unique categories from products & global category API
  const availableCategories = useMemo(() => {
    const cats = new Map<string, string>();

    // First add all known categories from categories API
    categoryMap.forEach((name, id) => {
      cats.set(id, name);
    });

    // Then enrich from products
    products.forEach((p) => {
      if (p.categoryId) {
        const resolvedName = categoryMap.get(p.categoryId) || p.category?.name || p.categoryName || p.categoryId;
        cats.set(p.categoryId, resolvedName);
      }
    });

    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [products, categoryMap]);

  const getMakesForCategory = (categoryId: string) => {
    const makes = new Map<string, string>();

    // First add all global manufacturers
    manufacturerMap.forEach((name, id) => {
      makes.set(id, name);
    });

    // Then enrich from products matching category
    products.forEach((p) => {
      if ((!categoryId || p.categoryId === categoryId) && p.manufacturerId) {
        const resolvedName = manufacturerMap.get(p.manufacturerId) || p.manufacturer?.name || p.manufacturerName || p.manufacturerId;
        makes.set(p.manufacturerId, resolvedName);
      }
    });

    return Array.from(makes.entries()).map(([id, name]) => ({ id, name }));
  };

  const getSeriesForMake = (categoryId: string, manufacturerId: string) => {
    const series = new Set<string>();
    products.forEach((p) => {
      if (
        (!categoryId || p.categoryId === categoryId) &&
        p.manufacturerId === manufacturerId &&
        p.series
      ) {
        series.add(p.series);
      }
    });
    return Array.from(series);
  };

  const addPreference = () => {
    const unselectedCat = availableCategories.find((c) => !localPreferences[c.id]);
    if (unselectedCat) {
      setLocalPreferences((prev) => ({
        ...prev,
        [unselectedCat.id]: { manufacturerId: "" },
      }));
    }
  };

  const updatePreference = (
    categoryId: string,
    field: keyof BrandPrefItem | "categoryId",
    value: any
  ) => {
    if (field === "categoryId") {
      const val = value || "";
      const pref = localPreferences[categoryId];
      setLocalPreferences((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        next[val] = { ...(pref || { manufacturerId: "" }) };
        return next;
      });
    } else {
      setLocalPreferences((prev) => ({
        ...prev,
        [categoryId]: {
          ...(prev[categoryId] || { manufacturerId: "" }),
          [field]: value,
        },
      }));
    }
  };

  const removePreference = (categoryId: string) => {
    setLocalPreferences((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleSave = () => {
    const cleaned: Record<string, BrandPrefItem> = {};
    for (const [catId, pref] of Object.entries(localPreferences)) {
      if (pref.manufacturerId || pref.defaultProfitPct != null || pref.defaultDiscountPct != null || pref.defaultTaxPct != null) {
        cleaned[catId] = pref;
      }
    }
    onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-white border border-purple-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Settings className="h-5 w-5 text-purple-700" />
            Global Brand & Category Defaults
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure default brand makes, series, profit margins, discounts, and tax rates per category. Items in this category will automatically adopt these defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {Object.entries(localPreferences).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-none border border-slate-200 border-dashed">
              No category defaults configured. Click below to add your first category rule.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(localPreferences).map(([categoryId, pref]) => {
                const makes = getMakesForCategory(categoryId);
                const seriesList = pref.manufacturerId ? getSeriesForMake(categoryId, pref.manufacturerId) : [];

                return (
                  <div key={categoryId} className="p-3 bg-purple-50/50 border border-purple-200/90 rounded-none space-y-2">
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Category Selector */}
                      <div className="flex-1 min-w-[180px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Category
                        </label>
                        <Select
                          value={categoryId}
                          onValueChange={(v) => updatePreference(categoryId, "categoryId", v)}
                        >
                          <SelectTrigger className="h-9 bg-white text-xs font-bold border-purple-200 rounded-none">
                            <SelectValue placeholder="Select Category">
                              {categoryMap.get(categoryId) || availableCategories.find((cat) => cat.id === categoryId)?.name || categoryId}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-purple-200">
                            {availableCategories.map((cat) => (
                              <SelectItem
                                key={cat.id}
                                value={cat.id}
                                disabled={cat.id !== categoryId && !!localPreferences[cat.id]}
                                className="text-xs font-semibold"
                              >
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Make Selector */}
                      <div className="flex-1 min-w-[160px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Make / Brand
                        </label>
                        <Select
                          value={pref.manufacturerId || ""}
                          onValueChange={(v) => updatePreference(categoryId, "manufacturerId", v)}
                        >
                          <SelectTrigger className="h-9 bg-white text-xs font-bold border-purple-200 rounded-none">
                            <SelectValue placeholder="Select Make">
                              {pref.manufacturerId
                                ? (manufacturerMap.get(pref.manufacturerId) || makes.find((m) => m.id === pref.manufacturerId)?.name || pref.manufacturerId)
                                : "Select Make"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-purple-200">
                            {makes.length === 0 ? (
                              <div className="p-2 text-xs text-slate-500">No makes available</div>
                            ) : (
                              makes.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="text-xs font-semibold">
                                  {m.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Series (Optional) */}
                      <div className="w-[140px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Series
                        </label>
                        <Select
                          value={pref.seriesId || "any"}
                          onValueChange={(v) => updatePreference(categoryId, "seriesId", v === "any" ? "" : v)}
                          disabled={!pref.manufacturerId || seriesList.length === 0}
                        >
                          <SelectTrigger className="h-9 bg-white text-xs font-semibold border-purple-200 rounded-none">
                            <SelectValue placeholder={seriesList.length === 0 ? "Any Series" : "Select Series"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-purple-200">
                            <SelectItem value="any" className="text-xs font-semibold">Any Series</SelectItem>
                            {seriesList.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs font-semibold">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category Profit % */}
                      <div className="w-[85px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          Profit %
                        </label>
                        <Input
                          type="number"
                          placeholder="0%"
                          value={pref.defaultProfitPct ?? ""}
                          onChange={(e) => updatePreference(categoryId, "defaultProfitPct", e.target.value ? Number(e.target.value) : null)}
                          className="h-9 bg-white text-xs text-center font-bold border-purple-200 rounded-none"
                        />
                      </div>

                      {/* Category Disc % */}
                      <div className="w-[85px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <Percent className="w-3 h-3 text-red-500" />
                          Disc %
                        </label>
                        <Input
                          type="number"
                          placeholder="0%"
                          value={pref.defaultDiscountPct ?? ""}
                          onChange={(e) => updatePreference(categoryId, "defaultDiscountPct", e.target.value ? Number(e.target.value) : null)}
                          className="h-9 bg-white text-xs text-center font-bold border-purple-200 rounded-none"
                        />
                      </div>

                      {/* Category Tax % */}
                      <div className="w-[85px] space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-cyan-600" />
                          Tax %
                        </label>
                        <Input
                          type="number"
                          placeholder="18%"
                          value={pref.defaultTaxPct ?? ""}
                          onChange={(e) => updatePreference(categoryId, "defaultTaxPct", e.target.value ? Number(e.target.value) : null)}
                          className="h-9 bg-white text-xs text-center font-bold border-purple-200 rounded-none"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePreference(categoryId)}
                        className="h-9 w-9 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={addPreference}
            variant="outline"
            size="sm"
            className="w-full border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-bold rounded-none h-9"
            disabled={Object.keys(localPreferences).length >= availableCategories.length || availableCategories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Category Brand & Pricing Rule
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-none border-slate-200 text-xs font-semibold" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-purple-700 hover:bg-purple-800 text-white rounded-none text-xs font-bold shadow-md">
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
