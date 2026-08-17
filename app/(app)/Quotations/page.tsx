"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  List,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

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
  createQuotationWithClient,
  getDisplayStatus,
} from "@/app/lib/api/quotations";
import { getUser } from "@/app/lib/auth-storage";
import QuotationCreateDialog from "./quotation-create-dialog";

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700 border-slate-300",
  FINAL: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  SENT: "bg-sky-100 text-sky-700 border-sky-300",
  ACCEPTED: "bg-purple-100 text-purple-700 border-purple-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  EXPIRED: "bg-amber-100 text-amber-700 border-amber-300",
};

function StatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[11px] font-bold border ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status === "FINAL" && <Lock className="w-3 h-3 text-emerald-700" />}
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
  const [viewMode, setViewMode] = useState<"directory" | "list">("directory");

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

  // Save As Revision Dialog
  const [revisionTarget, setRevisionTarget] = useState<Quotation | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [savingRevision, setSavingRevision] = useState(false);

  // Folder collapse toggle state
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const currentUser = getUser();
  const isStaff = currentUser?.roles?.[0] === "STAFF";

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

  const openSaveAsRevision = (q: Quotation) => {
    setRevisionTarget(q);
    setRevisionNote(`After negotiation meeting on ${new Date().toLocaleDateString("en-IN")}`);
  };

  const confirmSaveAsRevision = async () => {
    if (!revisionTarget) return;
    setSavingRevision(true);
    try {
      const defaultNote =
        revisionNote.trim() || `After negotiation meeting on ${new Date().toLocaleDateString("en-IN")}`;

      const newQ = await createQuotationWithClient({
        clientName: revisionTarget.customer?.name || "Client",
        clientPhone: revisionTarget.customer?.phone || undefined,
        clientAddress: revisionTarget.customer?.address || undefined,
        projectName: revisionTarget.project?.name || "Project",
        parentQuotationId: revisionTarget.id,
        revisionNote: defaultNote,
      });

      // Clone items & sheet data
      const sheetDataObj =
        revisionTarget.sheetData && typeof revisionTarget.sheetData === "object"
          ? { ...revisionTarget.sheetData }
          : {};

      await updateQuotation(newQ.id, {
        sheetData: {
          ...sheetDataObj,
          parentQuotationId: revisionTarget.id,
          revisionNote: defaultNote,
        },
        activityRows: revisionTarget.activityRows,
        activityCustomizations: revisionTarget.activityCustomizations,
        brandPreferences: revisionTarget.brandPreferences,
        items: revisionTarget.items && revisionTarget.items.length > 0
          ? revisionTarget.items.map((it, idx) => ({
              id: it.id || `item-${idx}`,
              description: it.description,
              unit: it.unit as any,
              quantity: Number(it.quantity) || 0,
              rate: Number(it.rate) || 0,
              discountPct: Number(it.discountPct) || 0,
              profitPct: Number(it.profitPct) || 0,
              taxRate: Number(it.taxRate) || 0,
              amount: Number(it.amount) || 0,
              sortOrder: it.sortOrder ?? idx,
            }))
          : [],
      });

      setRevisionTarget(null);
      openQuotation(newQ.id);
    } catch (err) {
      console.error("Save as revision failed", err);
    } finally {
      setSavingRevision(false);
    }
  };

  // Group quotations into Directory Folders by Project / Client
  const directoryGroups = useMemo(() => {
    const map = new Map<string, { folderKey: string; projectName: string; clientName: string; quotations: Quotation[] }>();

    items.forEach((q) => {
      const projName = q.project?.name || "Unassigned Project";
      const clientName = q.customer?.name || "General Client";
      const key = `${projName}:::${clientName}`.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          folderKey: key,
          projectName: projName,
          clientName: clientName,
          quotations: [],
        });
      }
      map.get(key)!.quotations.push(q);
    });

    return Array.from(map.values());
  }, [items]);

  const filteredDirectoryGroups = useMemo(() => {
    if (!search.trim()) return directoryGroups;
    const s = search.toLowerCase().trim();

    return directoryGroups
      .map((group) => {
        const matchesGroup =
          group.projectName.toLowerCase().includes(s) || group.clientName.toLowerCase().includes(s);
        const matchingQuotations = group.quotations.filter(
          (q) =>
            q.code.toLowerCase().includes(s) ||
            (q.revisionNote && q.revisionNote.toLowerCase().includes(s))
        );

        if (matchesGroup) return group;
        if (matchingQuotations.length > 0) {
          return { ...group, quotations: matchingQuotations };
        }
        return null;
      })
      .filter(Boolean) as typeof directoryGroups;
  }, [directoryGroups, search]);

  const toggleFolder = (key: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [key]: !prev[key] }));
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
            className="font-bold text-purple-700 hover:text-purple-900 hover:underline text-left flex items-center gap-1.5"
            onClick={() => p.data && openQuotation(p.data.id)}
          >
            {p.data?.parentQuotationId && <GitBranch className="w-3.5 h-3.5 text-amber-600" />}
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
        width: 140,
        cellRenderer: (p: ICellRendererParams<Quotation>) =>
          p.data ? <StatusBadge status={getDisplayStatus(p.data)} /> : null,
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
                <DropdownMenuItem onClick={() => p.data && openSaveAsRevision(p.data)}>
                  <Copy className="h-3.5 w-3.5 text-amber-600" />
                  Save As Revision
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
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search code, client, project, revision..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none bg-white/80 backdrop-blur-xs border-purple-200/80 focus-visible:ring-purple-500 shadow-xs text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-purple-100/80 p-0.5 rounded-none border border-purple-200/80">
            <button
              onClick={() => setViewMode("directory")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all ${
                viewMode === "directory"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-purple-900 hover:text-purple-950"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Directory View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-purple-900 hover:text-purple-950"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              All List View
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-none border-purple-200/80 bg-white/80 backdrop-blur-xs hover:bg-purple-50 text-slate-700 h-9 w-9 shadow-xs"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-none h-9 px-4 font-bold shadow-md bg-purple-700 text-white hover:bg-purple-800 transition-all text-xs"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-none px-4 py-3 border border-red-200 font-medium">
          {error}
        </p>
      )}

      {/* Main Quotation View Area */}
      {viewMode === "directory" ? (
        /* ── DIRECTORY TREE VIEW ── */
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center text-sm text-slate-500 bg-white/80 border-purple-200">
              Loading Directory Structure...
            </Card>
          ) : filteredDirectoryGroups.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-500 bg-white/80 border-purple-200">
              No quotation directories found.
            </Card>
          ) : (
            filteredDirectoryGroups.map((group) => {
              const isCollapsed = collapsedFolders[group.folderKey];
              return (
                <Card
                  key={group.folderKey}
                  className="rounded-none border border-purple-200 bg-white/90 shadow-sm overflow-hidden"
                >
                  {/* Directory Folder Header */}
                  <div
                    onClick={() => toggleFolder(group.folderKey)}
                    className="flex items-center justify-between px-4 py-3 bg-purple-50/80 hover:bg-purple-100/70 border-b border-purple-200/80 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-purple-700" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-700" />
                      )}
                      <FolderOpen className="w-5 h-5 text-purple-700 fill-purple-200" />
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          Project: {group.projectName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          Client: <span className="text-purple-900">{group.clientName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-purple-200/70 text-purple-900">
                        {group.quotations.length}{" "}
                        {group.quotations.length === 1 ? "Quotation / Revision" : "Quotations / Revisions"}
                      </span>
                    </div>
                  </div>

                  {/* Folder Contents (Quotation Directory Tree) */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {group.quotations.map((q) => {
                        const note = q.revisionNote || (q.sheetData && typeof q.sheetData === 'object' ? (q.sheetData as any).revisionNote : null);
                        const parentId = q.parentQuotationId || (q.sheetData && typeof q.sheetData === 'object' ? (q.sheetData as any).parentQuotationId : null);
                        const isRevision = Boolean(parentId || note);
                        const isFinalLocked = isStaff && (q.status === "FINAL" || q.status === "SENT" || q.status === "ACCEPTED");

                        return (
                          <div
                            key={q.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-6 gap-3 transition-colors ${
                              isRevision ? "bg-amber-50/30 hover:bg-amber-50/60 pl-10" : "hover:bg-slate-50/80"
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              {isRevision ? (
                                <GitBranch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
                              )}

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <button
                                    onClick={() => openQuotation(q.id)}
                                    className="font-bold text-sm text-purple-800 hover:text-purple-950 hover:underline text-left"
                                  >
                                    {q.code}
                                  </button>
                                  <StatusBadge status={getDisplayStatus(q)} />

                                  {note && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                      <Sparkles className="w-3 h-3 text-amber-600" />
                                      {note}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-500 font-medium">
                                  Created: {new Date(q.createdAt).toLocaleDateString("en-IN")} • Amount:{" "}
                                  <span className="font-bold text-slate-900">{inr(q.grandTotal)}</span>
                                </p>
                              </div>
                            </div>

                            {/* Directory Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openQuotation(q.id)}
                                className="h-8 text-xs font-semibold border-purple-200 hover:bg-purple-50 text-purple-900 rounded-none"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                {isFinalLocked ? "View" : "Open / Edit"}
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-none text-slate-400 hover:text-purple-700 hover:bg-purple-50"
                                      aria-label="More options"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openQuotation(q.id)}>
                                    <Eye className="h-3.5 w-3.5" />
                                    View Quotation
                                  </DropdownMenuItem>
                                  {!isStaff && (
                                    <DropdownMenuItem onClick={() => openEdit(q)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit Details
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => openSaveAsRevision(q)}>
                                    <Copy className="h-3.5 w-3.5 text-amber-600" />
                                    Save As Revision (Negotiation)
                                  </DropdownMenuItem>
                                  {!isStaff && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => setDeleting(q)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* ── ALL LIST VIEW (AG GRID) ── */
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
      )}

      {/* Create Dialog */}
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

      {/* Save As Revision Dialog */}
      <Dialog open={Boolean(revisionTarget)} onOpenChange={(open) => !open && setRevisionTarget(null)}>
        <DialogContent className="max-w-md bg-white border border-amber-200 rounded-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-600" />
              Save As Revision (Post Negotiation)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new revision copy of quotation <span className="font-bold text-slate-900">{revisionTarget?.code}</span> after negotiation meeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Revision Note / Meeting Title *
              </label>
              <Input
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="e.g. After negotiation meeting on 13/08/2026"
                className="text-xs h-10 rounded-none border-amber-200 bg-white focus-visible:ring-amber-500 font-medium"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded-none space-y-1">
              <p className="font-bold">Project: {revisionTarget?.project?.name}</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                The new revision will be grouped in the Directory Tree under this project and start in <span className="font-bold">DRAFT</span> status.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-slate-300"
              onClick={() => setRevisionTarget(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSaveAsRevision}
              disabled={savingRevision}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-md"
            >
              {savingRevision ? "Creating Revision..." : "Save As Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
