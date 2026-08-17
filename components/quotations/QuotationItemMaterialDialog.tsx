"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "@/app/lib/api/activities";
import { ProductModel, AttributeDef } from "@/app/lib/catalog/types";
import { attributeDefsApi } from "@/app/lib/catalog/api";
import { ChevronRight, Settings } from "lucide-react";

export interface ConfiguredMaterial {
  reqId: string;
  productId: string;
  quantity: number;
  rate: number;
  profitPct: number;
  discountPct: number;
  taxRate: number;
}

interface QuotationItemMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: Activity;
  products: ProductModel[];
  customizations: Record<string, any>;
  brandPreferences?: Record<string, { manufacturerId: string; seriesId?: string | null }>;
  onSave: (customizations: Record<string, any>, newRate: number) => void;
}

function CascadingMaterialSelect({
  validProducts,
  value,
  attributeDefs,
  onChange
}: {
  validProducts: ProductModel[];
  value: string;
  attributeDefs?: AttributeDef[];
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMake, setActiveMake] = useState<string | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [openLeft, setOpenLeft] = useState(false);
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.right + 450 > window.innerWidth) {
        setOpenLeft(true);
      } else {
        setOpenLeft(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveMake(null);
        setActiveSeries(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tree: Make (Manufacturer) -> Series -> ProductModel[]
  const tree = useMemo(() => {
    const root: Record<string, Record<string, ProductModel[]>> = {};
    validProducts.forEach(p => {
      const make = p.manufacturerName || "Other Makes";
      const series = p.series || "Standard / General";
      if (!root[make]) root[make] = {};
      if (!root[make][series]) root[make][series] = [];
      root[make][series].push(p);
    });
    return root;
  }, [validProducts]);

  const selectedProduct = validProducts.find(p => p.id === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) {
            setActiveMake(null);
            setActiveSeries(null);
          }
        }}
        className="w-full h-auto min-h-8 py-1.5 px-2 text-left text-xs bg-white border border-slate-200 hover:border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary text-wrap break-words"
      >
        {selectedProduct ? `${selectedProduct.manufacturerName ? selectedProduct.manufacturerName + ' ' : ''}${selectedProduct.name}` : "Select Material..."}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
          {Object.keys(tree).length > 0 ? (
            Object.keys(tree).map(make => (
              <div key={make} className="relative">
                {/* ── Level 1: Make (Manufacturer) ── */}
                <div
                  onClick={() => {
                    setActiveMake(prev => {
                      if (prev === make) return null;
                      setActiveSeries(null);
                      setSpecFilters({});
                      return make;
                    });
                  }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer flex justify-between items-center transition-colors ${
                    activeMake === make ? "bg-purple-100 text-purple-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {make}
                  <ChevronRight className={`h-3 w-3 transition-transform ${activeMake === make ? "rotate-90" : ""}`} />
                </div>
                
                {/* ── Level 2: Series ── */}
                {activeMake === make && (
                  <div 
                    className="absolute top-0 w-44 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-[60]"
                    style={{ [openLeft ? 'right' : 'left']: 'calc(100% + 2px)' }}
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      Series
                    </div>
                    {Object.keys(tree[make]).map(series => (
                      <div key={series} className="relative">
                        <div
                          onClick={() => {
                            setActiveSeries(prev => {
                              if (prev === series) return null;
                              setSpecFilters({});
                              return series;
                            });
                          }}
                          className={`px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center transition-colors ${
                            activeSeries === series ? "bg-purple-50 font-semibold text-purple-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{series === "Standard" ? "All Series" : series}</span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${activeSeries === series ? "rotate-90 text-purple-600" : "text-slate-400"}`} />
                        </div>

                        {/* ── Level 3: Products ── */}
                        {activeSeries === series && (
                          (() => {
                            const baseProducts = tree[make][series];
                            
                            // 1. Extract unique specs
                            const specsOptions: Record<string, string[]> = {};
                            baseProducts.forEach(p => {
                              if (!p.attributes) return;
                              Object.entries(p.attributes).forEach(([key, val]) => {
                                if (val === null || val === undefined) return;
                                const strVal = String(val);
                                if (!specsOptions[key]) specsOptions[key] = [];
                                if (!specsOptions[key].includes(strVal)) {
                                  specsOptions[key].push(strVal);
                                }
                              });
                            });
                            
                            const filterableSpecs = Object.entries(specsOptions)
                              .filter(([_, values]) => values.length > 1)
                              .sort(([a], [b]) => a.localeCompare(b));

                            // 2. Filter products
                            const filteredProducts = baseProducts.filter(p => {
                              return Object.entries(specFilters).every(([key, expectedVal]) => {
                                if (!expectedVal) return true;
                                const actualVal = p.attributes?.[key];
                                return actualVal !== undefined && actualVal !== null && String(actualVal) === expectedVal;
                              });
                            });

                            return (
                              <div 
                                className="absolute bottom-0 min-w-[320px] max-w-[520px] w-max max-h-[280px] bg-white border border-slate-200 rounded-md shadow-2xl py-0 flex flex-col z-[100]"
                                style={{ [openLeft ? 'right' : 'left']: 'calc(100% + 11rem + 4px)' }}
                              >
                                {filterableSpecs.length > 0 && (
                                  <div className="p-2 border-b border-slate-100 bg-slate-50 rounded-t-md sticky top-0 z-10 space-y-1.5 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Filter by Specs</div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {filterableSpecs.map(([specKey, values]) => {
                                        const def = attributeDefs?.find(d => d.id === specKey);
                                        const label = def ? def.name : specKey;
                                        return (
                                          <select
                                            key={specKey}
                                            value={specFilters[specKey] || ""}
                                            onChange={(e) => setSpecFilters(prev => ({ ...prev, [specKey]: e.target.value }))}
                                            className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white max-w-[120px] truncate focus:outline-none focus:border-purple-300"
                                          >
                                            <option value="">Any {label}</option>
                                            {values.sort().map(v => (
                                              <option key={v} value={v}>{v}</option>
                                            ))}
                                          </select>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className="overflow-y-auto py-1 flex-1">
                                  {filteredProducts.length > 0 ? (
                                    filteredProducts.map(prod => (
                                      <div
                                        key={prod.id}
                                        onClick={() => {
                                          onChange(prod.id);
                                          setIsOpen(false);
                                          setActiveMake(null);
                                          setActiveSeries(null);
                                        }}
                                        className="px-3.5 py-2 hover:bg-slate-100 cursor-pointer flex flex-col border-b border-slate-50 last:border-b-0"
                                      >
                                        <span className="text-xs font-medium text-slate-800 leading-snug whitespace-normal break-words">{prod.name}</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">
                                          MRP: ₹{prod.mrp || 0} {prod.discountPercent ? `(${prod.discountPercent}% OFF)` : ""}
                                        </span>
                                        {prod.attributes && Object.keys(prod.attributes).length > 0 && (
                                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight flex justify-between items-end">
                                            <span>
                                              {Object.entries(prod.attributes)
                                                .map(([k, v]) => {
                                                  const def = attributeDefs?.find(d => d.id === k);
                                                  const name = def ? def.name : k;
                                                  return `${name}: ${v}`;
                                                })
                                                .join(" | ")}
                                            </span>
                                            {/* Show matched specs */}
                                            <div className="flex gap-1 flex-wrap justify-end">
                                              {Object.entries(specFilters).map(([k, v]) => {
                                                if (!v) return null;
                                                const def = attributeDefs?.find(d => d.id === k);
                                                const label = def ? def.name : k;
                                                return <span key={k} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[8px]">{label}: {v}</span>
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-3 py-3 text-center text-[10px] text-slate-500">No matching products</div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
             <div className="px-3 py-2 text-xs text-red-500 font-medium">No matching specs found</div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuotationItemMaterialDialog({
  isOpen,
  onClose,
  activity,
  products,
  customizations,
  brandPreferences = {},
  onSave,
}: QuotationItemMaterialDialogProps) {
  const [localCustoms, setLocalCustoms] = useState<Record<string, ConfiguredMaterial>>({});
  const [localLabourCost, setLocalLabourCost] = useState<number>(0);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  const requirements = activity?.requirements || [];

  useEffect(() => {
    if (isOpen && attributeDefs.length === 0) {
      attributeDefsApi.all().then(setAttributeDefs).catch(console.error);
    }
  }, [isOpen, attributeDefs.length]);

  useEffect(() => {
    if (isOpen) {
      setLocalLabourCost(
        customizations.__labourCost !== undefined 
          ? Number(customizations.__labourCost) 
          : Number(activity?.labourCost) || 0
      );
      const parsed: Record<string, ConfiguredMaterial> = {};
      
      requirements.forEach((req: any) => {
        const reqId = req.id || req.key;
        const existing = customizations[reqId];
        const categoryPref = req.categoryId ? (brandPreferences as any)[req.categoryId] : undefined;

        if (existing && typeof existing === 'object') {
          const confObj = existing as ConfiguredMaterial;
          parsed[reqId] = {
            ...confObj,
            profitPct: categoryPref?.defaultProfitPct ?? confObj.profitPct ?? 0,
            discountPct: categoryPref?.defaultDiscountPct ?? confObj.discountPct ?? 0,
            taxRate: categoryPref?.defaultTaxPct ?? confObj.taxRate ?? 0,
          };
        } else {
          // Fallback / Initialize new
          let selectedProdId = typeof existing === 'string' ? existing : undefined;
          const normalizeAttr = (v: any) => String(v ?? "").replace(/\s+/g, "").toLowerCase();

          if (!selectedProdId) {
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
            if (pref && pref.manufacturerId && validProducts.length > 0) {
              const prefMatch = validProducts.find(p => {
                if (p.manufacturerId !== pref.manufacturerId) return false;
                if (pref.seriesId) {
                   const seriesPref = String(pref.seriesId).trim().toLowerCase();
                   const pSeries = String(p.series || "").trim().toLowerCase();
                   const pName = String(p.name || "").trim().toLowerCase();
                   if (pSeries !== seriesPref && !pName.includes(seriesPref)) return false;
                }
                return true;
              });
              if (prefMatch) selectedProdId = prefMatch.id;
            }
            
            // 2. Try default option from activity definition
            if (!selectedProdId) {
               selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
            }
            
            // 3. Fallback to first valid product
            if (!selectedProdId && validProducts.length > 0) {
               selectedProdId = validProducts[0].id;
            }
          }
          
          let rate = 0;
          let prodDisc = 0;
          if (selectedProdId) {
            const prod = products.find(p => p.id === selectedProdId);
            if (prod) {
               rate = Number(prod.mrp) || 0;
               prodDisc = Number(prod.discountPercent) || 0;
            }
          }

          parsed[reqId] = {
            reqId,
            productId: selectedProdId || "",
            quantity: Number(req.quantity) || 1,
            rate,
            profitPct: categoryPref?.defaultProfitPct ?? 0,
            discountPct: categoryPref?.defaultDiscountPct ?? prodDisc,
            taxRate: categoryPref?.defaultTaxPct ?? 0,
          };
        }
      });
      setLocalCustoms(parsed);
    }
  }, [isOpen, customizations, activity, brandPreferences]);

  const updateCustom = (reqId: string, updates: Partial<ConfiguredMaterial>) => {
    setLocalCustoms(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId], ...updates }
    }));
  };

  const handleProductChange = (reqId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const categoryPref = prod.categoryId ? (brandPreferences as any)[prod.categoryId] : undefined;
      updateCustom(reqId, { 
        productId, 
        rate: Number(prod.mrp) || 0,
        profitPct: categoryPref?.defaultProfitPct ?? localCustoms[reqId]?.profitPct ?? 0,
        discountPct: categoryPref?.defaultDiscountPct ?? (Number(prod.discountPercent) || 0),
        taxRate: categoryPref?.defaultTaxPct ?? localCustoms[reqId]?.taxRate ?? 0,
      });
    }
  };

  const handleSave = () => {
    let totalMaterialCost = 0;
    
    Object.values(localCustoms).forEach(conf => {
        if (!conf.productId) return;
        const baseAmount = conf.quantity * conf.rate;
        const afterDisc = baseAmount - (baseAmount * conf.discountPct) / 100;
        const withProfit = afterDisc + (afterDisc * conf.profitPct) / 100;
        const taxAmt = (withProfit * conf.taxRate) / 100;
        const finalAmount = withProfit + taxAmt;
        
        totalMaterialCost += finalAmount;
    });

    const finalRate = totalMaterialCost + localLabourCost;

    onSave({ ...localCustoms, __labourCost: localLabourCost }, finalRate);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1200px] p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="px-6 py-5 bg-white border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Configure Materials
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1">
              {activity?.name}
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full overflow-x-auto min-h-[380px] pb-36">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-12">SL</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs min-w-[300px] whitespace-normal">MATERIAL / SPEC</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-16">UNIT</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-24 text-right">QTY</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-28 text-right">RATE</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-24 text-right">% PROFIT</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-24 text-right">% DISC</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-24 text-right">% TAX</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs min-w-[100px] text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requirements.map((req: any, idx: number) => {
                    const reqId = req.id || req.key;
                    const conf = localCustoms[reqId];
                    if (!conf) return null;

                    const validProducts = products.filter(p => {
                      if (p.categoryId !== req.categoryId) return false;
                      if (req.subCategoryId && p.subCategoryId !== req.subCategoryId) return false;
                      if (req.requiredAttributes) {
                        for (const [key, val] of Object.entries(req.requiredAttributes)) {
                          // @ts-ignore
                          const pVal = p.attributes?.[key];
                          if (Array.isArray(val)) {
                            if (!val.some(v => String(pVal ?? "").trim().toLowerCase() === String(v).trim().toLowerCase())) return false;
                          } else {
                            if (String(pVal ?? "").trim().toLowerCase() !== String(val ?? "").trim().toLowerCase()) return false;
                          }
                        }
                      }
                      return true;
                    });
                    
                    const baseAmount = conf.quantity * conf.rate;
                    const afterDisc = baseAmount - (baseAmount * conf.discountPct) / 100;
                    const withProfit = afterDisc + (afterDisc * conf.profitPct) / 100;
                    const taxAmt = (withProfit * conf.taxRate) / 100;
                    const amount = withProfit + taxAmt;

                    return (
                      <tr key={reqId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-700">{req.description || "Material"}</span>
                            <CascadingMaterialSelect 
                              validProducts={validProducts}
                              value={conf.productId}
                              attributeDefs={attributeDefs}
                              onChange={(val) => handleProductChange(reqId, val)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-600 text-xs font-medium uppercase">{req.unit}</td>
                        <td className="px-4 py-2">
                          <Input type="number" value={conf.quantity} onChange={(e) => updateCustom(reqId, { quantity: Number(e.target.value) || 0 })} className="h-8 min-w-[4.5rem] text-xs text-right px-2" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={conf.rate} onChange={(e) => updateCustom(reqId, { rate: Number(e.target.value) || 0 })} className="h-8 min-w-[5rem] text-xs text-right px-2" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={conf.profitPct} onChange={(e) => updateCustom(reqId, { profitPct: Number(e.target.value) || 0 })} className="h-8 min-w-[4.5rem] text-xs text-right px-2" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={conf.discountPct} onChange={(e) => updateCustom(reqId, { discountPct: Number(e.target.value) || 0 })} className="h-8 min-w-[4.5rem] text-xs text-right px-2" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" value={conf.taxRate} onChange={(e) => updateCustom(reqId, { taxRate: Number(e.target.value) || 0 })} className="h-8 min-w-[4.5rem] text-xs text-right px-2" />
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">
                          {amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {requirements.length === 0 && (
                     <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No materials required.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Summary Block */}
            <div className="mt-4 flex justify-end">
               <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 w-80 space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                     <span>Labour Cost</span>
                     <Input 
                       type="number" 
                       value={localLabourCost} 
                       onChange={(e) => setLocalLabourCost(Number(e.target.value) || 0)} 
                       className="h-8 w-24 text-right px-2 font-medium" 
                     />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold text-slate-800 text-base">
                     <span>Total Activity Rate</span>
                     <span>
                        {(Object.values(localCustoms).reduce((acc: number, conf: ConfiguredMaterial) => {
                            if (!conf.productId) return acc;
                            const baseAmount = conf.quantity * conf.rate;
                            const afterDisc = baseAmount - (baseAmount * conf.discountPct) / 100;
                            const withProfit = afterDisc + (afterDisc * conf.profitPct) / 100;
                            const taxAmt = (withProfit * conf.taxRate) / 100;
                            return acc + (withProfit + taxAmt);
                        }, 0) + localLabourCost).toFixed(2)}
                     </span>
                  </div>
               </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <Button variant="outline" onClick={onClose} className="font-semibold">Cancel</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
