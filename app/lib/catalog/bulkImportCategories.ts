import * as XLSX from "xlsx";
import { attributeDefsApi, categoriesApi } from "./api";
import type { AttributeDef, AttributeType, CatalogCategory } from "./types";

// One row = one (Category, Specification) pair. A category with no specs yet
// is a single row with the specification columns left blank; a category with
// 3 specs is 3 rows sharing the same Category Name.
export interface RawCategoryImportRow {
  rowNumber: number;
  categoryName: string;
  hsnCode: string;
  defaultGstRate: string;
  specName: string;
  specType: string;
  specUnit: string;
  specOptions: string;
  specRequired: string;
}

const COLUMN_MAP: Record<string, keyof Omit<RawCategoryImportRow, "rowNumber">> = {
  "category name": "categoryName",
  "hsn code": "hsnCode",
  "default gst %": "defaultGstRate",
  "specification name": "specName",
  "specification type": "specType",
  unit: "specUnit",
  options: "specOptions",
  required: "specRequired",
};

const VALID_TYPES: AttributeType[] = ["TEXT", "NUMBER", "SELECT", "BOOLEAN"];

export async function parseImportFile(file: File): Promise<RawCategoryImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  let lastCategoryName = "";
  return raw.map((record, i) => {
    const row: RawCategoryImportRow = {
      rowNumber: i + 2,
      categoryName: "",
      hsnCode: "",
      defaultGstRate: "",
      specName: "",
      specType: "",
      specUnit: "",
      specOptions: "",
      specRequired: "",
    };
    for (const [header, value] of Object.entries(record)) {
      const key = COLUMN_MAP[header.trim().toLowerCase()];
      if (key) row[key] = String(value ?? "").trim();
    }
    // Category Name is only filled on a group's first row (the file's
    // documented convention) — carry it down to the rest of the group.
    if (row.categoryName) lastCategoryName = row.categoryName;
    else row.categoryName = lastCategoryName;
    return row;
  });
}

export type RowStatus = "ready" | "warning" | "error";

export interface ValidatedCategoryRow {
  raw: RawCategoryImportRow;
  status: RowStatus;
  messages: string[];
}

export interface CategoryValidationResult {
  rows: ValidatedCategoryRow[];
  readyCount: number;
  warningCount: number;
  errorCount: number;
  newCategories: string[];
}

interface ResolvedCategoryRow {
  status: RowStatus;
  messages: string[];
  categoryName: string;
  hsnCode: string | null;
  defaultGstRate: number | null;
  specName: string;
  specType: AttributeType | null;
  specUnit: string | null;
  specOptions: string[];
  specRequired: boolean;
}

function resolveRow(raw: RawCategoryImportRow): ResolvedCategoryRow {
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

  const categoryName = raw.categoryName.trim();
  if (!categoryName) fail("Category Name is required");

  const gstText = raw.defaultGstRate.trim();
  let defaultGstRate: number | null = null;
  if (gstText) {
    const n = Number(gstText);
    if (Number.isFinite(n)) defaultGstRate = n;
    else warn(`Default GST % "${gstText}" is not a number — left blank`);
  }

  const specName = raw.specName.trim();
  let specType: AttributeType | null = null;
  let specOptions: string[] = [];
  const specRequired = /^(yes|true|1)$/i.test(raw.specRequired.trim());

  if (specName) {
    const typeText = raw.specType.trim().toUpperCase();
    if (!VALID_TYPES.includes(typeText as AttributeType)) {
      fail(`Specification Type "${raw.specType}" is invalid — must be Text, Number, Select or Boolean`);
    } else {
      specType = typeText as AttributeType;
      if (specType === "SELECT") {
        specOptions = raw.specOptions
          .split(";")
          .map((o) => o.trim())
          .filter(Boolean);
        if (specOptions.length === 0) warn(`Specification "${specName}" is Select but has no Options`);
      }
    }
  }

  return {
    status,
    messages,
    categoryName,
    hsnCode: raw.hsnCode.trim() || null,
    defaultGstRate,
    specName,
    specType,
    specUnit: raw.specUnit.trim() || null,
    specOptions,
    specRequired,
  };
}

export async function validateImportRows(
  rawRows: RawCategoryImportRow[]
): Promise<CategoryValidationResult> {
  const existingCategories = await categoriesApi.all();
  const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));
  const newCategories = new Set<string>();

  const rows: ValidatedCategoryRow[] = rawRows.map((raw) => {
    const r = resolveRow(raw);
    if (r.categoryName && !existingNames.has(r.categoryName.toLowerCase())) {
      newCategories.add(r.categoryName);
    }
    return { raw, status: r.status, messages: r.messages };
  });

  return {
    rows,
    readyCount: rows.filter((r) => r.status === "ready").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
    newCategories: [...newCategories],
  };
}

export interface CategoryImportSummary {
  categoriesCreated: number;
  categoriesUpdated: number;
  specsCreated: number;
  specsSkippedExisting: number;
  rowsSkipped: number;
}

export async function commitImport(rawRows: RawCategoryImportRow[]): Promise<CategoryImportSummary> {
  const summary: CategoryImportSummary = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    specsCreated: 0,
    specsSkippedExisting: 0,
    rowsSkipped: 0,
  };

  const categories = await categoriesApi.all();
  const categoryByName = new Map<string, CatalogCategory>(
    categories.map((c) => [c.name.toLowerCase(), c])
  );
  const patchedThisRun = new Set<string>();

  const attributeDefs = await attributeDefsApi.all();
  const defsByCategory = new Map<string, AttributeDef[]>();
  for (const def of attributeDefs) {
    const list = defsByCategory.get(def.categoryId) ?? [];
    list.push(def);
    defsByCategory.set(def.categoryId, list);
  }

  for (const raw of rawRows) {
    const r = resolveRow(raw);
    if (r.status === "error") {
      summary.rowsSkipped++;
      continue;
    }

    const key = r.categoryName.toLowerCase();
    let category = categoryByName.get(key);
    if (!category) {
      category = await categoriesApi.create({
        name: r.categoryName,
        hsnCode: r.hsnCode,
        defaultGstRate: r.defaultGstRate,
      });
      categoryByName.set(key, category);
      defsByCategory.set(category.id, []);
      summary.categoriesCreated++;
      patchedThisRun.add(category.id);
    } else if (!patchedThisRun.has(category.id) && (r.hsnCode || r.defaultGstRate != null)) {
      category = await categoriesApi.update(category.id, {
        hsnCode: r.hsnCode ?? category.hsnCode,
        defaultGstRate: r.defaultGstRate ?? category.defaultGstRate,
      });
      categoryByName.set(key, category);
      patchedThisRun.add(category.id);
      summary.categoriesUpdated++;
    }

    if (!r.specName || !r.specType) continue;

    const defs = defsByCategory.get(category.id) ?? [];
    const existingDef = defs.find((d) => d.name.toLowerCase() === r.specName.toLowerCase());
    if (existingDef) {
      summary.specsSkippedExisting++;
      continue;
    }

    const created = await attributeDefsApi.create({
      name: r.specName,
      categoryId: category.id,
      type: r.specType,
      unit: r.specType === "NUMBER" ? r.specUnit : null,
      options: r.specOptions,
      required: r.specRequired,
      sortOrder: defs.length ? Math.max(...defs.map((d) => d.sortOrder)) + 1 : 0,
    });
    defs.push(created);
    defsByCategory.set(category.id, defs);
    summary.specsCreated++;
  }

  return summary;
}
