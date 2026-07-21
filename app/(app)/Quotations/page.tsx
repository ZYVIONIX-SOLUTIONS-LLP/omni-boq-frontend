"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, FileText, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appGridTheme } from "@/components/ui/ag-grid-theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listQuotations,
  Quotation,
  QuotationStatus,
  deleteQuotation,
  updateQuotation,
} from "@/app/lib/api/quotations";
import QuotationCreateDialog from "./quotation-create-dialog";

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SENT: "bg-sky-100 text-sky-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function inr(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editClientAddress, setEditClientAddress] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listQuotations({ limit: 500 });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openQuotation = useCallback(
    (id: string) => router.push(`/Quotations/${id}`),
    [router]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteQuotation(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quotation");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEdit = (q: Quotation) => {
    setEditing(q);
    setEditClientName(q.customer?.name ?? "");
    setEditClientPhone(q.customer?.phone ?? "");
    setEditClientAddress(q.customer?.address ?? "");
    setEditProjectName(q.project?.name ?? "");
    setEditError("");
  };

  const confirmEdit = async () => {
    if (!editing) return;
    if (!editClientName.trim() || !editProjectName.trim()) {
      setEditError("Client name and project name are required");
      return;
    }
    setEditBusy(true);
    setEditError("");
    try {
      await updateQuotation(editing.id, {
        customer: {
          name: editClientName.trim(),
          phone: editClientPhone.trim() || undefined,
          address: editClientAddress.trim() || undefined,
        },
        project: { name: editProjectName.trim() },
      } as Partial<Quotation>);
      setEditing(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update quotation");
    } finally {
      setEditBusy(false);
    }
  };

  const columnDefs = useMemo<ColDef<Quotation>[]>(
    () => [
      {
        field: "code",
        headerName: "Quotation #",
        flex: 1,
        minWidth: 140,
        cellClass: "font-semibold",
        cellRenderer: (p: ICellRendererParams<Quotation>) => (
          <button
            className="font-semibold text-primary hover:underline text-left"
            onClick={() => p.data && openQuotation(p.data.id)}
          >
            {p.value}
          </button>
        ),
      },
      {
        headerName: "Client",
        flex: 1.4,
        minWidth: 160,
        valueGetter: (p) => p.data?.customer?.name ?? "—",
      },
      {
        headerName: "Project",
        flex: 1.6,
        minWidth: 180,
        valueGetter: (p) => p.data?.project?.name ?? "—",
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        cellRenderer: (p: ICellRendererParams<Quotation>) =>
          p.value ? <StatusBadge status={p.value} /> : null,
      },
      {
        headerName: "Grand Total",
        field: "grandTotal",
        width: 150,
        type: "rightAligned",
        cellClass: "font-semibold",
        valueFormatter: (p) => inr(p.value),
      },
      {
        headerName: "Created",
        field: "createdAt",
        width: 130,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-IN") : "—"),
      },
      {
        headerName: "",
        width: 70,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<Quotation>) => (
          <div className="flex items-center h-full">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => p.data && openQuotation(p.data.id)}>
                  <Eye className="h-3.5 w-3.5" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => p.data && openEdit(p.data)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => p.data && setDeleting(p.data)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [openQuotation]
  );

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search code, client, project"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-xl border-border h-10 w-10 bg-white"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all animate-all"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        {loading ? (
          <p className="text-center py-14 text-sm text-muted-foreground">Loading quotations...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No quotations yet. Click New Quotation to create the first one.
            </p>
          </div>
        ) : (
          <div className="p-2">
            <AgGridReact
              theme={appGridTheme}
              rowData={items}
              columnDefs={columnDefs}
              quickFilterText={search}
              domLayout="autoHeight"
              rowHeight={44}
              headerHeight={38}
              animateRows
              suppressCellFocus
              onRowDoubleClicked={(e) => e.data && openQuotation(e.data.id)}
            />
          </div>
        )}
      </Card>

      <QuotationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openQuotation(id)}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Quotation</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete quotation <span className="font-semibold text-foreground">{deleting?.code}</span> for{" "}
              <span className="font-semibold text-foreground">{deleting?.customer?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit quotation */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Quotation</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the client and project details for{" "}
              <span className="font-semibold text-foreground">{editing?.code}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Client Name *</label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                className="rounded-xl border-border h-10 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Phone</label>
              <Input
                value={editClientPhone}
                onChange={(e) => setEditClientPhone(e.target.value)}
                className="rounded-xl border-border h-10 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Project Name *</label>
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="rounded-xl border-border h-10 bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Address</label>
              <Input
                value={editClientAddress}
                onChange={(e) => setEditClientAddress(e.target.value)}
                className="rounded-xl border-border h-10 bg-white"
              />
            </div>
            {editError && <p className="text-xs text-red-500 font-medium">{editError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditing(null)}
              disabled={editBusy}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-white hover:bg-primary/95"
              onClick={confirmEdit}
              disabled={editBusy}
            >
              {editBusy ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
