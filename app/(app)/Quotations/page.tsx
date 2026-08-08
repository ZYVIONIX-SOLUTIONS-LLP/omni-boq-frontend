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
      className={`inline-flex items-center rounded-none px-2.5 py-0.5 text-[11px] font-semibold border border-purple-200/80 shadow-2xs ${STATUS_STYLES[status]}`}
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
            className="font-bold text-purple-700 hover:text-purple-900 hover:underline text-left"
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
                    className="h-7 w-7 rounded-none text-slate-400 hover:text-purple-700 hover:bg-purple-50"
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
    <div className="p-6 space-y-5 bg-slate-50/60 min-h-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search code, client, project"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none bg-white/80 backdrop-blur-xs border-purple-200/80 focus-visible:ring-purple-500 shadow-xs text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-none border-purple-200/80 bg-white/80 backdrop-blur-xs hover:bg-purple-50 text-slate-700 h-10 w-10 shadow-xs"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-none h-10 px-4 font-semibold shadow-md bg-purple-700 text-white hover:bg-purple-800 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-none px-4 py-3 border border-red-200 font-medium">{error}</p>}

      <Card className="rounded-none border border-purple-300/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(124,58,237,0.12)] overflow-hidden p-0">
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
        onCreated={(id, mode) => {
          if (mode === "ai") {
            router.push(`/Quotations/${id}/ai`);
          } else {
            openQuotation(id);
          }
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-none border border-purple-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Quotation</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Delete quotation <span className="font-semibold text-slate-900">{deleting?.code}</span> for{" "}
              <span className="font-semibold text-slate-900">{deleting?.customer?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-purple-200"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none bg-red-600 hover:bg-red-700 text-white"
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
        <DialogContent className="max-w-md rounded-none border border-purple-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Quotation</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Update the client and project details for{" "}
              <span className="font-semibold text-slate-900">{editing?.code}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Client Name *</label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                className="rounded-none border-purple-200 h-10 bg-white focus-visible:ring-purple-500 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Phone</label>
              <Input
                value={editClientPhone}
                onChange={(e) => setEditClientPhone(e.target.value)}
                className="rounded-none border-purple-200 h-10 bg-white focus-visible:ring-purple-500 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Project Name *</label>
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="rounded-none border-purple-200 h-10 bg-white focus-visible:ring-purple-500 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Address</label>
              <Input
                value={editClientAddress}
                onChange={(e) => setEditClientAddress(e.target.value)}
                className="rounded-none border-purple-200 h-10 bg-white focus-visible:ring-purple-500 text-xs font-semibold"
              />
            </div>
            {editError && <p className="text-xs text-red-500 font-medium">{editError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-purple-200"
              onClick={() => setEditing(null)}
              disabled={editBusy}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none bg-purple-700 text-white hover:bg-purple-800 shadow-md font-semibold"
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
