// ─────────────────────────────────────────────────────────────────────────────
// Bulk Excel import for the Product Library. Round-trips with the "Download
// Excel" export (same columns, plus a free-text Specifications column) so a
// user can export, edit thousands of rows in a real spreadsheet, and
// re-upload — without bypassing the same name-to-id resolution the one-by-
// one wizard relies on for referential integrity.
//
// Two-phase flow, both driven by the same `resolveRow` logic so validation
// and commit can never disagree about what a row will do:
//   1. validateImportRows  — read-only "dry run", classifies every row and
//      lists which master records (manufacturer/series/category/...) don't
//      exist yet, without writing anything. Fetches every lookup table once
//      up front (instead of once per row) since that's now a real HTTP call.
//   2. commitImport        — re-resolves the same rows, this time actually
//      creating any missing master records (once each, cached across rows),
//      then groups rows into products and upserts them via saveProduct.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import {
  attributeDefsApi,
  categoriesApi,
  getProduct,
  listProducts,
  manufacturersApi,
  saveProduct,
  seriesApi,
  subCategoriesApi,
  unitsApi,
  type ProductInput,
  type VariantInput,
} from "./api";
import type {
  AttributeDef,
  AttributeValues,
  CatalogCategory,
  Manufacturer,
  ProductSeries,
  SubCategory,
  UnitDef,
  Variant,
} from "./types";

export interface RawImportRow {
  rowNumber: number; // 1-based, matches the row you'd see in Excel (header = row 1)
  modelCode: string;
  product: string;
  variant: string;
  manufacturer: string;
  series: string;
  category: string;
  subCategory: string;
  unit: string;
  hsnCode: string;
  gstRate: string;
  mrp: string;
  dealer: string;
  distributor: string;
  contractor: string;
  purchase: string;
  specifications: string;
}

const COLUMN_MAP: Record<string, keyof Omit<RawImportRow, "rowNumber">> = {
  "model code": "modelCode",
  product: "product",
  variant: "variant",
  manufacturer: "manufacturer",
  series: "series",
  category: "category",
  "sub category": "subCategory",
  unit: "unit",
  "hsn code": "hsnCode",
  "gst %": "gstRate",
  mrp: "mrp",
  dealer: "dealer",
  distributor: "distributor",
  contractor: "contractor",
  purchase: "purchase",
  specifications: "specifications",
};

/** Parse an uploaded .xlsx/.xls file into raw string rows, keyed by our
 *  known column names (case-insensitive header match). */
export async function parseImportFile(file: File): Promise<RawImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  return raw.map((record, i) => {
    const row: RawImportRow = {
      rowNumber: i + 2, // +1 for header row, +1 for 1-based
      modelCode: "",
      product: "",
      variant: "",
      manufacturer: "",
      series: "",
      category: "",
      subCategory: "",
      unit: "",
      hsnCode: "",
      gstRate: "",
      mrp: "",
      dealer: "",
      distributor: "",
      contractor: "",
      purchase: "",
      specifications: "",
    };
    for (const [header, value] of Object.entries(record)) {
      const key = COLUMN_MAP[header.trim().toLowerCase()];
      if (key) row[key] = String(value ?? "").trim();
    }
    return row;
  });
}

export type RowStatus = "ready" | "warning" | "error";

export interface ValidatedRow {
  raw: RawImportRow;
  status: RowStatus;
  messages: string[];
}

export interface ValidationResult {
  rows: ValidatedRow[];
  readyCount: number;
  warningCount: number;
  errorCount: number;
  newManufacturers: string[];
  newSeries: string[];
  newCategories: string[];
  newSubCategories: string[];
  newUnits: string[];
}

function parseNumber(s: string): { value: number | null; invalid: boolean } {
  const t = s.trim();
  if (!t) return { value: null, invalid: false };
  const n = Number(t);
  return Number.isFinite(n) ? { value: n, invalid: false } : { value: null, invalid: true };
}

function parseSpecifications(text: string): { key: string; value: string }[] {
  return text
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const idx = chunk.indexOf(":");
      if (idx === -1) return { key: chunk.trim(), value: "" };
      return { key: chunk.slice(0, idx).trim(), value: chunk.slice(idx + 1).trim() };
    })
    .filter((kv) => kv.key);
}

/** Master-data lookup tables, fetched once per validate/commit run instead of
 *  once per row (each was previously a synchronous localStorage read; now
 *  that it's a real HTTP call, fetching per-row would be far too slow). */
