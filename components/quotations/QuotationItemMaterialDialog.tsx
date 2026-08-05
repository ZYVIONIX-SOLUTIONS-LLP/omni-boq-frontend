"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "@/app/lib/api/activities";
import { ProductModel } from "@/app/lib/catalog/types";
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
  onSave: (customizations: Record<string, any>, newRate: number) => void;
}

function CascadingMaterialSelect({
  validProducts,
  value,
  onChange
}: {
  validProducts: ProductModel[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMake, setHoveredMake] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const makes = useMemo(() => {
    const groups: Record<string, ProductModel[]> = {};
    validProducts.forEach(p => {
      const make = p.manufacturerName || "Other Makes";
      if (!groups[make]) groups[make] = [];
      groups[make].push(p);
    });
    return groups;
  }, [validProducts]);

  const selectedProduct = validProducts.find(p => p.id === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-auto min-h-8 py-1.5 px-2 text-left text-xs bg-white border border-slate-200 hover:border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary text-wrap break-words"
      >
        {selectedProduct ? `${selectedProduct.manufacturerName ? selectedProduct.manufacturerName + ' ' : ''}${selectedProduct.name}` : "Select Material..."}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1">
          {Object.keys(makes).length > 0 ? Object.keys(makes).map(make => (
            <div
              key={make}
              className="relative group"
              onMouseEnter={() => setHoveredMake(make)}
            >
              <div className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer flex justify-between items-center">
                <span>{make}</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </div>
              
              {hoveredMake === make && (
                <div className="absolute left-full top-0 ml-0.5 w-64 bg-white border border-slate-200 rounded-md shadow-lg py-1 min-h-full">
                  {makes[make].map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onChange(p.id);
                        setIsOpen(false);
                      }}
                      className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer flex flex-col"
                    >
                      <span className="text-xs font-medium text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-500">
                        MRP: ₹{p.mrp} {p.discountPercent ? `(${p.discountPercent}% OFF)` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )) : (
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
  onSave,
}: QuotationItemMaterialDialogProps) {
  const [localCustoms, setLocalCustoms] = useState<Record<string, ConfiguredMaterial>>({});
  const [localLabourCost, setLocalLabourCost] = useState<number>(0);

  const requirements = activity?.requirements || [];

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
        
        if (existing && typeof existing === 'object') {
          parsed[reqId] = existing as ConfiguredMaterial;
        } else {
          // Fallback / Initialize new
          let selectedProdId = typeof existing === 'string' ? existing : undefined;
          
          if (!selectedProdId) {
             selectedProdId = req.options?.find((o: any) => o.isDefault)?.productModelId;
          }

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
          
          let rate = 0;
          let disc = 0;
          if (selectedProdId) {
            const prod = products.find(p => p.id === selectedProdId);
            if (prod) {
               rate = Number(prod.mrp) || 0;
               disc = Number(prod.discountPercent) || 0;
            }
          }

          parsed[reqId] = {
            reqId,
            productId: selectedProdId || "",
            quantity: Number(req.quantity) || 1,
            rate,
            profitPct: 0,
            discountPct: disc,
            taxRate: 0,
          };
        }
      });
      setLocalCustoms(parsed);
    }
  }, [isOpen, customizations, activity]);

  const updateCustom = (reqId: string, updates: Partial<ConfiguredMaterial>) => {
    setLocalCustoms(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId], ...updates }
    }));
  };

  const handleProductChange = (reqId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      updateCustom(reqId, { 
        productId, 
        rate: Number(prod.mrp) || 0,
        discountPct: Number(prod.discountPercent) || 0
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
              <Settings className="w-5 h-5 text-emerald-600" />
              Configure Materials
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1">
              {activity?.name}
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full overflow-x-auto">
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
                          if (String(pVal ?? "").trim().toLowerCase() !== String(val ?? "").trim().toLowerCase()) return false;
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
