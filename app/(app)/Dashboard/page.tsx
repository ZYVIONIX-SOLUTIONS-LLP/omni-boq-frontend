"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

// ── API ────────────────────────────────────────────────────────────────────────
import { listQuotations, Quotation, QuotationStatus } from "@/app/lib/api/quotations";
import { listUsers } from "@/app/lib/api/auth";

// ── Helpers ────────────────────────────────────────────────────────────────────
function inr(value: number | null | undefined): string {
  if (value == null) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function QuoteStatusBadge({ status }: { status: QuotationStatus }) {
  if (status === "SENT") {
    return (
      <Badge className="bg-[#6c63ff]/15 text-[#6c63ff] border-0 hover:bg-[#6c63ff]/25 font-semibold rounded-full px-3">
        Sent
      </Badge>
    );
  }
  if (status === "ACCEPTED") {
    return (
      <Badge className="bg-[#d4d0fa] text-[#4a3fcc] border-0 hover:bg-[#c4c0f8] font-semibold rounded-full px-3">
        Accepted
      </Badge>
    );
  }
  if (status === "DRAFT") {
    return (
      <Badge variant="secondary" className="rounded-full px-3 font-semibold">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="rounded-full px-3 font-semibold">
      {status === "REJECTED" ? "Rejected" : "Expired"}
    </Badge>
  );
}

// ── Donut Chart (pure SVG — no extra deps) ─────────────────────────────────────
function DonutChart({ quotations }: { quotations: Quotation[] }) {
  const total = quotations.length || 1; // avoid division by zero
  const count = (status: QuotationStatus) => quotations.filter(q => q.status === status).length;
  
  const segments = [
    { pct: (count("SENT") / total) * 100, color: "#6c63ff", label: "Sent" },
    { pct: (count("ACCEPTED") / total) * 100, color: "#a5a0f5", label: "Accepted" },
    { pct: (count("DRAFT") / total) * 100, color: "#d4d0fa", label: "Draft" },
    { pct: ((count("EXPIRED") + count("REJECTED")) / total) * 100, color: "#e8e6fb", label: "Failed" },
  ];
  
  const r = 58;
  const cx = 75;
  const cy = 75;
  const circ = 2 * Math.PI * r;
  const gap = 2;
  let offset = 0;

  const arcs = segments.map((seg, i) => {
    if (seg.pct === 0) return null;
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
function StaffIllustration() {
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

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [qRes, uRes] = await Promise.all([
          listQuotations({ limit: 500 }),
          listUsers(),
        ]);
        setQuotations(qRes.items);
        setTotalStaff(uRes.filter((u) => u.role === "STAFF").length);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();
    const clientMatch = q.customer?.name?.toLowerCase().includes(s);
    const projectMatch = q.project?.name?.toLowerCase().includes(s);
    const codeMatch = q.code?.toLowerCase().includes(s);
    return clientMatch || projectMatch || codeMatch || q.status.toLowerCase().includes(s);
  });

  const totalQuotedValue = quotations.reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);
  const pendingCount = quotations.filter(q => q.status === "SENT").length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-0rem)]">
      <div className="px-7 py-5 space-y-5 flex-1">

        {/* Search */}
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <SearchIcon />
          </span>
          <Input
            id="dashboard-search"
            type="text"
            placeholder="Search quotations..."
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
              <p className="text-3xl font-extrabold text-foreground leading-tight">
                {loading ? "..." : quotations.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generated across all time
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
              <p className="text-3xl font-extrabold text-foreground leading-tight truncate" title={inr(totalQuotedValue)}>
                {loading ? "..." : inr(totalQuotedValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cumulative value
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
                {loading ? "..." : pendingCount}{" "}
                <span className="text-lg font-bold text-muted-foreground">Quotes</span>
              </p>
              <p className="text-xs text-amber-500 mt-1">⚠️ Awaiting response</p>
              <div className="flex justify-end mt-2">
                <PendingIllustration />
              </div>
            </CardContent>
          </Card>

          {/* Total Staff */}
          <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Total Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-3xl font-extrabold text-foreground leading-tight">
                {loading ? "..." : totalStaff}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Active staff members
              </p>
              <div className="flex justify-end mt-2">
                <StaffIllustration />
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
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-5 text-xs font-semibold text-muted-foreground w-[115px]">
                      Date
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                      Quote #
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                      Client
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-muted-foreground">
                      Project
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-muted-foreground text-right">
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No quotations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((q) => (
                      <TableRow
                        key={q.id}
                        className="hover:bg-accent/40 transition-colors border-b border-border/50"
                      >
                        <TableCell className="px-5 text-xs font-medium text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-4 font-semibold text-primary">
                          {q.code}
                        </TableCell>
                        <TableCell className="px-4 font-medium text-foreground">
                          {q.customer?.name || "—"}
                        </TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {q.project?.name || "—"}
                        </TableCell>
                        <TableCell className="px-4 font-semibold text-foreground text-right">
                          {inr(Number(q.grandTotal))}
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
                              onClick={() => router.push(`/Quotations/${q.id}`)}
                            >
                              <PencilIcon />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                <DonutChart quotations={quotations} />
              </CardContent>
            </Card>

            {/* Quick Actions (shadcn Card + Button) */}
            <Card className="rounded-2xl shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Create New Quotation */}
                <Link href="/Quotations">
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 rounded-xl justify-between hover:bg-accent hover:border-primary/30 transition-all group"
                  >
                    <span className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary leading-tight text-left">
                        Manage<br />Quotations
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
                </Link>
                
                {/* Manage Staff */}
                <Link href="/Staff">
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 rounded-xl justify-between hover:bg-accent hover:border-primary/30 transition-all group"
                  >
                    <span className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary leading-tight text-left">
                        Manage<br />Staff
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
                </Link>
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
