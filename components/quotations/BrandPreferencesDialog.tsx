"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductModel } from "@/app/lib/catalog/types";
import { Plus, Trash2, Settings } from "lucide-react";

interface BrandPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandPreferences: Record<string, { manufacturerId: string; seriesId?: string | null }>;
  onSave: (preferences: Record<string, { manufacturerId: string; seriesId?: string | null }>) => void;
  products: ProductModel[];
}

export function BrandPreferencesDialog({
  open,
  onOpenChange,
  brandPreferences,
  onSave,
  products
}: BrandPreferencesDialogProps) {
  // Local state for edits
  const [localPreferences, setLocalPreferences] = useState<Record<string, { manufacturerId: string; seriesId?: string | null }>>({});

  useEffect(() => {
    if (open) {
      setLocalPreferences(brandPreferences || {});
    }
  }, [open, brandPreferences]);

  // Derive unique categories from products
  const availableCategories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach(p => {
      if (p.categoryId) {
        cats.set(p.categoryId, p.category?.name || p.categoryName || p.categoryId);
      }
    });
    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const getMakesForCategory = (categoryId: string) => {
    const makes = new Map<string, string>();
    products.forEach(p => {
      if (p.categoryId === categoryId && p.manufacturerId) {
        makes.set(p.manufacturerId, p.manufacturer?.name || p.manufacturerName || p.manufacturerId);
      }
    });
    return Array.from(makes.entries()).map(([id, name]) => ({ id, name }));
  };

  const getSeriesForMake = (categoryId: string, manufacturerId: string) => {
    const series = new Set<string>();
    products.forEach(p => {
      if (p.categoryId === categoryId && p.manufacturerId === manufacturerId && p.series) {
        series.add(p.series);
      }
    });
    return Array.from(series);
  };

  const addPreference = () => {
    // Find first category not already in preferences
    const unselectedCat = availableCategories.find(c => !localPreferences[c.id]);
    if (unselectedCat) {
      setLocalPreferences(prev => ({
        ...prev,
        [unselectedCat.id]: { manufacturerId: "" }
      }));
    }
  };

  const updatePreference = (categoryId: string, field: "manufacturerId" | "seriesId" | "categoryId", value: string | null) => {
    const val = value || "";
    if (field === "categoryId") {
      // Swapping category key
      const pref = localPreferences[categoryId];
      setLocalPreferences(prev => {
        const next = { ...prev };
        delete next[categoryId];
        next[val] = { manufacturerId: "" };
        return next;
      });
    } else if (field === "manufacturerId") {
      setLocalPreferences(prev => ({
        ...prev,
        [categoryId]: { manufacturerId: val, seriesId: null }
      }));
    } else {
      setLocalPreferences(prev => ({
        ...prev,
        [categoryId]: { ...prev[categoryId], seriesId: val }
      }));
    }
  };

  const removePreference = (categoryId: string) => {
    setLocalPreferences(prev => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleSave = () => {
    // Clean up empty preferences
    const cleaned: Record<string, { manufacturerId: string; seriesId?: string | null }> = {};
    for (const [catId, pref] of Object.entries(localPreferences)) {
      if (pref.manufacturerId) {
        cleaned[catId] = pref;
      }
    }
    onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Global Brand Defaults
          </DialogTitle>
          <DialogDescription>
            Set default makes and series for specific material categories. When adding activities, the system will automatically prioritize materials matching these defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(localPreferences).length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
              No brand defaults configured for this quotation.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(localPreferences).map(([categoryId, pref]) => {
                const makes = getMakesForCategory(categoryId);
                const seriesList = pref.manufacturerId ? getSeriesForMake(categoryId, pref.manufacturerId) : [];

                return (
                  <div key={categoryId} className="flex items-end gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Category</label>
                      <Select value={categoryId} onValueChange={v => updatePreference(categoryId, "categoryId", v)}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map(cat => (
                            <SelectItem 
                              key={cat.id} 
                              value={cat.id} 
                              disabled={cat.id !== categoryId && !!localPreferences[cat.id]}
                            >
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Make</label>
                      <Select 
                        value={pref.manufacturerId || ""} 
                        onValueChange={v => updatePreference(categoryId, "manufacturerId", v)}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select Make" />
                        </SelectTrigger>
                        <SelectContent>
                          {makes.length === 0 ? (
                            <div className="p-2 text-xs text-slate-500">No makes available</div>
                          ) : (
                            makes.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Series (Optional)</label>
                      <Select 
                        value={pref.seriesId || "any"} 
                        onValueChange={v => updatePreference(categoryId, "seriesId", v === "any" ? "" : v)}
                        disabled={!pref.manufacturerId || seriesList.length === 0}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder={seriesList.length === 0 ? "N/A" : "Any Series"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Series</SelectItem>
                          {seriesList.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removePreference(categoryId)}
                      className="h-9 w-9 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button 
            onClick={addPreference}
            variant="outline"
            size="sm"
            className="w-full border-dashed text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            disabled={Object.keys(localPreferences).length >= availableCategories.length || availableCategories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Brand Default
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
