"use client";

// Product Library — the master list of product models in the catalog.
// Rows are product MODELS; variants live inside each model (detail dialog).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Download,
  Eye,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload as UploadIcon,
} from "lucide-react";
import ImportDialog from "@/components/materials/import-dialog";

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
import SearchableCombo, { ComboPage } from "@/components/ui/searchable-combo";
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
  categoriesApi,
  deleteProduct,
  exportProductRows,
  getProduct,
  listProducts,
  manufacturersApi,
  PageMeta,
  ProductListRow,
  VariantSummary,
} from "@/app/lib/catalog/api";
import type { AttributeDef, ProductWithVariants } from "@/app/lib/catalog/types";

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
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
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
              <DialogTitle className="text-lg font-bold">{product.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {[
                  product.manufacturer?.name,
                  product.division?.name,
                  product.series?.name,
                  product.category?.name,
                  product.subCategory?.name,
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

              {/* Variants + pricing */}
              <div>
                <p className="text-xs font-bold mb-2">
                  Variants ({product.variants.length})
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs font-bold">Variant</TableHead>
                        <TableHead className="text-xs font-bold">Model Code</TableHead>
                        <TableHead className="text-xs font-bold text-right">MRP</TableHead>
                        <TableHead className="text-xs font-bold text-right">GST %</TableHead>
                        <TableHead className="text-xs font-bold text-right">Disc %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-semibold whitespace-nowrap">
                            {v.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {v.modelCode || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right whitespace-nowrap">
                            {inr(v.prices.mrp)}
                          </TableCell>
                          <TableCell className="text-xs text-right">{v.gstRate ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">
                            {v.discountPercent ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                        alt={product.name}
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
  const [manufacturerFilter, setManufacturerFilter] = useState<{ id: string; name: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProductListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const manufacturerLoader = useCallback(
    async (s: string, p: number, ps: number): Promise<ComboPage> => {
      const r = await manufacturersApi.list({ search: s, page: p, limit: ps });
      return {
        items: r.items.map(({ id, name }) => ({ id, name })),
        hasMore: r.meta.hasNextPage,
      };
    },
    []
  );
  const categoryLoader = useCallback(
    async (s: string, p: number, ps: number): Promise<ComboPage> => {
      const r = await categoriesApi.list({ search: s, page: p, limit: ps });
      return {
        items: r.items.map(({ id, name }) => ({ id, name })),
        hasMore: r.meta.hasNextPage,
      };
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        manufacturerId: manufacturerFilter?.id,
        categoryId: categoryFilter?.id,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, manufacturerFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const rows = await exportProductRows({
        search: debouncedSearch || undefined,
        manufacturerId: manufacturerFilter?.id,
        categoryId: categoryFilter?.id,
      });
      const sheetRows = rows.map((r) => ({
        "Model Code": r.modelCode,
        Product: r.productName,
        Variant: r.variantName,
        Manufacturer: r.manufacturer,
        Series: r.series,
        Category: r.category,
        "Sub Category": r.subCategory,
        Unit: r.unit,
        "HSN Code": r.hsnCode,
        "GST %": r.gstRate ?? "",
        MRP: r.mrp ?? "",
        Dealer: r.dealer ?? "",
        Distributor: r.distributor ?? "",
        Contractor: r.contractor ?? "",
        Purchase: r.purchase ?? "",
        Status: r.status,
        Specifications: r.specifications,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws["!cols"] = [
        { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `product-library-${stamp}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export products");
    } finally {
      setExporting(false);
    }
  };

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

        <SearchableCombo
          className="w-[190px]"
          value={manufacturerFilter?.id ?? ""}
          valueLabel={manufacturerFilter?.name}
          placeholder="All manufacturers"
          allowClear
          loadOptions={manufacturerLoader}
          onSelect={(item) => {
            setManufacturerFilter(item);
            setPage(1);
          }}
        />

        <SearchableCombo
          className="w-[180px]"
          value={categoryFilter?.id ?? ""}
          valueLabel={categoryFilter?.name}
          placeholder="All categories"
          allowClear
          loadOptions={categoryLoader}
          onSelect={(item) => {
            setCategoryFilter(item);
            setPage(1);
          }}
        />

        <div className="flex items-center gap-2 ml-auto">
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
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 rounded-xl h-10 px-4 font-semibold border-border"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Download Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 rounded-xl h-10 px-4 font-semibold border-border"
          >
            <UploadIcon className="h-4 w-4" />
            Import Excel
          </Button>
          <Button
            onClick={() => router.push("/Materials/new")}
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
              <TableHead className="font-bold text-xs pl-5">Model Code</TableHead>
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
                <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                  Loading materials...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-14">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch
                      ? `No materials match "${debouncedSearch}"`
                      : "No materials yet. Click Add Product to launch the upload wizard."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              // Every variant is its own material line — full row, own model
              // code, no merging with siblings even when they share a product.
              items.flatMap((p) => {
                const rows: (VariantSummary | null)[] =
                  p.variantSummaries.length > 0 ? p.variantSummaries : [null];
                return rows.map((v) => (
                  <TableRow key={`${p.id}-${v?.id ?? "none"}`} className="hover:bg-muted/30">
                    <TableCell className="pl-5 text-sm font-semibold whitespace-nowrap">
                      {v?.modelCode || "—"}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold max-w-[220px] truncate" title={p.name}>
                        {p.name}
                      </p>
                      {v && (
                        <p className="text-[11px] text-muted-foreground truncate">{v.name}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{p.manufacturer?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{p.series?.name || "—"}</TableCell>
                    <TableCell>
                      {p.category?.name ? (
                        <Badge className="bg-[#6c63ff]/12 text-[#6c63ff] border-0 font-semibold rounded-full px-3 whitespace-nowrap">
                          {p.category.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold whitespace-nowrap">
                      {v?.mrp != null ? inr(v.mrp) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (v?.status ?? p.status) === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 border-0 rounded-full text-[10px]"
                            : "bg-slate-200 text-slate-600 border-0 rounded-full text-[10px]"
                        }
                      >
                        {v?.status ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewing(p.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                          aria-label={`View ${p.name}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/Materials/new?id=${p.id}`)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(p)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ));
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

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">{deleting?.name}</span> and
              its {deleting?.variantCount} variant(s)? This cannot be undone.
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
