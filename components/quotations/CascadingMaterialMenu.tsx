"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ProductModel } from "@/app/lib/catalog/types";
import { Search, ChevronRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CascadingMaterialMenu({
  products,
  onSelect,
}: {
  products: ProductModel[];
  onSelect: (product: ProductModel) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Hover states for the 3 levels
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredMake, setHoveredMake] = useState<string | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

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
        variant="outline"
        className="h-8 text-xs gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm"
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
            <div className="absolute left-full top-0 ml-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-h-[100px] max-h-[60vh] overflow-y-auto">
              {Object.keys(tree[hoveredCategory]).sort().map(make => (
                <div 
                  key={make}
                  className="relative group/make"
                  onMouseEnter={() => {
                    setHoveredMake(make);
                    setHoveredSeries(null);
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
            <div className="absolute left-[calc(100%+14rem+8px)] top-0 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-h-[100px] max-h-[60vh] overflow-y-auto">
              {Object.keys(tree[hoveredCategory][hoveredMake]).sort().map(series => (
                <div 
                  key={series}
                  className="relative group/series"
                  onMouseEnter={() => setHoveredSeries(series)}
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
            <div className="absolute left-[calc(100%+28rem+12px)] top-0 min-w-[320px] max-w-[520px] w-max bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-h-[100px] max-h-[60vh] overflow-y-auto z-50">
              {tree[hoveredCategory][hoveredMake][hoveredSeries].map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div className="font-medium whitespace-normal break-words leading-snug mb-1">{p.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-normal">
                    <span>MRP: ₹{p.mrp}</span>
                    {p.discountPercent ? <span className="text-purple-600">({p.discountPercent}% OFF)</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