interface Lookups {
  manufacturers: Manufacturer[];
  categories: CatalogCategory[];
  series: ProductSeries[];
  subCategories: SubCategory[];
  units: UnitDef[];
  attributeDefs: AttributeDef[];
}

async function loadLookups(): Promise<Lookups> {
  const [manufacturers, categories, series, subCategories, units, attributeDefs] = await Promise.all([
    manufacturersApi.all(),
    categoriesApi.all(),
    seriesApi.all(),
    subCategoriesApi.all(),
    unitsApi.all(),
    attributeDefsApi.all(),
  ]);
  return { manufacturers, categories, series, subCategories, units, attributeDefs };
}

/** Resolves one row's text references against the pre-fetched lookup tables
 *  plus anything created earlier in this same run (via `cache`). In "dry"
 *  mode nothing is written — unresolved names are just reported. In
 *  "commit" mode, the caller has already created any missing master records
 *  (via `ensureRef`) and populated `cache` before calling this, so a lookup
 *  miss here just means "not found yet" is impossible. */
function resolveRow(
  raw: RawImportRow,
  mode: "dry" | "commit",
  cache: {
    manufacturerByName: Map<string, string>;
    seriesByKey: Map<string, string>;
    categoryByName: Map<string, string>;
    subCategoryByKey: Map<string, string>;
    unitByName: Map<string, string>;
  },
  lookups: Lookups
) {
  const messages: string[] = [];
  let status: RowStatus = "ready";
  const warn = (m: string) => {
    messages.push(m);
    if (status === "ready") status = "warning";
  };
  const fail = (m: string) => {
    messages.push(m);
    status = "error";
  };

  const productName = raw.product.trim();
  if (!productName) fail("Product name is required");

  // ── Manufacturer ──
  let manufacturerId: string | null = null;
  let manufacturerName = raw.manufacturer.trim();
  if (!manufacturerName) {
    fail("Manufacturer is required");
  } else {
    const key = manufacturerName.toLowerCase();
    const existing =
      cache.manufacturerByName.get(key) ??
      lookups.manufacturers.find((m) => m.name.toLowerCase() === key)?.id ??
      null;
    if (existing) {
      manufacturerId = existing;
      cache.manufacturerByName.set(key, existing);
    } else if (mode === "dry") {
      warn(`New manufacturer: "${manufacturerName}" will be created`);
    }
  }

  // ── Category ──
  let categoryId: string | null = null;
  const categoryName = raw.category.trim();
  if (!categoryName) {
    fail("Category is required");
  } else {
    const key = categoryName.toLowerCase();
    const existing =
      cache.categoryByName.get(key) ?? lookups.categories.find((c) => c.name.toLowerCase() === key)?.id ?? null;
    if (existing) {
      categoryId = existing;
      cache.categoryByName.set(key, existing);
    } else if (mode === "dry") {
      warn(`New category: "${categoryName}" will be created`);
    }
  }

  // ── Series (optional, scoped to manufacturer) ──
  let seriesId: string | null = null;
  const seriesName = raw.series.trim();
  if (seriesName && manufacturerName) {
    const key = `${manufacturerName.toLowerCase()}|${seriesName.toLowerCase()}`;
    const existing =
      cache.seriesByKey.get(key) ??
      (manufacturerId
        ? lookups.series.find(
            (s) => s.manufacturerId === manufacturerId && s.name.toLowerCase() === seriesName.toLowerCase()
          )?.id
        : undefined) ??
      null;
    if (existing) {
      seriesId = existing;
      cache.seriesByKey.set(key, existing);
    } else if (mode === "dry") {
      warn(`New series: "${seriesName}" (under ${manufacturerName}) will be created`);
    }
  }

  // ── Sub-category (optional, scoped to category) ──
  let subCategoryId: string | null = null;
  const subCategoryName = raw.subCategory.trim();
  if (subCategoryName && categoryName) {
    const key = `${categoryName.toLowerCase()}|${subCategoryName.toLowerCase()}`;
    const existing =
      cache.subCategoryByKey.get(key) ??
      (categoryId
        ? lookups.subCategories.find(
            (s) => s.categoryId === categoryId && s.name.toLowerCase() === subCategoryName.toLowerCase()
          )?.id
        : undefined) ??
      null;
    if (existing) {
      subCategoryId = existing;
      cache.subCategoryByKey.set(key, existing);
    } else if (mode === "dry") {
      warn(`New sub-category: "${subCategoryName}" will be created`);
    }
  }

  // ── Unit (optional, global) ──
  let unitId: string | null = null;
  const unitName = raw.unit.trim();
  if (unitName) {
    const key = unitName.toLowerCase();
    const existing =
      cache.unitByName.get(key) ?? lookups.units.find((u) => u.name.toLowerCase() === key)?.id ?? null;
    if (existing) {
      unitId = existing;
      cache.unitByName.set(key, existing);
    } else if (mode === "dry") {
      warn(`New unit: "${unitName}" will be created`);
    }
  }

  // ── Numeric fields ──
  const num = (field: string, label: string) => {
    const { value, invalid } = parseNumber(field);
    if (invalid) warn(`${label} "${field}" is not a number — left blank`);
    return value;
  };
  const mrp = num(raw.mrp, "MRP");
  const dealer = num(raw.dealer, "Dealer price");
  const distributor = num(raw.distributor, "Distributor price");
  const contractor = num(raw.contractor, "Contractor price");
  const purchase = num(raw.purchase, "Purchase price");
  const gstRate = num(raw.gstRate, "GST %");

  // ── Specifications (only resolvable once the category itself exists) ──
  const attributes: AttributeValues = {};
  const specs = parseSpecifications(raw.specifications);
  if (specs.length > 0) {
    if (!categoryId) {
      if (categoryName) warn("Specifications can't be matched until the new category is created — add them manually after import");
    } else {
      const defs = lookups.attributeDefs.filter((d) => d.categoryId === categoryId);
      for (const { key, value } of specs) {
        const def = defs.find((d) => d.name.toLowerCase() === key.toLowerCase());
        if (!def) {
          warn(`Unknown specification "${key}" for category "${categoryName}" — skipped`);
          continue;
        }
        if (!value) continue;
        if (def.type === "number") {
          const n = Number(value);
          attributes[def.id] = Number.isFinite(n) ? n : null;
        } else if (def.type === "boolean") {
          attributes[def.id] = /^(yes|true|1)$/i.test(value.trim());
        } else {
          attributes[def.id] = value;
        }
      }
    }
  }

  return {
    status,
    messages,
    productName,
    manufacturerId,
    manufacturerName,
    categoryId,
    categoryName,
    seriesId,
    seriesName,
    subCategoryId,
    subCategoryName,
    unitId,
    unitName,
    hsnCode: raw.hsnCode.trim() || null,
    gstRate,
    mrp,
    dealer,
    distributor,
    contractor,
    purchase,
    attributes,
  };
}

