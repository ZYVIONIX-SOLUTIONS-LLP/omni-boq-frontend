"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ItemCategory = "Material" | "Labour" | "Activity" | "Point Wiring" | "Circuit Wiring";

interface CatalogItem {
  id: string;
  description: string;
  unit: string;
  pageNo: string;
  itemNo: string;
  listPrice: number;
  labourCost: number;
  category: ItemCategory;
}

interface LineItem {
  id: string;
  catalogItem: CatalogItem | null;
  description: string;
  unit: string;
  qty: number;
  pageNo: string;
  itemNo: string;
  listPrice: number;
  discountPct: number;
  priceAfterDiscount: number;
  labour: number;
  amount: number;
  category: ItemCategory;
}

interface CustomerInfo {
  customerName: string;
  company: string;
  projectName: string;
  projectLocation: string;
  phone: string;
  email: string;
  gstNumber: string;
  quotationNo: string;
  quotationDate: string;
  validity: string;
  reference: string;
  salesPerson: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK CATALOGUE DATA
// ─────────────────────────────────────────────────────────────────────────────
const CATALOG: CatalogItem[] = [
  // Materials
  { id: "MAT-0001", description: "Polycab 1.5 Sqmm Wire",          unit: "Mtr",     pageNo: "12", itemNo: "M-001", listPrice: 24.00,  labourCost: 0,   category: "Material" },
  { id: "MAT-0002", description: "6A Modular Switch",               unit: "Nos",     pageNo: "14", itemNo: "M-002", listPrice: 95.00,  labourCost: 0,   category: "Material" },
  { id: "MAT-0003", description: "PVC Conduit 20mm",                unit: "Mtr",     pageNo: "15", itemNo: "M-003", listPrice: 18.00,  labourCost: 3,   category: "Material" },
  { id: "MAT-0004", description: "16A MCB Single Pole",             unit: "Nos",     pageNo: "16", itemNo: "M-004", listPrice: 185.00, labourCost: 0,   category: "Material" },
  { id: "MAT-0005", description: "DB Box 8 Way",                    unit: "Nos",     pageNo: "17", itemNo: "M-005", listPrice: 650.00, labourCost: 50,  category: "Material" },
  { id: "MAT-0006", description: "Polycab 2.5 Sqmm Wire",           unit: "Mtr",     pageNo: "12", itemNo: "M-006", listPrice: 38.00,  labourCost: 0,   category: "Material" },
  { id: "MAT-0007", description: "Polycab 4 Sqmm Wire",             unit: "Mtr",     pageNo: "12", itemNo: "M-007", listPrice: 58.00,  labourCost: 0,   category: "Material" },
  { id: "MAT-0008", description: "32A MCB Double Pole",             unit: "Nos",     pageNo: "16", itemNo: "M-008", listPrice: 420.00, labourCost: 0,   category: "Material" },
  { id: "MAT-0009", description: "3 Pin Socket 16A",                unit: "Nos",     pageNo: "18", itemNo: "M-009", listPrice: 120.00, labourCost: 25,  category: "Material" },
  { id: "MAT-0010", description: "LED Panel Light 18W",             unit: "Nos",     pageNo: "20", itemNo: "M-010", listPrice: 380.00, labourCost: 40,  category: "Material" },
  { id: "MAT-0011", description: "Cable Tray 100×50mm",             unit: "Mtr",     pageNo: "22", itemNo: "M-011", listPrice: 145.00, labourCost: 15,  category: "Material" },
  { id: "MAT-0012", description: "Flexible Conduit 20mm",           unit: "Mtr",     pageNo: "15", itemNo: "M-012", listPrice: 22.00,  labourCost: 0,   category: "Material" },
  // Labour
  { id: "LAB-0001", description: "Electrician (Skilled) Per Day",   unit: "Day",     pageNo: "30", itemNo: "L-001", listPrice: 850.00, labourCost: 0,   category: "Labour" },
  { id: "LAB-0002", description: "Helper Per Day",                  unit: "Day",     pageNo: "30", itemNo: "L-002", listPrice: 450.00, labourCost: 0,   category: "Labour" },
  { id: "LAB-0003", description: "Supervisor Per Day",              unit: "Day",     pageNo: "31", itemNo: "L-003", listPrice: 1200.00,labourCost: 0,   category: "Labour" },
  { id: "LAB-0004", description: "Cable Pulling Labour",            unit: "Mtr",     pageNo: "32", itemNo: "L-004", listPrice: 8.00,   labourCost: 0,   category: "Labour" },
  { id: "LAB-0005", description: "Panel Wiring Labour",             unit: "Nos",     pageNo: "33", itemNo: "L-005", listPrice: 500.00, labourCost: 0,   category: "Labour" },
  // Activities
  { id: "ACT-0001", description: "Point Wiring – Light Point",      unit: "Point",   pageNo: "40", itemNo: "A-001", listPrice: 350.00, labourCost: 120, category: "Activity" },
  { id: "ACT-0002", description: "Point Wiring – Fan Point",        unit: "Point",   pageNo: "40", itemNo: "A-002", listPrice: 380.00, labourCost: 130, category: "Activity" },
  { id: "ACT-0003", description: "Point Wiring – Power Point",      unit: "Point",   pageNo: "41", itemNo: "A-003", listPrice: 420.00, labourCost: 140, category: "Activity" },
  { id: "ACT-0004", description: "Point Wiring – AC Point",         unit: "Point",   pageNo: "41", itemNo: "A-004", listPrice: 650.00, labourCost: 180, category: "Activity" },
  // Point Wiring
  { id: "PW-0001", description: "Point Wiring – Light Point (PVC)", unit: "Point",   pageNo: "50", itemNo: "P-001", listPrice: 280.00, labourCost: 100, category: "Point Wiring" },
  { id: "PW-0002", description: "Point Wiring – Switch Board",      unit: "Board",   pageNo: "51", itemNo: "P-002", listPrice: 450.00, labourCost: 150, category: "Point Wiring" },
  { id: "PW-0003", description: "Point Wiring – 2-Way Switch",      unit: "Point",   pageNo: "52", itemNo: "P-003", listPrice: 520.00, labourCost: 160, category: "Point Wiring" },
  // Circuit Wiring
  { id: "CW-0001", description: "Circuit Wiring – 16A Circuit",     unit: "Circuit", pageNo: "60", itemNo: "C-001", listPrice: 850.00, labourCost: 150, category: "Circuit Wiring" },
  { id: "CW-0002", description: "Circuit Wiring – 32A Circuit",     unit: "Circuit", pageNo: "61", itemNo: "C-002", listPrice: 1200.00,labourCost: 200, category: "Circuit Wiring" },
  { id: "CW-0003", description: "Circuit Wiring – DB Feeder",       unit: "Circuit", pageNo: "62", itemNo: "C-003", listPrice: 2500.00,labourCost: 350, category: "Circuit Wiring" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
let _rowCounter = 0;
function newRowId() { return `row-${Date.now()}-${_rowCounter++}`; }

function makeLineItem(cat?: CatalogItem, category: ItemCategory = "Material"): LineItem {
  const base = cat ?? null;
  const lp   = base?.listPrice ?? 0;
  const lc   = base?.labourCost ?? 0;
  return {
    id: newRowId(),
    catalogItem: base,
    description: base?.description ?? "",
    unit:        base?.unit ?? "",
    qty:         1,
    pageNo:      base?.pageNo ?? "",
    itemNo:      base?.itemNo ?? "",
    listPrice:   lp,
    discountPct: 0,
    priceAfterDiscount: lp,
    labour:      lc,
    amount:      lp + lc,
    category:    base?.category ?? category,
  };
}

function recalc(row: LineItem): LineItem {
  const pad = row.listPrice - row.listPrice * (row.discountPct / 100);
  const amt = pad * row.qty + row.labour;
  return { ...row, priceAfterDiscount: pad, amount: amt };
}

function fmtINR(n: number) {
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero Rupees Only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function h(num: number): string {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? " " + ones[num%10] : "") + " ";
    return ones[Math.floor(num/100)] + " Hundred " + h(num%100);
  }
  const [rupees, paise] = [Math.floor(n), Math.round((n % 1) * 100)];
  let res = "";
  const cr = Math.floor(rupees / 10000000);
  const lac = Math.floor((rupees % 10000000) / 100000);
  const th = Math.floor((rupees % 100000) / 1000);
  const rem = rupees % 1000;
  if (cr)  res += h(cr) + "Crore ";
  if (lac) res += h(lac) + "Lakh ";
  if (th)  res += h(th) + "Thousand ";
  if (rem) res += h(rem);
  res = res.trim() + " Rupees";
  if (paise) res += " and " + h(paise).trim() + " Paise";
  return res + " Only";
}

function genQuotationNo() {
  const n = Math.floor(Math.random() * 900) + 100;
  return `QT-2026-${String(n).padStart(5, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function validityStr() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAV DATA
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",      icon: "grid",      href: "/Dashboard" },
  { label: "Quotations",     icon: "file-text", href: "/Quotations", active: true },
  { label: "Materials",      icon: "layers",    href: "#" },
  // { label: "Labour",         icon: "users",     href: "#" },
  // { label: "Activities",     icon: "activity",  href: "#" },
  // { label: "Point Wiring",   icon: "zap",       href: "#" },
  // { label: "Circuit Wiring", icon: "cpu",       href: "#" },
  
  // { label: "Customers",      icon: "user",      href: "#" },
  { label: "Reports",        icon: "bar-chart", href: "#" },
  // { label: "Price List",     icon: "tag",       href: "#" },
  { label: "Settings",       icon: "settings",  href: "#" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NAV ICONS
// ─────────────────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  "grid":        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  "layers":      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  "users":       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "activity":    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  "zap":         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  "cpu":         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  "file-text":   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  "user":        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  "bar-chart":   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  "tag":         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  "settings":    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY BADGE COLOR
// ─────────────────────────────────────────────────────────────────────────────
const CAT_COLOR: Record<ItemCategory, string> = {
  "Material":       "bg-blue-100 text-blue-700",
  "Labour":         "bg-orange-100 text-orange-700",
  "Activity":       "bg-green-100 text-green-700",
  "Point Wiring":   "bg-purple-100 text-purple-700",
  "Circuit Wiring": "bg-pink-100 text-pink-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// ITEM SEARCH DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function ItemSearchCell({
  row,
  filterCategory,
  onSelect,
}: {
  row: LineItem;
  filterCategory?: ItemCategory;
  onSelect: (cat: CatalogItem) => void;
}) {
  const [query, setQuery] = useState(row.description);
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const results = CATALOG.filter((c) => {
    const matchCat = !filterCategory || c.category === filterCategory;
    const q = query.toLowerCase();
    return matchCat && (c.description.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }).slice(0, 10);

  useEffect(() => { setQuery(row.description); }, [row.description]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full min-w-[160px]">
      <input
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 py-0.5"
        value={query}
        placeholder="Search item…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              onMouseDown={() => { onSelect(c); setOpen(false); }}
              className="w-full flex flex-col px-3 py-2 hover:bg-accent text-left border-b border-border/50 last:border-0"
            >
              <span className="text-xs font-semibold text-foreground truncate">{c.description}</span>
              <span className="flex gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{c.id}</span>
                <span className={`text-[10px] px-1.5 rounded-full font-medium ${CAT_COLOR[c.category]}`}>{c.category}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE EDITABLE NUMBER CELL
// ─────────────────────────────────────────────────────────────────────────────
function EditableNumber({
  value,
  min = 0,
  max,
  onChange,
  className = "",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw]         = useState(String(value));

  useEffect(() => { if (!editing) setRaw(String(value)); }, [value, editing]);

  return editing ? (
    <input
      autoFocus
      className={`w-full bg-transparent text-sm outline-none text-right ${className}`}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const v = parseFloat(raw);
        if (!isNaN(v) && (max === undefined || v <= max) && v >= min) onChange(v);
        setEditing(false);
      }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  ) : (
    <span
      className={`block w-full text-right text-sm cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={() => setEditing(true)}
    >
      {value.toFixed(2)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside className="w-[200px] flex-shrink-0 bg-white border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow shadow-primary/30 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/></svg>
        </div>
        <div>
          <p className="text-[13px] font-bold text-foreground leading-none">Zyvionix</p>
          <p className="text-[10px] text-primary font-semibold leading-none mt-0.5">Technologies</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-0.5">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                item.active
                  ? "bg-primary text-white shadow shadow-primary/30"
                  : "text-muted-foreground hover:text-primary hover:bg-accent"
              }`}
            >
              <span className={item.active ? "text-white" : ""}>{ICONS[item.icon]}</span>
              {item.label}
            </a>
          ))}
        </nav>
      </ScrollArea>

      {/* Need help */}
      <div className="px-4 py-4 border-t border-border">
        <div className="bg-primary/5 rounded-xl p-3">
          <p className="text-[11px] font-bold text-foreground">Need Help?</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">We&apos;re here to help you</p>
          <Button size="sm" className="w-full mt-2 h-7 text-[11px] rounded-lg">Contact Support</Button>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NewQuotationPage() {
  // ── Customer Info ──
  const [info, setInfo] = useState<CustomerInfo>({
    customerName:    "",
    company:         "",
    projectName:     "",
    projectLocation: "",
    phone:           "",
    email:           "",
    gstNumber:       "",
    quotationNo:     genQuotationNo(),
    quotationDate:   todayStr(),
    validity:        validityStr(),
    reference:       "",
    salesPerson:     "Vishnu P",
  });

  // ── Line Items ──
  const [rows, setRows] = useState<LineItem[]>([]);

  // ── Notes ──
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "1. GST Extra as applicable.\n2. Delivery within agreed timeline.\n3. Payment Terms: 100% advance.\n4. Warranty as per manufacturer.\n5. Quote Valid for 30 Days from date of quotation."
  );
  const [remarks, setRemarks] = useState("");

  // ── Discount ──
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Search filter ──
  const [tableSearch, setTableSearch] = useState("");

  // ─── Computed Totals ──────────────────────────────────────────────────────
  const materialTotal = rows.filter(r => r.category === "Material").reduce((s, r) => s + r.amount, 0);
  const labourTotal   = rows.filter(r => r.category === "Labour").reduce((s, r) => s + r.amount, 0);
  const activityTotal = rows.filter(r => r.category === "Activity" || r.category === "Point Wiring" || r.category === "Circuit Wiring").reduce((s, r) => s + r.amount, 0);
  const subtotal      = rows.reduce((s, r) => s + r.amount, 0);
  const discountAmt   = subtotal * (globalDiscount / 100);
  const taxable       = subtotal - discountAmt;
  const cgst          = taxable * 0.09;
  const sgst          = taxable * 0.09;
  const igst          = 0;
  const roundOff      = Math.round(taxable + cgst + sgst + igst) - (taxable + cgst + sgst + igst);
  const grandTotal    = taxable + cgst + sgst + igst + roundOff;

  // ─── Row helpers ─────────────────────────────────────────────────────────
  const updateRow = useCallback((id: string, patch: Partial<LineItem>) => {
    setRows(prev => prev.map(r => r.id === id ? recalc({ ...r, ...patch }) : r));
  }, []);



  const addBlankRow = useCallback((category: ItemCategory = "Material") => {
    setRows(prev => [...prev, makeLineItem(undefined, category)]);
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const duplicateRow = useCallback((id: string) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: newRowId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const selectCatalogItem = useCallback((rowId: string, cat: CatalogItem) => {
    setRows(prev => prev.map(r =>
      r.id === rowId
        ? recalc({ ...r, catalogItem: cat, description: cat.description, unit: cat.unit, pageNo: cat.pageNo, itemNo: cat.itemNo, listPrice: cat.listPrice, labour: cat.labourCost, category: cat.category })
        : r
    ));
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!info.customerName.trim()) e.customerName = "Customer name is required";
    if (!info.quotationDate) e.quotationDate = "Quotation date is required";
    if (rows.length === 0) e.items = "At least one item is required";
    rows.forEach((r, i) => {
      if (r.qty <= 0) e[`qty_${r.id}`] = `Row ${i+1}: Qty must be > 0`;
      if (r.discountPct > 100) e[`disc_${r.id}`] = `Row ${i+1}: Discount cannot exceed 100%`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const infoField = (key: keyof CustomerInfo, label: string, placeholder: string, readonly = false) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <Input
        id={`info-${key}`}
        value={info[key]}
        readOnly={readonly}
        placeholder={placeholder}
        onChange={e => setInfo(p => ({ ...p, [key]: e.target.value }))}
        className={`h-9 text-sm rounded-lg ${readonly ? "bg-muted/40 text-muted-foreground cursor-default" : ""} ${errors[key] ? "border-destructive" : ""}`}
      />
      {errors[key] && <p className="text-[11px] text-destructive">{errors[key]}</p>}
    </div>
  );

  const visibleRows = tableSearch
    ? rows.filter(r => r.description.toLowerCase().includes(tableSearch.toLowerCase()) || r.category.toLowerCase().includes(tableSearch.toLowerCase()))
    : rows;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f8f7ff]">
      <Sidebar />

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-border px-6 py-4 sticky top-0 z-30">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <a href="/Dashboard" className="hover:text-primary transition-colors">Dashboard</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <a href="/Quotations" className="hover:text-primary transition-colors">Quotations</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span className="text-primary font-medium">New Quotation</span>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">New Quotation</h1>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full px-3 h-6 text-xs font-semibold">
                Draft
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-9" onClick={() => window.history.back()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 rounded-xl border-border hover:border-primary/40" onClick={() => validate()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save Draft
              </Button>
              <Button size="sm" className="gap-1.5 h-9 rounded-xl shadow shadow-primary/25">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Generate PDF
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>More Actions</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 flex gap-5 px-6 py-5 min-w-0 overflow-x-auto">
          <div className="flex-1 min-w-0 space-y-5">

            {/* ═══ CUSTOMER DETAILS CARD ══════════════════════════════════ */}
            <Card className="rounded-2xl shadow-sm border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {infoField("customerName",    "Customer Name *",      "Select or type customer name")}
                  {infoField("company",         "Company",              "Company name")}
                  {infoField("projectName",     "Project Name",         "Project name")}
                  {infoField("projectLocation", "Project Location",     "City, State")}
                  {infoField("phone",           "Phone Number",         "+91 00000 00000")}
                  {infoField("email",           "Email",                "email@example.com")}
                  {infoField("gstNumber",       "GST Number",           "22AAAAA0000A1Z5")}
                  {infoField("quotationNo",     "Quotation No.",        "Auto-generated", true)}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Quotation Date *</label>
                    <Input
                      id="info-quotationDate"
                      type="date"
                      value={info.quotationDate}
                      onChange={e => setInfo(p => ({ ...p, quotationDate: e.target.value }))}
                      className={`h-9 text-sm rounded-lg ${errors.quotationDate ? "border-destructive" : ""}`}
                    />
                    {errors.quotationDate && <p className="text-[11px] text-destructive">{errors.quotationDate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Valid Till</label>
                    <Input
                      id="info-validity"
                      type="date"
                      value={info.validity}
                      onChange={e => setInfo(p => ({ ...p, validity: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                  {infoField("reference",   "Reference",   "Enter reference (optional)")}
                  {infoField("salesPerson", "Sales Person", "Sales person name")}
                </div>
              </CardContent>
            </Card>

            {/* ═══ ITEMS TABLE CARD ════════════════════════════════════════ */}
            <Card className="rounded-2xl shadow-sm border-border overflow-hidden">
              <CardHeader className="pb-0 border-b border-border">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </div>
                    Quotation Items
                    <Badge className="bg-primary/10 text-primary border-0 rounded-full px-2.5 text-xs">{rows.length}</Badge>
                  </CardTitle>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Table search */}
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <Input
                        placeholder="Search items…"
                        value={tableSearch}
                        onChange={e => setTableSearch(e.target.value)}
                        className="pl-8 h-8 w-44 text-xs rounded-lg"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg border-border">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Import Excel
                    </Button>
                    <Button size="sm" className="h-8 gap-1.5 text-xs rounded-lg shadow shadow-primary/20" onClick={() => addBlankRow("Material")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Category quick-add buttons */}
                <div className="flex items-center gap-2 pb-3 flex-wrap">
                  {(["Material","Labour","Activity","Point Wiring","Circuit Wiring"] as ItemCategory[]).map(cat => {
                    const colors: Record<ItemCategory,string> = {
                      "Material":       "border-blue-200 text-blue-700 hover:bg-blue-50",
                      "Labour":         "border-orange-200 text-orange-700 hover:bg-orange-50",
                      "Activity":       "border-green-200 text-green-700 hover:bg-green-50",
                      "Point Wiring":   "border-purple-200 text-purple-700 hover:bg-purple-50",
                      "Circuit Wiring": "border-pink-200 text-pink-700 hover:bg-pink-50",
                    };
                    return (
                      <button
                        key={cat}
                        onClick={() => addBlankRow(cat)}
                        className={`flex items-center gap-1.5 px-3 h-7 rounded-lg border text-xs font-medium transition-colors ${colors[cat]}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        {cat}
                      </button>
                    );
                  })}
                  {rows.length > 0 && (
                    <button
                      onClick={() => setRows([])}
                      className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors ml-auto"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Clear All
                    </button>
                  )}
                </div>
              </CardHeader>

              {/* Validation error for items */}
              {errors.items && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-xs text-destructive">{errors.items}</p>
                </div>
              )}

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      {["Sl.No","Item Description","Unit","Qty","Page No","Item No","List Price","Disc %","Price After Disc","Labour","Amount","Action"].map((h,i) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap border-b border-border ${i === 0 ? "w-12" : ""} ${[6,7,8,9,10].includes(i) ? "text-right" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-12 text-muted-foreground text-sm">
                          <div className="flex flex-col items-center gap-2">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            <span>No items added yet. Click <strong>+ Add Item</strong> or use the category buttons above.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((row, idx) => (
                        <tr key={row.id} className="border-b border-border/50 hover:bg-accent/30 group transition-colors">
                          {/* Sl.No */}
                          <td className="px-3 py-2 text-xs text-muted-foreground w-12">{idx + 1}</td>

                          {/* Description + category */}
                          <td className="px-3 py-2 min-w-[200px]">
                            <ItemSearchCell
                              row={row}
                              onSelect={cat => selectCatalogItem(row.id, cat)}
                            />
                            <span className={`inline-block mt-0.5 text-[10px] px-1.5 rounded-full font-medium ${CAT_COLOR[row.category]}`}>
                              {row.catalogItem?.id ?? row.category}
                            </span>
                          </td>

                          {/* Unit */}
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{row.unit || "—"}</td>

                          {/* Qty */}
                          <td className="px-3 py-2 w-20">
                            <EditableNumber
                              value={row.qty}
                              min={0.01}
                              onChange={v => updateRow(row.id, { qty: v })}
                              className={errors[`qty_${row.id}`] ? "text-destructive" : ""}
                            />
                          </td>

                          {/* Page No */}
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.pageNo || "—"}</td>

                          {/* Item No */}
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{row.itemNo || "—"}</td>

                          {/* List Price */}
                          <td className="px-3 py-2 text-right text-xs font-medium">{row.listPrice.toFixed(2)}</td>

                          {/* Discount % */}
                          <td className="px-3 py-2 w-20">
                            <EditableNumber
                              value={row.discountPct}
                              min={0}
                              max={100}
                              onChange={v => updateRow(row.id, { discountPct: v })}
                              className={errors[`disc_${row.id}`] ? "text-destructive" : "text-amber-600"}
                            />
                          </td>

                          {/* Price After Discount */}
                          <td className="px-3 py-2 text-right text-xs font-semibold text-primary">{row.priceAfterDiscount.toFixed(2)}</td>

                          {/* Labour */}
                          <td className="px-3 py-2 w-20">
                            <EditableNumber
                              value={row.labour}
                              min={0}
                              onChange={v => updateRow(row.id, { labour: v })}
                            />
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-2 text-right text-xs font-bold text-foreground">{row.amount.toFixed(2)}</td>

                          {/* Actions */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => duplicateRow(row.id)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate row</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => deleteRow(row.id)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Delete row</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-border">
                        <td colSpan={10} className="px-3 py-2.5 text-xs font-bold text-right text-foreground">Grand Total</td>
                        <td className="px-3 py-2.5 text-right text-sm font-extrabold text-primary">{subtotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Add row button */}
              <div className="px-4 py-2 border-t border-border/50">
                <button
                  onClick={() => addBlankRow("Material")}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Row
                </button>
              </div>
            </Card>

            {/* ═══ NOTES + TERMS ═══════════════════════════════════════════ */}
            <Card className="rounded-2xl shadow-sm border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  Notes &amp; Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-5">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Notes / Terms &amp; Conditions</label>
                    <Textarea
                      value={terms}
                      onChange={e => setTerms(e.target.value)}
                      rows={7}
                      className="resize-none text-xs rounded-xl"
                      placeholder="Enter terms and conditions…"
                    />
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={7}
                      className="resize-none text-xs rounded-xl"
                      placeholder="Add internal notes…"
                    />
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Remark (Optional)</label>
                    <Textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      rows={7}
                      className="resize-none text-xs rounded-xl"
                      placeholder="Enter any additional remarks…"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground pb-4">
              © 2026 Zyvionix Technologies. All rights reserved. &nbsp;|&nbsp; Version 1.0.0
            </p>
          </div>

          {/* ═══ STICKY SUMMARY PANEL ════════════════════════════════════════ */}
          <div className="w-[280px] flex-shrink-0">
            <div className="sticky top-[88px] space-y-4">
              <Card className="rounded-2xl shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    Quotation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-0">
                  {/* Breakdown */}
                  {[
                    { label: "Material Total",  value: materialTotal },
                    { label: "Labour Total",    value: labourTotal   },
                    { label: "Activity Total",  value: activityTotal },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-dashed border-border/70">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-semibold text-foreground">{fmtINR(value)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center py-2 mt-1">
                    <span className="text-xs font-bold text-foreground">Sub Total</span>
                    <span className="text-xs font-bold text-foreground">{fmtINR(subtotal)}</span>
                  </div>

                  {/* Global discount */}
                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-dashed border-border/70">
                    <span className="text-xs text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={globalDiscount}
                        onChange={e => setGlobalDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-14 text-right text-xs border border-border rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary/40"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      <span className="text-xs font-semibold text-red-500 ml-1">- {fmtINR(discountAmt)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-border/70">
                    <span className="text-xs text-muted-foreground">Taxable Amount</span>
                    <span className="text-xs font-semibold text-foreground">{fmtINR(taxable)}</span>
                  </div>

                  {[
                    { label: "CGST (9%)", value: cgst },
                    { label: "SGST (9%)", value: sgst },
                    { label: "IGST (0%)", value: igst },
                    { label: "Round Off",  value: roundOff },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-dashed border-border/40">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className="text-[11px] text-foreground">{fmtINR(value)}</span>
                    </div>
                  ))}

                  {/* Grand Total */}
                  <div className="mt-3 bg-primary/5 rounded-xl px-4 py-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Grand Total</span>
                      <span className="text-lg font-extrabold text-primary">{fmtINR(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Amount in words */}
                  <div className="bg-muted/50 rounded-xl px-3 py-2 mb-4">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">Amount in Words</p>
                    <p className="text-[11px] text-foreground font-medium leading-snug">{numberToWords(grandTotal)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <Card className="rounded-2xl shadow-sm border-border">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <Button
                    className="w-full gap-2 rounded-xl shadow shadow-primary/25 h-10"
                    onClick={() => validate()}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Generate PDF
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border h-9 text-xs">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border h-9 text-xs">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      Print
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl border-border h-9 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Send Email
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl border-[#25D366]/30 h-9 text-xs text-[#25D366] hover:bg-green-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
