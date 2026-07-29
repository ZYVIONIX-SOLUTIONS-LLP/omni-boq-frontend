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
  Manufacturer,
  ProductModel,
  ProductStatus,
  SubCategory,
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
export const categoriesApi = makeStore<CatalogCategory>("/catalog/categories");
export const subCategoriesApi = makeStore<SubCategory>("/catalog/sub-categories");
export const attributeDefsApi = makeStore<AttributeDef>("/catalog/attribute-defs");

// ── Products & variants ──────────────────────────────────────────────────────

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  manufacturerId?: string;
  categoryId?: string;
  seriesId?: string;
  scope?: 'global' | 'local' | 'all';
}

export interface ProductListRow extends ProductModel {}

export function listProducts(
  params: ListProductsParams = {}
): Promise<{ items: ProductListRow[]; meta: PageMeta }> {
  return apiGet(`/catalog/products${toQueryString(params)}`);
}

/** Does a catalog item's series or model code plausibly match a free-text
 *  requirement description? */
export function matchesSpecKeyword(productName: string, requirementDescription: string): boolean {
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
  const v = productName.toLowerCase();
  const kw = reqKeyword.toLowerCase();
  return v.includes(kw) || v.includes(kw.replace(/\s+/g, ""));
}

export interface ProductExportRow {
  modelCode: string;
  manufacturer: string;
  series: string;
  voltageClass: string;
  category: string;
  subCategory: string;
  color: string;
  unit: string;
  hsnCode: string;
  gstRate: number | null;
  mrp: number | null;
  discountPercent: number | null;
  status: ProductStatus;
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

export function getProduct(id: string): Promise<ProductModel | null> {
  return apiGet(`/catalog/products/${id}`);
}

export type ProductInput = Omit<ProductModel, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export function saveProduct(
  input: ProductInput
): Promise<ProductModel> {
  return input.id ? apiPatch(`/catalog/products/${input.id}`, input) : apiPost(`/catalog/products`, input);
}

export function deleteProduct(id: string): Promise<void> {
  return apiDelete(`/catalog/products/${id}`);
}

export function deleteAllProducts(): Promise<void> {
  return apiDelete(`/catalog/products/all`);
}

/** Counts for the management dashboards (e.g. products per manufacturer). */
export async function countProductsBy(
  field: "manufacturerId" | "categoryId"
): Promise<Map<string, number>> {
  const { items } = await listProducts({ limit: 5000 });
  const counts = new Map<string, number>();
  for (const p of items) {
    const key = p[field];
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
