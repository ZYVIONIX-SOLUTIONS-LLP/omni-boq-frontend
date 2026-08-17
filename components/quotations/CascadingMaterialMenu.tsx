"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ProductModel } from "@/app/lib/catalog/types";
import { Search, ChevronRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CascadingMaterialMenu({
  products,
  onSelect,
  disabled = false,
}: {
  products: ProductModel[];
  onSelect: (product: ProductModel) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Hover states for the 3 levels
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredMake, setHoveredMake] = useState<string | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [openLeft, setOpenLeft] = useState(false);
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
  const [attributeDefs, setAttributeDefs] = useState<any[]>([]);

  useEffect(() => {
    import("@/app/lib/catalog/api").then((mod) => {
      mod.attributeDefsApi.all().then(setAttributeDefs).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Right edge of button + ~750px for 3 submenus
      if (rect.right + 750 > window.innerWidth) {
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
        setSearch("");
        setHoveredCategory(null);
        setHoveredMake(null);
        setHoveredSeries(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build the tree: Category -> Manufacturer -> Series -> Products
  const tree = useMemo(() => {
    const root: Record<string, Record<string, Record<string, ProductModel[]>>> = {};

    products.forEach(p => {
      const cat = p.categoryName || "Uncategorized";
      const make = p.manufacturerName || "Other Makes";
      const series = p.series || "Standard";

      if (!root[cat]) root[cat] = {};
      if (!root[cat][make]) root[cat][make] = {};
      if (!root[cat][make][series]) root[cat][make][series] = [];

      root[cat][make][series].push(p);
    });

    return root;
  }, [products]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.categoryName?.toLowerCase().includes(q) ||
      p.manufacturerName?.toLowerCase().includes(q) ||
      p.series?.toLowerCase().includes(q)
    ).slice(0, 50); // limit to 50 for performance
  }, [search, products]);

  const handleSelect = (p: ProductModel) => {
    onSelect(p);
    setIsOpen(false);
    setSearch("");
    setHoveredCategory(null);
    setHoveredMake(null);
    setHoveredSeries(null);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button 
        onClick={() => setIsOpen(!isOpen)} 
        disabled={disabled}
        variant="outline"
        className="h-8 text-xs gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm disabled:opacity-50"
      >
        <PackagePlus className="h-3.5 w-3.5" /> Add Material
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] flex flex-col">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search materials..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="py-1 flex-1 overflow-y-auto max-h-[60vh]">
            {search.trim() ? (
              // Flat Search Results
              searchResults.length > 0 ? (
                searchResults.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleSelect(p)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 flex gap-1 flex-wrap">
                      <span className="bg-slate-100 px-1 rounded">{p.categoryName}</span>
                      <span className="bg-slate-100 px-1 rounded">{p.manufacturerName}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">No materials found.</div>
              )
            ) : (
              // Cascading Tree (Category Level)
              Object.keys(tree).sort().map(cat => (
                <div 
                  key={cat}
                  className="relative group/cat"
                  onMouseEnter={() => {
                    setHoveredCategory(cat);
                    setHoveredMake(null);
                    setHoveredSeries(null);
                    setSpecFilters({});
                  }}
                >
                  <div className={`px-4 py-2 text-xs cursor-pointer flex justify-between items-center ${hoveredCategory === cat ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span>{cat}</span>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sibling Menus (Rendered outside overflow container to prevent clipping) */}
          {!search.trim() && hoveredCategory && (
            <div 
              className="absolute top-0 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-h-[100px] max-h-[60vh] overflow-y-auto"
              style={{ [openLeft ? 'right' : 'left']: 'calc(100% + 4px)' }}
            >
              {Object.keys(tree[hoveredCategory]).sort().map(make => (
                <div 
                  key={make}
                  className="relative group/make"
                  onMouseEnter={() => {
                    setHoveredMake(make);
                    setHoveredSeries(null);
                    setSpecFilters({});
                  }}
                >
                  <div className={`px-4 py-2 text-xs cursor-pointer flex justify-between items-center ${hoveredMake === make ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span>{make}</span>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!search.trim() && hoveredCategory && hoveredMake && (
            <div 
              className="absolute top-0 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-h-[100px] max-h-[60vh] overflow-y-auto"
              style={{ [openLeft ? 'right' : 'left']: 'calc(100% + 14rem + 8px)' }}
            >
              {Object.keys(tree[hoveredCategory][hoveredMake]).sort().map(series => (
                <div 
                  key={series}
                  className="relative group/series"
                  onMouseEnter={() => {
                    setHoveredSeries(series);
                    setSpecFilters({});
                  }}
                >
                  <div className={`px-4 py-2 text-xs cursor-pointer flex justify-between items-center ${hoveredSeries === series ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span>{series === "Standard" ? "All Series" : series}</span>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!search.trim() && hoveredCategory && hoveredMake && hoveredSeries && (
            (() => {
              const baseProducts = tree[hoveredCategory][hoveredMake][hoveredSeries];
              
              // 1. Extract unique specs that have more than 1 distinct value
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

              // 2. Filter products based on selected specs
              const filteredProducts = baseProducts.filter(p => {
                return Object.entries(specFilters).every(([key, expectedVal]) => {
                  if (!expectedVal) return true; // Any
                  const actualVal = p.attributes?.[key];
                  return actualVal !== undefined && actualVal !== null && String(actualVal) === expectedVal;
                });
              });

              return (
                <div 
                  className="absolute top-0 min-w-[320px] max-w-[520px] w-max bg-white border border-slate-200 rounded-lg shadow-xl py-0 flex flex-col max-h-[60vh] z-50"
                  style={{ [openLeft ? 'right' : 'left']: 'calc(100% + 28rem + 12px)' }}
                >
                  {filterableSpecs.length > 0 && (
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50 rounded-t-lg sticky top-0 z-10 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Specs</div>
                      <div className="flex flex-wrap gap-2">
                        {filterableSpecs.map(([specKey, values]) => {
                          const def = attributeDefs.find(d => d.id === specKey);
                          const label = def ? def.name : specKey;
                          return (
                            <select
                              key={specKey}
                              value={specFilters[specKey] || ""}
                              onChange={(e) => setSpecFilters(prev => ({ ...prev, [specKey]: e.target.value }))}
                              className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white max-w-[140px] truncate focus:outline-none focus:border-purple-300"
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
                      filteredProducts.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => handleSelect(p)}
                          className="px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-slate-50 last:border-0"
                        >
                          <div className="font-medium whitespace-normal break-words leading-snug mb-1">{p.name}</div>
                          <div className="flex justify-between items-center text-[10px] font-normal">
                            <span className="text-slate-500">
                              MRP: ₹{p.mrp} 
                              {p.discountPercent ? <span className="text-purple-600 ml-1">({p.discountPercent}% OFF)</span> : null}
                            </span>
                            {/* Show matched specs to confirm filter is working */}
                            <div className="flex gap-1 flex-wrap justify-end">
                              {Object.entries(specFilters).map(([k, v]) => {
                                if (!v) return null;
                                const def = attributeDefs.find(d => d.id === k);
                                const label = def ? def.name : k;
                                return <span key={k} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[9px]">{label}: {v}</span>
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">No products match the selected specs.</div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
