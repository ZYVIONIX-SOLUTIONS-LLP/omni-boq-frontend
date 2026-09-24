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
  Trash2, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Swal from "sweetalert2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/app/lib/auth-storage";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ProductFilters,
} from "@/app/lib/catalog/api";
import type { AttributeDef, ProductModel, CatalogCategory } from "@/app/lib/catalog/types";

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
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-md">
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
                        className="h-20 w-20 rounded-sm object-cover border border-slate-200"
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
  const [scope, setScope] = useState<"local" | "global">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtersData, setFiltersData] = useState<ProductFilters | null>(null);

  // Active filters for API
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [activeSeries, setActiveSeries] = useState<string>("all");
  const [activeAttributes, setActiveAttributes] = useState<Record<string, string>>({});

  // UI filters (draft)
  const [draftCategoryId, setDraftCategoryId] = useState<string>("all");
  const [draftSeries, setDraftSeries] = useState<string>("all");
  const [draftAttributes, setDraftAttributes] = useState<Record<string, string>>({});

  const handleCategoryChange = (val: string | null) => {
    if (!val) return;
    setDraftCategoryId(val);
    setDraftSeries("all");
    setDraftAttributes({});
  };

  const applyFilters = () => {
    setActiveCategoryId(draftCategoryId);
    setActiveSeries(draftSeries);
    
    const cleanedAttrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(draftAttributes)) {
      if (v !== "all") cleanedAttrs[k] = v;
    }
    setActiveAttributes(cleanedAttrs);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftCategoryId("all");
    setDraftSeries("all");
    setDraftAttributes({});
    setActiveCategoryId("all");
    setActiveSeries("all");
    setActiveAttributes({});
    setPage(1);
  };

  const selectedCategoryData = draftCategoryId !== "all" 
    ? filtersData?.categories.find(c => c.categoryId === draftCategoryId)
    : null;


  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProductListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
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
        scope,
        categoryId: activeCategoryId === "all" ? undefined : activeCategoryId,
        seriesId: activeSeries === "all" ? undefined : activeSeries,
        attributes: Object.keys(activeAttributes).length > 0 ? JSON.stringify(activeAttributes) : undefined,
      });
      setItems(result.items);
      setMeta(result.meta);
      if (result.filters) setFiltersData(result.filters);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, scope, activeCategoryId, activeSeries, activeAttributes]);

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
      items.forEach((p) => {
          const isGlobal = !p.tenantId;
          const isSuperAdmin = getUser()?.roles.includes("SUPERADMIN");
          if (!isGlobal || isSuperAdmin) next.add(p.id);
        });
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
    <div className="p-6 space-y-5 font-sans bg-slate-50/60 min-h-screen ">
      <div className="flex items-center justify-between">
        <Tabs value={scope} onValueChange={(val) => { setScope(val as any); setPage(1); }}>
          <TabsList className="bg-white/80 backdrop-blur-md border border-slate-200 p-1 rounded-none shadow-xs">
            <TabsTrigger value="local" className="px-6 rounded-none data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900  font-semibold transition-all">My Materials</TabsTrigger>
            <TabsTrigger value="global" className="px-6 rounded-none data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900  font-semibold transition-all">Global Materials</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search product, SKU, barcode, series"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none bg-white/80 backdrop-blur-xs border-slate-200 focus-visible:ring-slate-500 shadow-xs text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full mt-2 lg:mt-0 lg:w-auto">
          <Select value={draftCategoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px] h-10 bg-white/80 rounded-none border-slate-200 shadow-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {filtersData?.categories.map((c: any) => (
                <SelectItem key={c.categoryId} value={c.categoryId}>{c.categoryName || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCategoryData && (selectedCategoryData.series.length > 0 || selectedCategoryData.attributes.length > 0) && (
              <Button onClick={() => setIsSpecModalOpen(true)} variant="outline" className="h-10 rounded-none border-slate-200 bg-white/80 shadow-xs text-slate-800 font-semibold">
                Filter by Specs
              </Button>
            )}
            <Button onClick={applyFilters} className="h-8 rounded-10 bg-slate-700 hover:bg-slate-800 text-white shadow-xs">
            Filter
          </Button>
          {(draftCategoryId !== "all" || draftSeries !== "all" || Object.keys(draftAttributes).length > 0) && (
            <Button variant="outline" onClick={clearFilters} className="h-8 rounded-10 border-slate-200 text-slate-900 bg-slate-50 hover:bg-slate-100 shadow-xs">
              Clear
            </Button>
          )}
        </div>


        <div className="flex items-center gap-2 ml-auto">
          {getUser()?.roles.includes("SUPERADMIN") && (
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              className="gap-2 rounded-none h-10 px-4 font-semibold mr-2 shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-2 rounded-none h-10 px-4 font-semibold shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            className="rounded-8 border-slate-200 bg-white/80 backdrop-blur-xs hover:bg-slate-50 text-slate-700 h-8 w-10 shadow-xs"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => router.push("/Materials/new")}
            className="gap-2 rounded-8 h-8 px-4 font-semibold shadow-md bg-slate-700 text-white hover:bg-slate-800 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-sm px-4 py-3">{error}</p>}

      {/* Table */}
      <Card className="rounded-none border border-slate-300/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(124,58,237,0.12)] overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-slate-100/60 backdrop-blur-md border-b border-slate-200/90">
            <TableRow className="hover:bg-transparent">
              {!(scope === "global" && !getUser()?.roles.includes("SUPERADMIN")) && (<TableHead className="w-10 pl-5 border-r border-slate-200">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products"
                  className="h-3.5 w-3.5 rounded-none border-slate-300 text-[#163848] focus:ring-slate-500 cursor-pointer"
                />
              </TableHead>)}
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide border-r border-slate-200 py-3.5">Product</TableHead>
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide border-r border-slate-200 py-3.5">Manufacturer</TableHead>
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide border-r border-slate-200 py-3.5">Series</TableHead>
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide border-r border-slate-200 py-3.5">Category</TableHead>
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide border-r border-slate-200 text-right py-3.5">MRP</TableHead>
              <TableHead className="font-bold text-xs text-slate-950 uppercase tracking-wide text-center pr-5 py-3.5">Actions</TableHead>
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
                  <TableRow key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 bg-white/40 backdrop-blur-xs">
                    {!(scope === "global" && !getUser()?.roles.includes("SUPERADMIN")) && (<TableCell className="pl-5 border-r border-slate-200 py-2.5">
                      <input type="checkbox" disabled={!getUser()?.roles.includes("SUPERADMIN") && p.isGlobal} checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        disabled={isGlobal && !getUser()?.roles.includes("SUPERADMIN")}
                        aria-label={`Select ${p.name || p.modelCode}`}
                        className="h-3.5 w-3.5 rounded-none border-slate-300 text-[#163848] focus:ring-slate-500 cursor-pointer disabled:opacity-30"
                      />
                    </TableCell>)}
                    <TableCell className="min-w-[300px] max-w-[500px] whitespace-normal break-words border-r border-slate-200 py-2.5">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{p.name || p.modelCode || "—"}</p>
                      {p.name && p.modelCode && (
                        <p className="text-xs text-slate-500">{p.modelCode}</p>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-slate-200 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold max-w-[220px] truncate text-slate-800" title={p.manufacturer?.name ?? p.manufacturerName ?? "—"}>
                          {p.manufacturer?.name ?? p.manufacturerName ?? "—"}
                        </p>
                        {/* {isGlobal && (
                          <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded-none border border-slate-200">
                            Global
                          </span>
                        )} */}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm border-r border-slate-200 py-2.5 text-slate-700">{p.series ?? "—"}</TableCell>
                    <TableCell className="border-r border-slate-200 py-2.5">
                      {p.category?.name ?? p.categoryName ? (
                        <Badge className="bg-slate-100/80 text-slate-900 border border-slate-200 font-semibold rounded-none px-2.5 py-0.5 whitespace-nowrap shadow-2xs">
                          {p.category?.name ?? p.categoryName}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold whitespace-nowrap border-r border-slate-200 py-2.5 text-slate-900">
                      {p.mrp != null ? inr(p.mrp) : "—"}
                    </TableCell>
                    <TableCell className="pr-5 py-2.5">
                      <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-none hover:bg-slate-100/50 text-slate-500 transition-colors">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-none border-slate-200">
                            <DropdownMenuItem onClick={() => setViewing(p.id)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/Materials/new?id=${p.id}`)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            {!isGlobal && (
                              <DropdownMenuItem onClick={() => setDeleting(p)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-600 font-medium">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-slate-200 bg-white/80 backdrop-blur-xs text-xs font-semibold shadow-xs"
              disabled={!meta.hasPreviousPage || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-slate-200 bg-white/80 backdrop-blur-xs text-xs font-semibold shadow-xs"
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
        <DialogContent className="max-w-sm rounded-none border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name || deleting?.modelCode}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-slate-200"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      {/* Spec Filter Modal */}
      <Dialog open={isSpecModalOpen} onOpenChange={setIsSpecModalOpen}>
        <DialogContent className="max-w-md rounded-none border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Filter by Specifications</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {selectedCategoryData && selectedCategoryData.series.length > 0 && (
            <Select value={draftSeries} onValueChange={(val) => { if (val) setDraftSeries(val) }}>
              <SelectTrigger className="w-full h-10 bg-white/80 rounded-none border-slate-200 shadow-xs">
                <SelectValue placeholder="Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {selectedCategoryData.series.map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedCategoryData && selectedCategoryData.attributes.map((attr: any) => (
            <Select key={attr.id} value={draftAttributes[attr.id] || "all"} onValueChange={(val) => { if (val) setDraftAttributes(p => ({...p, [attr.id]: val})) }}>
              <SelectTrigger className="w-full h-10 bg-white/80 rounded-none border-slate-200 shadow-xs">
                <SelectValue placeholder={attr.name} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any {attr.name}</SelectItem>
                {attr.values.map((v: string) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none border-slate-200"
              onClick={() => setIsSpecModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none bg-slate-700 hover:bg-slate-800 text-white"
              onClick={() => { applyFilters(); setIsSpecModalOpen(false); }}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
{/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-sm rounded-md">
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
              className="rounded-sm"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-sm"
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
