"use client";

// Product Library — the master list of product models in the catalog.
// Rows are product MODELS; variants live inside each model (detail dialog).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { getUser } from "@/app/lib/auth-storage";

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
import {
  attributeDefsApi,
  deleteProduct,
  getProduct,
  listProducts,
  deleteAllProducts,
  PageMeta,
  ProductListRow,
} from "@/app/lib/catalog/api";
import type { AttributeDef, ProductModel } from "@/app/lib/catalog/types";

const PAGE_SIZE = 12;

function inr(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// ── Product detail dialog ────────────────────────────────────────────────────

function ProductDetailDialog({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ProductModel | null>(null);
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    getProduct(productId).then(async (p) => {
      setProduct(p);
      if (p) {
        const defs = await attributeDefsApi.list({
          filter: { categoryId: p.categoryId } as Partial<AttributeDef>,
          limit: 200,
        });
        setAttributeDefs(defs.items.sort((a, b) => a.sortOrder - b.sortOrder));
      }
    });
  }, [productId]);

  const attrLabel = (key: string) =>
    key.startsWith("custom:")
      ? key.slice("custom:".length)
      : attributeDefs.find((d) => d.id === key)?.name ?? key;
  const formatValue = (v: unknown) => (v === true ? "Yes" : String(v));

  return (
    <Dialog open={Boolean(productId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
        {product && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {product.name || product.modelCode || "Product Details"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {[
                  product.manufacturer?.name ?? product.manufacturerName,
                  product.series,
                  product.category?.name ?? product.categoryName,
                  product.subCategory?.name ?? product.subCategoryName,
                ]
                  .filter(Boolean)
                  .join(" › ")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Specifications */}
              {Object.keys(product.attributes).length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-2">Specifications</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
                    {Object.entries(product.attributes)
                      .filter(([, v]) => v !== null && v !== "" && v !== false)
                      .map(([defId, v]) => (
                        <p key={defId} className="text-xs">
                          <span className="text-muted-foreground">{attrLabel(defId)}: </span>
                          <span className="font-semibold">{formatValue(v)}</span>
                        </p>
                      ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <p className="text-xs font-bold mb-2">Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
                  <p className="text-xs">
                    <span className="text-muted-foreground">MRP: </span>
                    <span className="font-semibold">{inr(product.mrp)}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">GST %: </span>
                    <span className="font-semibold">{product.gstRate ?? "—"}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Discount %: </span>
                    <span className="font-semibold">{product.discountPercent ?? "—"}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Unit: </span>
                    <span className="font-semibold">{product.unit || "—"}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">HSN Code: </span>
                    <span className="font-semibold">{product.hsnCode || "—"}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Model Code: </span>
                    <span className="font-semibold">{product.modelCode || "—"}</span>
                  </p>
                </div>
              </div>

              {/* Documents / images metadata */}
              {(product.images.primary ||
                product.images.datasheet ||
                product.images.brochure ||
                product.images.manual ||
                product.images.gallery.length > 0) && (
                <div>
                  <p className="text-xs font-bold mb-2">Files</p>
                  <div className="flex flex-wrap gap-2">
                    {product.images.primary?.dataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images.primary.dataUrl}
                        alt={product.modelCode || "Product Image"}
                        className="h-20 w-20 rounded-xl object-cover border border-border"
                      />
                    )}
                    {(
                      [
                        product.images.primary && !product.images.primary.dataUrl
                          ? { label: "Primary image", meta: product.images.primary }
                          : null,
                        product.images.datasheet
                          ? { label: "Datasheet", meta: product.images.datasheet }
                          : null,
                        product.images.brochure
                          ? { label: "Brochure", meta: product.images.brochure }
                          : null,
                        product.images.manual
                          ? { label: "Manual", meta: product.images.manual }
                          : null,
                        ...product.images.gallery.map((g) => ({ label: "Gallery", meta: g })),
                      ].filter(Boolean) as { label: string; meta: { name: string } }[]
                    ).map((f, i) => (
                        <Badge
                          key={i}
                          className="bg-muted text-muted-foreground border-0 rounded-full font-medium"
                        >
                          {f.label}: {f.meta.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductLibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductListRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProductListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);

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
      const result = await listProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        scope: "global",
      });
      setItems(result.items);
      setMeta(result.meta);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteProduct(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && items.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      items.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteBusy(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteProduct(id)));
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected products");
      setBulkDeleteOpen(false);
    } finally {
      setBulkDeleteBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    const result = await Swal.fire({
      title: "Delete ALL Materials?",
      text: "This will permanently delete ALL materials in the database, ignoring pagination and filters. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete everything!"
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteAllProducts();
        Swal.fire({
          title: "Deleted!",
          text: "All materials have been deleted.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
        setPage(1);
        setSelectedIds(new Set());
        load();
      } catch (err) {
        Swal.fire(
          "Error!",
          err instanceof Error ? err.message : "Failed to delete all products",
          "error"
        );
        setLoading(false);
      }
    }
  };

  return (
    <div className="px-7 py-6 space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search product, SKU, barcode, series"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-white border-border focus-visible:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {getUser()?.roles.includes("SUPERADMIN") && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              className="gap-2 rounded-xl h-10 px-4 font-semibold mr-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-2 rounded-xl h-10 px-4 font-semibold"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
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
            onClick={() => router.push("/superadmin/Materials/new")}
            className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-md shadow-primary/25 bg-primary text-white hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {/* Table */}
      <Card className="rounded-2xl shadow-sm border-border overflow-hidden bg-white p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10 pl-5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </TableHead>
              <TableHead className="font-bold text-xs">Product</TableHead>
              <TableHead className="font-bold text-xs">Manufacturer</TableHead>
              <TableHead className="font-bold text-xs">Series</TableHead>
              <TableHead className="font-bold text-xs">Category</TableHead>
              <TableHead className="font-bold text-xs text-right">MRP</TableHead>
              <TableHead className="font-bold text-xs">Status</TableHead>
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
                <TableCell colSpan={9} className="text-center py-14">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch
                      ? `No materials match "${debouncedSearch}"`
                      : "No materials yet. Click Add Product to launch the upload wizard."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => {
                const isGlobal = !p.tenantId;
                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="pl-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        disabled={isGlobal}
                        aria-label={`Select ${p.name || p.modelCode}`}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-30"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm font-semibold">{p.name || p.modelCode || "—"}</p>
                      {p.name && p.modelCode && (
                        <p className="text-xs text-muted-foreground">{p.modelCode}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold max-w-[220px] truncate" title={p.manufacturer?.name ?? p.manufacturerName ?? "—"}>
                          {p.manufacturer?.name ?? p.manufacturerName ?? "—"}
                        </p>
                        {isGlobal && (
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                            Global
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.series ?? "—"}</TableCell>
                    <TableCell>
                      {p.category?.name ?? p.categoryName ? (
                        <Badge className="bg-[#6c63ff]/12 text-[#6c63ff] border-0 font-semibold rounded-full px-3 whitespace-nowrap">
                          {p.category?.name ?? p.categoryName}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                      {p.mrp != null ? inr(p.mrp) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 border-0 rounded-full text-[10px]"
                            : "bg-slate-200 text-slate-600 border-0 rounded-full text-[10px]"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewing(p.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                          aria-label={`View ${p.name || p.modelCode}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/superadmin/Materials/new?id=${p.id}`)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                          aria-label={`Edit ${p.name || p.modelCode}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isGlobal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(p)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                            aria-label={`Delete ${p.name || p.modelCode}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {meta && meta.totalItems > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems} products
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

      <ProductDetailDialog productId={viewing} onClose={() => setViewing(null)} />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name || deleting?.modelCode}</span>? This cannot be undone.
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

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Delete {selectedIds.size} Product{selectedIds.size === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will permanently delete {selectedIds.size} selected product
              {selectedIds.size === 1 ? "" : "s"} and all of their variants. This cannot be undone.
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
              className="rounded-xl"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteBusy}
            >
              {bulkDeleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