function emptyCache() {
  return {
    manufacturerByName: new Map<string, string>(),
    seriesByKey: new Map<string, string>(),
    categoryByName: new Map<string, string>(),
    subCategoryByKey: new Map<string, string>(),
    unitByName: new Map<string, string>(),
  };
}

/** Read-only pass: classifies every row and lists what would be created.
 *  Writes nothing. */
export async function validateImportRows(rawRows: RawImportRow[]): Promise<ValidationResult> {
  const lookups = await loadLookups();
  const cache = emptyCache();
  const newManufacturers = new Set<string>();
  const newSeries = new Set<string>();
  const newCategories = new Set<string>();
  const newSubCategories = new Set<string>();
  const newUnits = new Set<string>();

  const rows: ValidatedRow[] = rawRows.map((raw) => {
    const r = resolveRow(raw, "dry", cache, lookups);
    if (!r.manufacturerId && r.manufacturerName) newManufacturers.add(r.manufacturerName);
    if (!r.categoryId && r.categoryName) newCategories.add(r.categoryName);
    if (!r.seriesId && r.seriesName && r.manufacturerName)
      newSeries.add(`${r.seriesName} (${r.manufacturerName})`);
    if (!r.subCategoryId && r.subCategoryName && r.categoryName)
      newSubCategories.add(`${r.subCategoryName} (${r.categoryName})`);
    if (!r.unitId && r.unitName) newUnits.add(r.unitName);
    return { raw, status: r.status, messages: r.messages };
  });

  return {
    rows,
    readyCount: rows.filter((r) => r.status === "ready").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
    newManufacturers: [...newManufacturers],
    newSeries: [...newSeries],
    newCategories: [...newCategories],
    newSubCategories: [...newSubCategories],
    newUnits: [...newUnits],
  };
}

