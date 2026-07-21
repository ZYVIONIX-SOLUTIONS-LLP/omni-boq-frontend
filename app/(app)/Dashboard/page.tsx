"use client";

import { useState } from "react";

// ── shadcn components ──────────────────────────────────────────────────────────
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ── Types ──────────────────────────────────────────────────────────────────────
type QuoteStatus = "Sent" | "Approved" | "Draft" | "Expired";

interface Quotation {
  id: number;
  date: string;
  client: string;
  project: string;
  value: string;
  status: QuoteStatus;
}

// ── Data ───────────────────────────────────────────────────────────────────────
const quotations: Quotation[] = [
  { id: 1, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Sent" },
  { id: 2, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Sent" },
  { id: 3, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Sent" },
  { id: 4, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Sent" },
  { id: 5, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Approved" },
  { id: 6, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Approved" },
  { id: 7, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Approved" },
  { id: 8, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Sent" },
  { id: 9, date: "2024-06-25", client: "ABC Corp", project: "Retail Store Wiring", value: "$25,000", status: "Approved" },
];

// ── Status Badge ───────────────────────────────────────────────────────────────
function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  if (status === "Sent") {
    return (
      <Badge className="bg-[#6c63ff]/15 text-[#6c63ff] border-0 hover:bg-[#6c63ff]/25 font-semibold rounded-full px-3">
        Sent
      </Badge>
    );
  }
  if (status === "Approved") {
    return (
      <Badge className="bg-[#d4d0fa] text-[#4a3fcc] border-0 hover:bg-[#c4c0f8] font-semibold rounded-full px-3">
        Approved
      </Badge>
    );
  }
  if (status === "Draft") {
    return (
      <Badge variant="secondary" className="rounded-full px-3 font-semibold">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="rounded-full px-3 font-semibold">
      Expired
    </Badge>
  );
}

// ── Donut Chart (pure SVG — no extra deps) ─────────────────────────────────────
function DonutChart() {
  const segments = [
    { pct: 45, color: "#6c63ff", label: "Sent" },
    { pct: 35, color: "#a5a0f5", label: "Approved" },
    { pct: 10, color: "#d4d0fa", label: "Draft" },
    { pct: 10, color: "#e8e6fb", label: "Expired" },
  ];
  const r = 58;
  const cx = 75;
  const cy = 75;
  const circ = 2 * Math.PI * r;
  const gap = 2;
  let offset = 0;

  const arcs = segments.map((seg, i) => {
    const dash = (seg.pct / 100) * circ - gap;
    const space = circ - dash;
    const node = (
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={24}
        strokeDasharray={`${dash} ${space}`}
        strokeDashoffset={-offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
      />
    );
    offset += (seg.pct / 100) * circ;
    return node;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={150} height={150} viewBox="0 0 150 150">
        {arcs}
        <circle cx={cx} cy={cy} r={46} fill="white" />
      </svg>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 w-full px-1">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stat-card Illustrations ────────────────────────────────────────────────────
function QuotationIllustration() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="6" width="38" height="50" rx="4" fill="#ede9ff" />
      <rect x="16" y="14" width="26" height="3" rx="1.5" fill="#a5a0f5" />
      <rect x="16" y="21" width="20" height="3" rx="1.5" fill="#c4c0f8" />
      <rect x="16" y="28" width="24" height="3" rx="1.5" fill="#c4c0f8" />
      <rect x="16" y="35" width="16" height="3" rx="1.5" fill="#d4d0fa" />
      <rect x="36" y="30" width="16" height="20" rx="3" fill="#6c63ff" opacity="0.2" />
      <path d="M41 44l3 3 5-6" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ValueIllustration() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="26" fill="#ede9ff" />
      <circle cx="32" cy="32" r="20" fill="#d4d0fa" />
      <text x="32" y="39" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#6c63ff">₹</text>
      <circle cx="48" cy="16" r="8" fill="#6c63ff" opacity="0.25" />
      <circle cx="48" cy="16" r="5" fill="#6c63ff" opacity="0.45" />
    </svg>
  );
}
function PendingIllustration() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="18" width="32" height="30" rx="3" fill="#ede9ff" />
      <rect x="14" y="26" width="18" height="2.5" rx="1" fill="#a5a0f5" />
      <rect x="14" y="32" width="14" height="2.5" rx="1" fill="#c4c0f8" />
      <rect x="14" y="38" width="10" height="2.5" rx="1" fill="#d4d0fa" />
      <circle cx="46" cy="20" r="10" fill="#fef3c7" />
      <text x="46" y="25" textAnchor="middle" fontSize="13">⚠️</text>
    </svg>
  );
}
function CustomersIllustration() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <circle cx="24" cy="22" r="10" fill="#ede9ff" />
      <circle cx="24" cy="22" r="7" fill="#c4c0f8" />
      <path d="M10 46c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="#d4d0fa" />
      <circle cx="42" cy="26" r="8" fill="#a5a0f5" opacity="0.5" />
      <circle cx="42" cy="26" r="5" fill="#6c63ff" opacity="0.4" />
    </svg>
  );
}
function ClipboardIllustration() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="10" width="36" height="46" rx="4" fill="#ede9ff" />
      <rect x="20" y="6" width="20" height="8" rx="4" fill="#c4c0f8" />
      <rect x="18" y="22" width="24" height="3" rx="1.5" fill="#a5a0f5" />
      <rect x="18" y="29" width="18" height="3" rx="1.5" fill="#c4c0f8" />
      <rect x="18" y="36" width="20" height="3" rx="1.5" fill="#c4c0f8" />
      <rect x="18" y="43" width="14" height="3" rx="1.5" fill="#d4d0fa" />
    </svg>
  );
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function PencilIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function MoreHorizIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [search, setSearch] = useState("");

  const filtered = quotations.filter(
    (q) =>
      q.client.toLowerCase().includes(search.toLowerCase()) ||
      q.project.toLowerCase().includes(search.toLowerCase()) ||
      q.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      <div className="px-7 py-5 space-y-5 flex-1">

        {/* Search */}
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <SearchIcon />
          </span>
          <Input
            id="dashboard-search"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-muted/50 border-border focus-visible:ring-primary/30"
          />
        </div>

              {/* ── Stat Cards (shadcn Card) ─────────────────────────── */}
              <div className="grid grid-cols-4 gap-4">

                {/* Total Quotations */}
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-border">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Total Quotations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <p className="text-3xl font-extrabold text-foreground leading-tight">1,245</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      last month <span className="text-green-500 font-semibold">+8%</span>
                    </p>
                    <div className="flex justify-end mt-2">
                      <QuotationIllustration />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Quoted Value */}
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-border">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Total Quoted Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <p className="text-3xl font-extrabold text-foreground leading-tight">$1.8M</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      last month <span className="text-green-500 font-semibold">+12%</span>
                    </p>
                    <div className="flex justify-end mt-2">
                      <ValueIllustration />
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Approvals */}
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-border">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <p className="text-3xl font-extrabold text-foreground leading-tight">
                      18{" "}
                      <span className="text-lg font-bold text-muted-foreground">Quotes</span>
                    </p>
                    <p className="text-xs text-amber-500 mt-1">⚠️ Requires attention</p>
                    <div className="flex justify-end mt-2">
                      <PendingIllustration />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Customers */}
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-border">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      Total Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <p className="text-3xl font-extrabold text-foreground leading-tight">312</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      last month <span className="text-green-500 font-semibold">+5%</span>
                    </p>
                    <div className="flex justify-end mt-2">
                      <CustomersIllustration />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Bottom section ───────────────────────────────────── */}
              <div className="flex gap-4 items-start">

                {/* Recent Quotations Table (shadcn Card + Table) */}
                <Card className="flex-1 min-w-0 rounded-2xl shadow-sm border-border overflow-hidden">
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-bold">Recent Quotations</CardTitle>
                    <ClipboardIllustration />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="px-5 text-xs font-semibold text-muted-foreground w-[115px]">
                            Date
                          </TableHead>
                          <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                            Client
                          </TableHead>
                          <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                            Project
                          </TableHead>
                          <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                            Value
                          </TableHead>
                          <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                            Status
                          </TableHead>
                          <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((q) => (
                          <TableRow
                            key={q.id}
                            className="hover:bg-accent/40 transition-colors border-b border-border/50"
                          >
                            <TableCell className="px-5 text-xs font-medium text-muted-foreground">
                              {q.date}
                            </TableCell>
                            <TableCell className="px-4 font-medium text-foreground">
                              {q.client}
                            </TableCell>
                            <TableCell className="px-4 text-muted-foreground">
                              {q.project}
                            </TableCell>
                            <TableCell className="px-4 font-semibold text-foreground">
                              {q.value}
                            </TableCell>
                            <TableCell className="px-4">
                              <QuoteStatusBadge status={q.status} />
                            </TableCell>
                            <TableCell className="px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-primary rounded-lg"
                                  aria-label="Edit"
                                >
                                  <PencilIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-primary rounded-lg"
                                  aria-label="More options"
                                >
                                  <MoreHorizIcon />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Right panel */}
                <div className="w-[230px] flex-shrink-0 flex flex-col gap-4">

                  {/* Quote Status Breakdown (shadcn Card) */}
                  <Card className="rounded-2xl shadow-sm border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold">Quote Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DonutChart />
                    </CardContent>
                  </Card>

                  {/* Quick Actions (shadcn Card + Button) */}
                  <Card className="rounded-2xl shadow-sm border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Create New Quotation */}
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 rounded-xl justify-between hover:bg-accent hover:border-primary/30 transition-all group"
                      >
                        <span className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary leading-tight text-left">
                            Create New<br />Quotation
                          </span>
                          <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                            <rect x="4" y="4" width="40" height="40" rx="10" fill="#ede9ff" />
                            <rect x="15" y="14" width="4" height="8" rx="2" fill="#a5a0f5" />
                            <rect x="29" y="14" width="4" height="8" rx="2" fill="#a5a0f5" />
                            <path d="M14 22h20v4a10 10 0 0 1-20 0v-4z" fill="#6c63ff" opacity="0.7" />
                            <rect x="20" y="36" width="8" height="6" rx="2" fill="#6c63ff" opacity="0.5" />
                          </svg>
                        </span>
                      </Button>

                      {/* Add New Customer */}
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 rounded-xl justify-between hover:bg-accent hover:border-primary/30 transition-all group"
                      >
                        <span className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary leading-tight text-left">
                            Add New<br />Customer
                          </span>
                          <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
                            <rect x="4" y="4" width="40" height="40" rx="10" fill="#ede9ff" />
                            <circle cx="24" cy="24" r="12" fill="#a5a0f5" opacity="0.5" />
                            <circle cx="24" cy="24" r="8" fill="#6c63ff" opacity="0.3" />
                            <circle cx="24" cy="24" r="4" fill="#6c63ff" opacity="0.6" />
                            <path d="M36 24 Q42 18 44 24" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" fill="none" />
                          </svg>
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
      </div>

      {/* Footer */}
      <Separator />
      <footer className="text-center py-3 text-xs text-muted-foreground flex-shrink-0">
        Zyvionix Solutions © 2026. All Rights Reserved.
      </footer>
    </div>
  );
}
