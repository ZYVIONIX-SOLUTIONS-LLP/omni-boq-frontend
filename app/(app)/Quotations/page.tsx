"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageMeta } from "@/app/lib/api/client";
import { listQuotations, Quotation, QuotationStatus } from "@/app/lib/api/quotations";
import QuotationCreateDialog from "./quotation-create-dialog";

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: QuotationStatus }) {
  const styles: Record<QuotationStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-[#6c63ff]/15 text-[#6c63ff]",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-50 text-red-600",
    EXPIRED: "bg-amber-100 text-amber-700",
  };
  return (
    <Badge className={`${styles[status]} border-0 font-semibold rounded-full px-3`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

function formatMoney(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function QuotationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Quotation[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listQuotations({ page, limit: PAGE_SIZE });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-68px)]">
      <div className="px-7 py-6 space-y-5 flex-1">
        <div className="flex justify-end">
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Quotation
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-bold text-xs pl-5">Quotation</TableHead>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs">Client</TableHead>
                <TableHead className="font-bold text-xs">Project</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right pr-5">Grand Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                    Loading quotations...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                    No quotations yet. Click Add Quotation to create the first one.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((q) => (
                  <TableRow
                    key={q.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/Quotations/${q.id}`)}
                  >
                    <TableCell className="font-semibold text-sm pl-5">{q.code}</TableCell>
                    <TableCell className="text-sm">{formatDate(q.createdAt)}</TableCell>
                    <TableCell className="text-sm">{q.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate" title={q.project?.name ?? ""}>
                      {q.project?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold pr-5">
                      {formatMoney(q.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {meta && meta.totalItems > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border"
                disabled={!meta.hasPreviousPage || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-muted-foreground px-1">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border"
                disabled={!meta.hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <footer className="text-center py-3.5 text-xs text-muted-foreground flex-shrink-0 bg-white">
        Zyvionix Solutions © 2026. All Rights Reserved.
      </footer>

      <QuotationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.push(`/Quotations/${id}`)}
      />
    </div>
  );
}