export interface ImportSummary {
  productsCreated: number;
  productsUpdated: number;
  variantsImported: number;
  rowsSkipped: number;
  manufacturersCreated: number;
  seriesCreated: number;
  categoriesCreated: number;
  subCategoriesCreated: number;
  unitsCreated: number;
}

const emptyImages = () => ({ primary: null, gallery: [], datasheet: null, brochure: null, manual: null });
const emptyPrices = () => ({
  mrp: null,
  dealer: null,
  distributor: null,
  contractor: null,
  purchase: null,
  offer: null,
});

type Resolved = ReturnType<typeof resolveRow>;
interface ResolvedRow {
  raw: RawImportRow;
  r: Resolved;
}

/** Ensures a master record exists for `name`, creating it via `store.create`
 *  the first time a name is seen and reusing the cached id after that. */
async function ensureRef<T extends { id: string }>(
  cache: Map<string, string>,
  key: string,
  name: string,
  findExisting: () => { id: string } | undefined,
  create: () => Promise<T>,
  onCreated: () => void
): Promise<string> {
  const cached = cache.get(key);
  if (cached) return cached;
  const existing = findExisting();
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const created = await create();
  cache.set(key, created.id);
  onCreated();
  return created.id;
}

/** Creates any missing master records, groups rows into products, and
 *  upserts each product with its merged variant list. Only errors (missing
 *  product name/manufacturer/category) cause a row to be skipped entirely —
 *  everything else (new refs, bad numbers, unknown spec keys) is created or
 *  left blank per `resolveRow`, same as the dry run predicted. */
