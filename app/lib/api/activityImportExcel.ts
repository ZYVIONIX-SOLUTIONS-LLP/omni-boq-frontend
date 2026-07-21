// ─────────────────────────────────────────────────────────────────────────────
// Bulk Excel import for Activities. Creates activity shells (name, wiring
// type, segment, unit) with no requirements — materials are added afterward
// one activity at a time in the spreadsheet editor. Column layout matches
// the "Activity_Library_Materials_Reference.xlsx" template: Code, Activity
// Name, Wiring Type, Category, Sub Category, Unit, Suggested Materials (the
// last column is informational only and isn't imported).
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { listActivities, createActivity, updateActivity, WIRING_TYPES, type WiringType } from "./activities";

export interface RawActivityImportRow {
  rowNumber: number;
  code: string;
  name: string;
  wiringType: string;
  segment: string;
  category: string;
  subCategory: string;
  unit: string;
}

const COLUMN_MAP: Record<string, keyof Omit<RawActivityImportRow, "rowNumber">> = {
  code: "code",
  "activity name": "name",
  name: "name",
  "wiring type": "wiringType",
  segment: "segment",
  category: "category",
  "sub category": "subCategory",
  unit: "unit",
};

export async function parseActivityImportFile(file: File): Promise<RawActivityImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  return raw.map((record, i) => {
    const row: RawActivityImportRow = {
      rowNumber: i + 2,
      code: "",
      name: "",
      wiringType: "",
      segment: "",
      category: "",
      subCategory: "",
      unit: "",
    };
    for (const [header, value] of Object.entries(record)) {
      const key = COLUMN_MAP[header.trim().toLowerCase()];
      if (key) row[key] = String(value ?? "").trim();
    }
    return row;
  });
}

export type RowStatus = "ready" | "warning" | "error";

export interface ValidatedActivityRow {
  raw: RawActivityImportRow;
  status: RowStatus;
  messages: string[];
  resolvedWiringType: WiringType;
  willUpdateExisting: boolean;
}

export interface ActivityValidationResult {
  rows: ValidatedActivityRow[];
  readyCount: number;
  warningCount: number;
  errorCount: number;
  createCount: number;
  updateCount: number;
}

function normalizeWiringType(text: string): { value: WiringType; matched: boolean } {
  const t = text.trim().toLowerCase();
  if (!t) return { value: "POINT_WIRING", matched: false };
  if (t === "point wiring" || t === "point_wiring" || t === "point") return { value: "POINT_WIRING", matched: true };
  if (t === "circuit wiring" || t === "circuit_wiring" || t === "circuit") return { value: "CIRCUIT_WIRING", matched: true };
  if (WIRING_TYPES.includes(text.trim().toUpperCase() as WiringType)) {
    return { value: text.trim().toUpperCase() as WiringType, matched: true };
  }
  return { value: "POINT_WIRING", matched: false };
}

function resolveActivityRow(
  raw: RawActivityImportRow,
  existingCodes: Set<string>,
  seenCodesThisFile: Set<string>
): Omit<ValidatedActivityRow, "raw"> {
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

  const name = raw.name.trim();
  if (!name) fail("Activity Name is required");

  const { value: resolvedWiringType, matched } = normalizeWiringType(raw.wiringType);
  if (!matched && raw.wiringType.trim()) {
    warn(`Unrecognized Wiring Type "${raw.wiringType}" — defaulted to Point Wiring`);
  } else if (!raw.wiringType.trim()) {
    warn(`Wiring Type is blank — defaulted to Point Wiring`);
  }

  const code = raw.code.trim();
  let willUpdateExisting = false;
  if (code) {
    if (existingCodes.has(code)) {
      willUpdateExisting = true;
      warn(`Code "${code}" already exists — that activity will be updated, not duplicated`);
    } else if (seenCodesThisFile.has(code)) {
      fail(`Code "${code}" is duplicated within this file`);
    }
  }

  return { status, messages, resolvedWiringType, willUpdateExisting };
}

/** Validates rows against existing activity codes (fetched fresh) so a row
 *  whose Code already exists is flagged to update in place rather than
 *  create a duplicate. */
export async function validateActivityImportRows(
  rawRows: RawActivityImportRow[]
): Promise<ActivityValidationResult> {
  const { items } = await listActivities({ limit: 5000 });
  const existingCodes = new Set(items.map((a) => a.code));
  const seenCodesThisFile = new Set<string>();

  const rows: ValidatedActivityRow[] = rawRows.map((raw) => {
    const resolved = resolveActivityRow(raw, existingCodes, seenCodesThisFile);
    const code = raw.code.trim();
    if (code) seenCodesThisFile.add(code);
    return { raw, ...resolved };
  });

  return {
    rows,
    readyCount: rows.filter((r) => r.status === "ready").length,
    warningCount: rows.filter((r) => r.status === "warning").length,
    errorCount: rows.filter((r) => r.status === "error").length,
    createCount: rows.filter((r) => r.status !== "error" && !r.willUpdateExisting).length,
    updateCount: rows.filter((r) => r.status !== "error" && r.willUpdateExisting).length,
  };
}

export interface ActivityImportSummary {
  created: number;
  updated: number;
  skipped: number;
}

export async function commitActivityImport(rows: ValidatedActivityRow[]): Promise<ActivityImportSummary> {
  const { items: existing } = await listActivities({ limit: 5000 });
  const byCode = new Map(existing.map((a) => [a.code, a]));

  const summary: ActivityImportSummary = { created: 0, updated: 0, skipped: 0 };

  for (const row of rows) {
    if (row.status === "error") {
      summary.skipped++;
      continue;
    }
    const { raw, resolvedWiringType } = row;
    const name = raw.name.trim();
    const segment = raw.segment.trim().toUpperCase();
    const validSegment = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"].includes(segment)
      ? (segment as "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL")
      : "RESIDENTIAL";
    const unit = raw.unit.trim().toUpperCase() || (resolvedWiringType === "POINT_WIRING" ? "POINT" : "CIRCUIT");
    const description = [raw.category.trim(), raw.subCategory.trim()].filter(Boolean).join(" / ") || undefined;

    const code = raw.code.trim();
    const existingActivity = code ? byCode.get(code) : undefined;

    if (existingActivity) {
      await updateActivity(existingActivity.id, {
        name,
        wiringType: resolvedWiringType,
        segment: validSegment,
        unit,
        description,
      });
      summary.updated++;
    } else {
      await createActivity({
        name,
        wiringType: resolvedWiringType,
        segment: validSegment,
        unit,
        description,
        requirements: [],
      });
      summary.created++;
    }
  }

  return summary;
}
