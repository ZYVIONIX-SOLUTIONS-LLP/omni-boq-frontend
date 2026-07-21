// ─────────────────────────────────────────────────────────────────────────────
// Catalog API — talks to the NestJS backend over HTTP. Same async signatures
// the localStorage mock exposed, with one necessary change: EntityStore.all()
// is now async (it used to be a synchronous localStorage read, which a real
// network call can't be) — every call site was updated to await it.
// ─────────────────────────────────────────────────────────────────────────────

import { apiDelete, apiGet, apiPatch, apiPost, PageMeta, toQueryString } from "../api/client";
import type {
  AttributeDef,
  BaseEntity,
  CatalogCategory,
  Division,
  HsnCode,
  Manufacturer,
  ProductModel,
  ProductSeries,
  ProductWithVariants,
  SubCategory,
  TaxRate,
  UnitDef,
  Variant,
  VariantStatus,
} from "./types";

export type { PageMeta };

export interface ListParams<T> {
  page?: number;
  limit?: number;
  search?: string;
  /** Exact-match filters, e.g. { manufacturerId: "mfr-rr" }. Empty values are ignored. */
  filter?: Partial<T>;
  includeInactive?: boolean;
}

export interface EntityStore<T extends BaseEntity> {
  /** Fetches every active record (paginated fetch under the hood, page size 5000). */
  all(): Promise<T[]>;
  list(params?: ListParams<T>): Promise<{ items: T[]; meta: PageMeta }>;
  get(id: string): Promise<T | null>;
  create(data: Partial<T> & { name: string }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

function makeStore<T extends BaseEntity>(basePath: string): EntityStore<T> {
  return {
    async all() {
      const { items } = await this.list({ limit: 5000, includeInactive: true });
      return items;
    },

    list(params = {}) {
      const query = toQueryString({
        page: params.page,
        limit: params.limit,
        search: params.search,
        includeInactive: params.includeInactive,
        ...(params.filter as Record<string, unknown> | undefined),
      });
      return apiGet<{ items: T[]; meta: PageMeta }>(`${basePath}${query}`);
    },

    get(id) {
      return apiGet<T | null>(`${basePath}/${id}`);
    },

    create(data) {
      return apiPost<T>(basePath, data);
    },

    update(id, patch) {
      return apiPatch<T>(`${basePath}/${id}`, patch);
    },

    remove(id) {
      return apiDelete<void>(`${basePath}/${id}`);
    },
  };
}

// ── Hierarchy stores ─────────────────────────────────────────────────────────

export const manufacturersApi = makeStore<Manufacturer>("/catalog/manufacturers");
export const divisionsApi = makeStore<Division>("/catalog/divisions");
export const seriesApi = makeStore<ProductSeries>("/catalog/series");
export const categoriesApi = makeStore<CatalogCategory>("/catalog/categories");
export const subCategoriesApi = makeStore<SubCategory>("/catalog/sub-categories");
export const attributeDefsApi = makeStore<AttributeDef>("/catalog/attribute-defs");

// ── Reference data stores ────────────────────────────────────────────────────

export const unitsApi = makeStore<UnitDef>("/catalog/units");
export const taxRatesApi = makeStore<TaxRate>("/catalog/tax-rates");
export const hsnCodesApi = makeStore<HsnCode>("/catalog/hsn-codes");

// ── Products & variants ──────────────────────────────────────────────────────

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  manufacturerId?: string;
  categoryId?: string;
  seriesId?: string;
}

export interface VariantSummary {
  id: string;
  name: string;
  modelCode: string | null;
  mrp: number | null;
  gstRate: number | null;
  status: VariantStatus;
}

export interface ProductListRow extends ProductModel {
  /** Lightweight per-variant info for the list table — name + its own model code. */
  variantSummaries: VariantSummary[];
  variantCount: number;
  /** Lowest / highest variant MRP for the price-range column. */
  minMrp: number | null;
  maxMrp: number | null;
}

export function listProducts(
  params: ListProductsParams = {}
): Promise<{ items: ProductListRow[]; meta: PageMeta }> {
  return apiGet(`/catalog/products${toQueryString(params)}`);
}

/** Does a catalog variant's display name plausibly match a free-text
 *  requirement description (e.g. "FR Wire 1.5 sq.mm" -> "1.5 sq.mm")?
 *  Pulls a size/rating keyword out of the requirement text (sq.mm, mm,
 *  Module, Way, Step) and substring-matches it against the variant name;
 *  falls back to the requirement's first two words if no keyword pattern
 *  is found. Used to auto-resolve an Activity's generic material
 *  requirements to a specific brand's variant. Pure string matching, no
 *  data dependency, so it stays client-side unchanged. */
export function matchesSpecKeyword(variantName: string, requirementDescription: string): boolean {
  const specPatterns = [
    /\d+(\.\d+)?\s*sq\.?\s*mm/i,
    /\d+(\.\d+)?\s*mm/i,
    /\d+\s*Module/i,
    /\d+\s*way/i,
    /\d+\s*Step/i,
  ];
  let reqKeyword = "";
  for (const pat of specPatterns) {
    const match = requirementDescription.match(pat);
    if (match) {
      reqKeyword = match[0];
      break;
    }
  }
  if (!reqKeyword) {
    reqKeyword = requirementDescription.split(" ").slice(0, 2).join(" ");
  }
  const v = variantName.toLowerCase();
  const kw = reqKeyword.toLowerCase();
  return v.includes(kw) || v.includes(kw.replace(/\s+/g, ""));
}

export interface ProductExportRow {
  modelCode: string;
  productName: string;
  variantName: string;
  manufacturer: string;
  series: string;
  category: string;
  subCategory: string;
  unit: string;
  hsnCode: string;
  gstRate: number | null;
  mrp: number | null;
  dealer: number | null;
  distributor: number | null;
  contractor: number | null;
  purchase: number | null;
  status: VariantStatus;
  specifications: string;
}

/** Flat, unpaginated rows (one per variant, matching the Product Library's
 *  own row shape) for exporting the full catalog — same filters as
 *  listProducts, but every matching row instead of one page. Specifications
 *  are formatted server-side (backend has the AttributeDef join). */
export function exportProductRows(
  params: Pick<ListProductsParams, "search" | "manufacturerId" | "categoryId" | "seriesId"> = {}
): Promise<ProductExportRow[]> {
  return apiGet(`/catalog/products/export${toQueryString(params)}`);
}

export function getProduct(id: string): Promise<ProductWithVariants | null> {
  return apiGet(`/catalog/products/${id}`);
}

export type VariantInput = Omit<Variant, "id" | "productId" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type ProductInput = Omit<ProductModel, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

/** Create or update a product model together with its full variant list.
 *  Denormalised name refs (manufacturer/division/series/category/subCategory/
 *  unitName) are resolved server-side now, so the input doesn't need them. */
export function saveProduct(
  input: ProductInput,
  variantInputs: VariantInput[]
): Promise<ProductWithVariants> {
  const body = { ...input, variants: variantInputs };
  return input.id ? apiPatch(`/catalog/products/${input.id}`, body) : apiPost(`/catalog/products`, body);
}

export function deleteProduct(id: string): Promise<void> {
  return apiDelete(`/catalog/products/${id}`);
}

/** Counts for the management dashboards (e.g. products per manufacturer). */
export async function countProductsBy(
  field: "manufacturerId" | "categoryId" | "seriesId"
): Promise<Map<string, number>> {
  const { items } = await listProducts({ limit: 5000 });
  const counts = new Map<string, number>();
  for (const p of items) {
    const key = p[field];
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
