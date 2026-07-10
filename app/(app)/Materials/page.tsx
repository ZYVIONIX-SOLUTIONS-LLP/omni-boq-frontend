"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageMeta } from "@/app/lib/api/client";
import { deleteMaterial, listMaterials, Material } from "@/app/lib/api/materials";
import MaterialFormDialog from "./material-form-dialog";

const PAGE_SIZE = 10;

// Stable-ish color per category name (hash into a fixed palette)
const BADGE_PALETTE = [
  "bg-[#6c63ff]/15 text-[#6c63ff]",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-slate-200 text-slate-700",
  "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];
function CategoryBadge({ name }: { name?: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % BADGE_PALETTE.length;
  return (
    <Badge
      className={`${BADGE_PALETTE[hash]} border-0 font-semibold rounded-full px-3 whitespace-nowrap`}
    >
      {name}
    </Badge>
  );
}

function formatPrice(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  if (!num) return "—";
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** One-line technical summary per category, e.g. "1.5 sq.mm · 1C · FRLS-H" */
function specSummary(m: Material): string {
  const parts: string[] = [];
  if (m.sizeSqmm) parts.push(`${Number(m.sizeSqmm)} sq.mm`);
  if (m.coreCount) parts.push(`${m.coreCount}C`);
  if (m.insulationType) parts.push(m.insulationType);
  if (!parts.length && m.currentRatingAmps) parts.push(`${Number(m.currentRatingAmps)}A`);
  if (!parts.length && m.voltageGrade) parts.push(m.voltageGrade);
  return parts.join(" · ") || "—";
}

export default function MaterialsPage() {
  const [items, setItems] = useState<Material[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Debounce search input → server query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listMaterials({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load materials");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (material: Material) => {
    setEditing(material);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteMaterial(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete material");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="px-7 py-6 space-y-5">
      {/* ── Toolbar: search + add ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search code, name, brand, series"
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
            className="rounded-xl border-border h-10 w-10"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={openAdd}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* ── Table ── */}
      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-bold text-xs pl-5">Code</TableHead>
              <TableHead className="font-bold text-xs">Name</TableHead>
              <TableHead className="font-bold text-xs">Category</TableHead>
              <TableHead className="font-bold text-xs">Brand</TableHead>
              <TableHead className="font-bold text-xs">Series</TableHead>
              <TableHead className="font-bold text-xs">Spec</TableHead>
              <TableHead className="font-bold text-xs">Unit</TableHead>
              <TableHead className="font-bold text-xs text-right">Unit Price</TableHead>
              <TableHead className="font-bold text-xs text-center pr-5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  Loading materials...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  {debouncedSearch
                    ? `No materials match "${debouncedSearch}"`
                    : "No materials yet. Click Add Material to create the first one."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-sm pl-5">{m.code}</TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate" title={m.name}>
                    {m.name}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge name={m.category?.name} />
                  </TableCell>
                  <TableCell className="text-sm">{m.brand?.name || "—"}</TableCell>
                  <TableCell className="text-sm">{m.series || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{specSummary(m)}</TableCell>
                  <TableCell className="text-sm">{m.unit}</TableCell>
                  <TableCell className="text-sm text-right font-semibold">
                    {formatPrice(m.unitPrice)}
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                        aria-label={`Edit ${m.code}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(m)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                        aria-label={`Delete ${m.code}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Pagination ── */}
      {meta && meta.totalItems > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems} materials
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

      {/* ── Add / Edit dialog ── */}
      <MaterialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        material={editing}
        onSaved={load}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Material</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.code}</span> —{" "}
              {deleting?.name}? This cannot be undone.
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
              className="rounded-xl"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
