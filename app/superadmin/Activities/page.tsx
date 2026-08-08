"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams, SelectionChangedEvent } from "ag-grid-community";
import { Copy, Hammer, Plus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import Swal from "sweetalert2";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listActivities,
  Activity,
  wiringTypeLabel,
  deleteActivity,
  deleteAllActivities,
  duplicateActivity,
} from "@/app/lib/api/activities";
import ActivityCreateDialog from "./activity-create-dialog";
import ActivityImportDialog from "@/components/activities/activity-import-dialog";
import ActivityTypesDialog from "@/components/activities/activity-types-dialog";
import { getUser } from "@/app/lib/auth-storage";

function inr(value: number | null | undefined): string {
  if (value == null) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Activity[]>([]);
  const [scope, setScope] = useState<"local" | "global">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [duplicating, setDuplicating] = useState<Activity | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [selectedRows, setSelectedRows] = useState<Activity[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listActivities({ limit: 500, scope });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const openActivity = useCallback(
    (id: string) => router.push(`/superadmin/Activities/${id}`),
    [router]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteActivity(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<Activity>) => {
    setSelectedRows(event.api.getSelectedRows());
  }, []);

  const confirmBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    setBulkDeleteBusy(true);
    try {
      await Promise.all(selectedRows.map((a) => deleteActivity(a.id)));
      setBulkDeleteOpen(false);
      setSelectedRows([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected activities");
      setBulkDeleteOpen(false);
    } finally {
      setBulkDeleteBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      title: "Delete ALL Activities?",
      text: "This will permanently delete ALL activities in the database. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete everything!"
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteAllActivities();
        Swal.fire({
          title: "Deleted!",
          text: "All activities have been deleted.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
        setSelectedRows([]);
        load();
      } catch (err) {
        Swal.fire(
          "Error!",
          err instanceof Error ? err.message : "Failed to delete all activities",
          "error"
        );
        setLoading(false);
      }
    }
  };

  const openDuplicate = (activity: Activity) => {
    setDuplicating(activity);
    setDuplicateName(`${activity.name} (Copy)`);
    setDuplicateError("");
  };

  const confirmDuplicate = async () => {
    if (!duplicating) return;
    if (!duplicateName.trim()) {
      setDuplicateError("Activity name is required");
      return;
    }
    setDuplicateBusy(true);
    setDuplicateError("");
    try {
      const created = await duplicateActivity(duplicating.id, duplicateName.trim());
      setDuplicating(null);
      openActivity(created.id);
    } catch (err) {
      setDuplicateError(err instanceof Error ? err.message : "Failed to duplicate activity");
    } finally {
      setDuplicateBusy(false);
    }
  };

  const columnDefs = useMemo<ColDef<Activity>[]>(
    () => [
      {
        field: "code",
        headerName: "Activity Code",
        flex: 1,
        minWidth: 140,
        cellClass: "font-semibold",
        cellRenderer: (p: ICellRendererParams<Activity>) => (
          <button
            className="font-semibold text-primary hover:underline text-left"
            onClick={() => p.data && openActivity(p.data.id)}
          >
            {p.value}
          </button>
        ),
      },
      {
        field: "name",
        headerName: "Activity Name",
        flex: 2,
        minWidth: 260,
      },
      {
        field: "wiringType",
        headerName: "Type",
        flex: 1,
        minWidth: 150,
        valueFormatter: (p) => (p.value ? wiringTypeLabel(p.value) : "—"),
      },
      {
        field: "category",
        headerName: "Category",
        flex: 1.2,
        minWidth: 150,
        valueFormatter: (p) => (p.value ? String(p.value) : "—"),
      },
      {
        field: "unit",
        headerName: "Unit",
        width: 100,
      },
      {
        headerName: "",
        width: 175,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<Activity>) => {
          const isGlobal = p.data && !p.data.tenantId;
          return (
          <div className="flex items-center gap-1.5 h-full">
            {isGlobal && (
              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded mr-1">Global</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-7 text-xs"
              onClick={() => p.data && openActivity(p.data.id)}
            >
              {isGlobal ? "View" : "Open"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
              onClick={() => p.data && openDuplicate(p.data)}
              aria-label="Duplicate activity"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {!isGlobal && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                onClick={() => p.data && setDeleting(p.data)}
                aria-label="Delete activity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )},
      },
    ],
    [openActivity]
  );

  return (
    <div className="px-7 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <Tabs value={scope} onValueChange={(val) => setScope(val as any)}>
          <TabsList>
            <TabsTrigger value="local" className="px-6">My Activities</TabsTrigger>
            <TabsTrigger value="global" className="px-6">Global Activities</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search code or activity name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          {getUser()?.roles.includes("SUPERADMIN") && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              className="gap-2 rounded-xl h-10 px-4 font-semibold mr-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          )}
          {selectedRows.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-2 rounded-xl h-10 px-4 font-semibold border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedRows.length})
            </Button>
          )}
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
            variant="outline"
            onClick={() => setTypesOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold border-border bg-white"
          >
            <Hammer className="h-4 w-4" />
            Manage Types
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold border-border bg-white"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            New Activity
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        {loading ? (
          <p className="text-center py-14 text-sm text-muted-foreground">Loading activities...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Hammer className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No activities yet. Click New Activity to create the first one.
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
              rowSelection={scope === "global" ? undefined : { mode: "multiRow", headerCheckbox: true, enableClickSelection: false }}
              isRowSelectable={(rowNode) => rowNode.data ? !!rowNode.data.tenantId : false}
              onSelectionChanged={onSelectionChanged}
              onRowDoubleClicked={(e) => e.data && openActivity(e.data.id)}
            />
          </div>
        )}
      </Card>

      <ActivityCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => openActivity(id)}
      />

      <ActivityImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      <ActivityTypesDialog
        open={typesOpen}
        onClose={() => setTypesOpen(false)}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Activity</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name}</span>? This cannot be undone.
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

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && !bulkDeleteBusy && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete {selectedRows.length} Activities</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete the {selectedRows.length} selected activit{selectedRows.length === 1 ? "y" : "ies"}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteBusy}
            >
              {bulkDeleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate activity */}
      <Dialog
        open={Boolean(duplicating)}
        onOpenChange={(open) => !open && !duplicateBusy && setDuplicating(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Duplicate Activity</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Creates a copy of <span className="font-semibold text-foreground">{duplicating?.name}</span> with the same materials and rates. Adjust quantities in the new activity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-semibold text-muted-foreground">New Activity Name</label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="rounded-xl border-border h-10 bg-white mt-1.5"
              autoFocus
            />
            {duplicateError && (
              <p className="text-xs text-red-500 font-medium mt-2">{duplicateError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDuplicating(null)}
              disabled={duplicateBusy}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-white hover:bg-primary/95"
              onClick={confirmDuplicate}
              disabled={duplicateBusy}
            >
              {duplicateBusy ? "Duplicating..." : "Duplicate & Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
