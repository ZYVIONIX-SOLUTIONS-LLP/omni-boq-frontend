"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────────
type QuoteStatus = "Sent" | "Approved" | "Draft" | "Expired";

interface Quotation {
  id: string;
  date: string;
  client: string;
  project: string;
  value: number; // numeric value for sorting
  status: QuoteStatus;
}

// ── Data ───────────────────────────────────────────────────────────────────────
const initialQuotations: Quotation[] = [
  { id: "QT-2026-00101", date: "2026-07-05", client: "ABC Corp", project: "Retail Store Wiring", value: 25000, status: "Sent" },
  { id: "QT-2026-00102", date: "2026-07-04", client: "XYZ Industries", project: "Office DB Installation", value: 12500, status: "Approved" },
  { id: "QT-2026-00103", date: "2026-07-02", client: "Delta Builders", project: "Residential Conduit Run", value: 89000, status: "Sent" },
  { id: "QT-2026-00104", date: "2026-06-28", client: "Apex Tech", project: "Server Room Cabling", value: 45000, status: "Draft" },
  { id: "QT-2026-00105", date: "2026-06-25", client: "Global Infra", project: "Substation Earthing", value: 150000, status: "Approved" },
  { id: "QT-2026-00106", date: "2026-06-20", client: "Vertex Ltd", project: "Lighting Automation", value: 31000, status: "Expired" },
  { id: "QT-2026-00107", date: "2026-06-18", client: "ABC Corp", project: "Warehouse High Bay Lights", value: 62000, status: "Approved" },
  { id: "QT-2026-00108", date: "2026-06-15", client: "Zenith Residency", project: "Main Panel Upgrade", value: 75000, status: "Sent" },
  { id: "QT-2026-00109", date: "2026-06-10", client: "Max Retail", project: "Showroom Wiring", value: 18500, status: "Draft" },
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
      <Badge variant="secondary" className="rounded-full px-3 font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="rounded-full px-3 font-semibold bg-red-50 text-red-600 hover:bg-red-100 border-0">
      Expired
    </Badge>
  );
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function PencilIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}

const formatINR = (value: number) => {
  return "₹ " + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  // Filtering & Sorting logic
  const filteredAndSorted = useMemo(() => {
    let result = [...initialQuotations];

    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.client.toLowerCase().includes(q) ||
          item.project.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "value-desc":
          return b.value - a.value;
        case "value-asc":
          return a.value - b.value;
        case "client-asc":
          return a.client.localeCompare(b.client);
        case "client-desc":
          return b.client.localeCompare(a.client);
        default:
          return 0;
      }
    });

    return result;
  }, [search, statusFilter, sortBy]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-68px)]">
      <div className="px-7 py-6 space-y-6 flex-1">

        {/* Add Quotation button */}
        <div className="flex justify-end">
          <Link href="/Quotations/new">
            <Button className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all">
              <PlusIcon />
              Add Quotation
            </Button>
          </Link>
        </div>

              {/* Filter and Sort Container */}
              <Card className="rounded-2xl border-border shadow-sm p-4 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Controls: Search and Status filter */}
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative w-full max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <SearchIcon />
                      </span>
                      <Input
                        id="quotation-search"
                        type="text"
                        placeholder="Search client, project or ID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 rounded-xl bg-muted/30 border-border focus-visible:ring-primary/30 h-10 text-sm"
                      />
                    </div>

                    {/* Status filter buttons */}
                    <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40">
                      {["all", "Sent", "Approved", "Draft", "Expired"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === status
                            ? "bg-white text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Controls: Sort Select */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Sort By:</span>
                    <Select value={sortBy} onValueChange={(value) => { if (value) setSortBy(value); }}>
                      <SelectTrigger className="w-[180px] rounded-xl border-border bg-white focus:ring-primary/25 h-10 text-sm">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border">
                        <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                        <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                        <SelectItem value="value-desc">Value (High to Low)</SelectItem>
                        <SelectItem value="value-asc">Value (Low to High)</SelectItem>
                        <SelectItem value="client-asc">Client (A to Z)</SelectItem>
                        <SelectItem value="client-desc">Client (Z to A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Quotations Table */}
              <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">All Quotations</CardTitle>
                    <Badge className="bg-primary/10 text-primary border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {filteredAndSorted.length} Quotes
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground w-[150px]">
                          Quotation ID
                        </TableHead>
                        <TableHead className="px-4 py-3.5 text-xs font-semibold text-muted-foreground">
                          Date
                        </TableHead>
                        <TableHead className="px-4 py-3.5 text-xs font-semibold text-muted-foreground">
                          Client
                        </TableHead>
                        <TableHead className="px-4 py-3.5 text-xs font-semibold text-muted-foreground">
                          Project
                        </TableHead>
                        <TableHead className="px-4 py-3.5 text-xs font-semibold text-muted-foreground text-right">
                          Value
                        </TableHead>
                        <TableHead className="px-4 py-3.5 text-xs font-semibold text-muted-foreground text-center">
                          Status
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-xs font-semibold text-muted-foreground text-right w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSorted.length === 0 ? (
                        <TableRow>
                          <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                            <div className="flex flex-col items-center gap-2">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                              <span className="font-medium text-base">No quotations found</span>
                              <span className="text-xs text-muted-foreground">Try adjusting your filters or search query</span>
                            </div>
                          </td>
                        </TableRow>
                      ) : (
                        filteredAndSorted.map((q) => {
                          return (
                            <TableRow
                              key={q.id}
                              className="hover:bg-accent/40 transition-colors border-b border-border/50"
                            >
                              <TableCell className="px-6 py-4 font-bold text-foreground text-xs">
                                {q.id}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-xs font-medium text-muted-foreground">
                                {q.date}
                              </TableCell>
                              <TableCell className="px-4 py-4 font-semibold text-foreground text-sm">
                                {q.client}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-xs text-muted-foreground">
                                {q.project}
                              </TableCell>
                              <TableCell className="px-4 py-4 font-bold text-foreground text-sm text-right">
                                {formatINR(q.value)}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-center">
                                <QuoteStatusBadge status={q.status} />
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link href={`/Quotations/new?id=${q.id}`}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg"
                                      aria-label="Edit"
                                    >
                                      <PencilIcon />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg"
                                    aria-label="Delete"
                                  >
                                    <TrashIcon />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
      </div>

      {/* Footer */}
      <Separator />
      <footer className="text-center py-3.5 text-xs text-muted-foreground flex-shrink-0 bg-white">
        Zyvionix Solutions © 2026. All Rights Reserved.
      </footer>
    </div>
  );
}
