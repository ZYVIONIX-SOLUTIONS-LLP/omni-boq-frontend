import type { CellCoord, CellRange, NumberFormat } from '@/components/spreadsheet/types';

// ---------------------------------------------------------------------------
// Column <-> letter conversion (0-indexed col -> "A", "B", ..., "Z", "AA"...)
// ---------------------------------------------------------------------------
export function colToLetter(col: number): string {
  let n = col + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToCol(letters: string): number {
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}

/** Build the A1-style label for a coordinate, e.g. {row:0,col:0} -> "A1" */
export function coordToLabel(coord: CellCoord): string {
  return `${colToLetter(coord.col)}${coord.row + 1}`;
}

/** Parse an A1-style label into a coordinate. Returns null if invalid. */
export function labelToCoord(label: string): CellCoord | null {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(label.trim());
  if (!m) return null;
  const col = letterToCol(m[1].toUpperCase());
  const row = parseInt(m[2], 10) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

/** Internal storage key for a cell in the sparse Map, e.g. "3,5" */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function keyToCoord(key: string): CellCoord {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/** Normalize a range so start <= end on both axes. */
export function normalizeRange(range: CellRange): CellRange {
  const r1 = Math.min(range.start.row, range.end.row);
  const r2 = Math.max(range.start.row, range.end.row);
  const c1 = Math.min(range.start.col, range.end.col);
  const c2 = Math.max(range.start.col, range.end.col);
  return { start: { row: r1, col: c1 }, end: { row: r2, col: c2 } };
}

export function isInRange(coord: CellCoord, range: CellRange): boolean {
  const n = normalizeRange(range);
  return (
    coord.row >= n.start.row &&
    coord.row <= n.end.row &&
    coord.col >= n.start.col &&
    coord.col <= n.end.col
  );
}

export function rangesEqual(a: CellRange, b: CellRange): boolean {
  const na = normalizeRange(a);
  const nb = normalizeRange(b);
  return (
    na.start.row === nb.start.row &&
    na.start.col === nb.start.col &&
    na.end.row === nb.end.row &&
    na.end.col === nb.end.col
  );
}

// ---------------------------------------------------------------------------
// Defaults for sizing
// ---------------------------------------------------------------------------
export const DEFAULT_ROW_HEIGHT = 20;
export const DEFAULT_COL_WIDTH = 82;
export const ROW_HEADER_WIDTH = 46;
export const COL_HEADER_HEIGHT = 24;

// ---------------------------------------------------------------------------
// Number / date / currency formatting for cell display
// ---------------------------------------------------------------------------
export function formatValue(
  raw: string | number | boolean | null,
  format?: NumberFormat
): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'boolean') return raw ? 'TRUE' : 'FALSE';

  const isNumeric = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '' && !isNaN(Number(raw)));

  if (!format || format === 'general') {
    return String(raw);
  }

  if (!isNumeric) return String(raw);
  const num = typeof raw === 'number' ? raw : Number(raw);

  switch (format) {
    case 'number':
      return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'number2':
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'currency':
      return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    case 'percentage':
      return `${(num * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    case 'date': {
      const d = excelSerialToDate(num);
      return d ? d.toLocaleDateString() : String(raw);
    }
    case 'datetime': {
      const d = excelSerialToDate(num);
      return d ? d.toLocaleString() : String(raw);
    }
    case 'time': {
      const d = excelSerialToDate(num);
      return d ? d.toLocaleTimeString() : String(raw);
    }
    default:
      return String(raw);
  }
}

/** Excel stores dates as a serial number of days since 1899-12-30. */
export function excelSerialToDate(serial: number): Date | null {
  if (!isFinite(serial)) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = serial * 24 * 60 * 60 * 1000;
  return new Date(epoch.getTime() + ms);
}

export function dateToExcelSerial(date: Date): number {
  const epoch = Date.UTC(1899, 11, 30);
  return (date.getTime() - epoch) / (24 * 60 * 60 * 1000);
}

/** Detects if a typed string looks like a date and returns its excel serial, else null */
export function tryParseDate(input: string): number | null {
  if (!/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(input.trim())) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return dateToExcelSerial(d);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