export async function commitImport(rawRows: RawImportRow[]): Promise<ImportSummary> {
  const lookups = await loadLookups();
  const cache = emptyCache();
  const summary: ImportSummary = {
    productsCreated: 0,
    productsUpdated: 0,
    variantsImported: 0,
    rowsSkipped: 0,
    manufacturersCreated: 0,
    seriesCreated: 0,
    categoriesCreated: 0,
    subCategoriesCreated: 0,
    unitsCreated: 0,
  };

  // Resolve every row, creating missing master records the first time each
  // name is seen (later rows with the same name reuse the cached id).
  const resolvedRows: ResolvedRow[] = [];
  for (const raw of rawRows) {
    const productName = raw.product.trim();
    const manufacturerName = raw.manufacturer.trim();
    const categoryName = raw.category.trim();
    if (!productName || !manufacturerName || !categoryName) {
      summary.rowsSkipped++;
      continue;
    }

    const mfrKey = manufacturerName.toLowerCase();
    const manufacturerId = await ensureRef(
      cache.manufacturerByName,
      mfrKey,
      manufacturerName,
      () => lookups.manufacturers.find((m) => m.name.toLowerCase() === mfrKey),
      () => manufacturersApi.create({ name: manufacturerName }),
      () => summary.manufacturersCreated++
    );

    const catKey = categoryName.toLowerCase();
    const categoryId = await ensureRef(
      cache.categoryByName,
      catKey,
      categoryName,
      () => lookups.categories.find((c) => c.name.toLowerCase() === catKey),
      () => categoriesApi.create({ name: categoryName }),
      () => summary.categoriesCreated++
    );

    const seriesName = raw.series.trim();
    if (seriesName) {
      const seriesKey = `${mfrKey}|${seriesName.toLowerCase()}`;
      await ensureRef(
        cache.seriesByKey,
        seriesKey,
        seriesName,
        () =>
          lookups.series.find(
            (s) => s.manufacturerId === manufacturerId && s.name.toLowerCase() === seriesName.toLowerCase()
          ),
        () => seriesApi.create({ name: seriesName, manufacturerId } as never),
        () => summary.seriesCreated++
      );
    }

    const subCategoryName = raw.subCategory.trim();
    if (subCategoryName) {
      const subKey = `${catKey}|${subCategoryName.toLowerCase()}`;
      await ensureRef(
        cache.subCategoryByKey,
        subKey,
        subCategoryName,
        () =>
          lookups.subCategories.find(
            (s) => s.categoryId === categoryId && s.name.toLowerCase() === subCategoryName.toLowerCase()
          ),
        () => subCategoriesApi.create({ name: subCategoryName, categoryId } as never),
        () => summary.subCategoriesCreated++
      );
    }

    const unitName = raw.unit.trim();
    if (unitName) {
      const unitKey = unitName.toLowerCase();
      await ensureRef(
        cache.unitByName,
        unitKey,
        unitName,
        () => lookups.units.find((u) => u.name.toLowerCase() === unitKey),
        () => unitsApi.create({ name: unitName, symbol: unitName } as never),
        () => summary.unitsCreated++
      );
    }

    resolvedRows.push({ raw, r: resolveRow(raw, "commit", cache, lookups) });
  }

  // Group rows into products: (manufacturerId, seriesId, product name).
  const groups = new Map<string, ResolvedRow[]>();
  for (const row of resolvedRows) {
    const { r } = row;
    const key = `${r.manufacturerId}|${r.seriesId ?? ""}|${r.productName.trim().toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const { items: currentProducts } = await listProducts({ limit: 5000 });

  for (const groupRows of groups.values()) {
    const { r: first } = groupRows[0];
    if (!first.manufacturerId || !first.categoryId) continue;

    const existingProductRow = currentProducts.find(
      (p) =>
        p.manufacturerId === first.manufacturerId &&
        (p.seriesId ?? null) === (first.seriesId ?? null) &&
        p.name.trim().toLowerCase() === first.productName.trim().toLowerCase()
    );
    const existingProduct = existingProductRow ? await getProduct(existingProductRow.id) : null;

    // Merge attributes across the group's rows (later rows fill in gaps).
    const mergedAttributes: AttributeValues = {};
    for (const { r } of groupRows) Object.assign(mergedAttributes, r.attributes);

    const productInput: ProductInput = {
      id: existingProduct?.id,
      name: first.productName,
      description: existingProduct?.description ?? null,
      manufacturerId: first.manufacturerId,
      divisionId: existingProduct?.divisionId ?? null,
      seriesId: first.seriesId,
      categoryId: first.categoryId,
      subCategoryId: first.subCategoryId,
      attributes: { ...(existingProduct?.attributes ?? {}), ...mergedAttributes },
      unitId: first.unitId ?? existingProduct?.unitId ?? null,
      hsnCode: first.hsnCode ?? existingProduct?.hsnCode ?? null,
      gstRate: first.gstRate ?? existingProduct?.gstRate ?? null,
      images: existingProduct?.images ?? emptyImages(),
      status: existingProduct?.status ?? "ACTIVE",
    };

    // Merge imported variants into whatever the product already has: update
    // matches by model code or name, append new ones, keep everything else.
    const existingVariants: Variant[] = existingProduct?.variants ?? [];
    const variantInputs: VariantInput[] = existingVariants.map((v) => ({ ...v }));

    for (const { raw, r } of groupRows) {
      const variantName = raw.variant.trim() || "Default";
      const modelCode = raw.modelCode.trim() || null;
      const matchIdx = variantInputs.findIndex(
        (v) =>
          (modelCode && v.modelCode && v.modelCode.trim().toLowerCase() === modelCode.toLowerCase()) ||
          (!modelCode && v.name.trim().toLowerCase() === variantName.toLowerCase())
      );
      const existing = matchIdx >= 0 ? variantInputs[matchIdx] : null;
      const variantData: VariantInput = {
        id: existing?.id,
        name: variantName,
        modelCode,
        manufacturerSku: modelCode,
        internalSku: existing?.internalSku ?? null,
        barcode: existing?.barcode ?? null,
        ean: existing?.ean ?? null,
        attributes: existing?.attributes ?? {},
        prices: {
          ...(existing?.prices ?? emptyPrices()),
          mrp: r.mrp,
          dealer: r.dealer,
          distributor: r.distributor,
          contractor: r.contractor,
          purchase: r.purchase,
        },
        gstRate: r.gstRate ?? existing?.gstRate ?? null,
        discountPercent: existing?.discountPercent ?? null,
        stockQty: existing?.stockQty ?? null,
        status: existing?.status ?? "ACTIVE",
        image: existing?.image ?? null,
      };
      if (matchIdx >= 0) {
        variantInputs[matchIdx] = variantData;
      } else {
        variantInputs.push(variantData);
      }
      summary.variantsImported++;
    }

    await saveProduct(productInput, variantInputs);
    if (existingProduct) summary.productsUpdated++;
    else summary.productsCreated++;
  }

  return summary;
}
