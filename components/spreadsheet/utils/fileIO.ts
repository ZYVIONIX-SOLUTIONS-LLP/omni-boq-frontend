import * as XLSX from 'xlsx';
import type { CellData } from '@/components/spreadsheet/types';
import { cellKey, colToLetter } from './cellUtils';

export interface ImportedSheet {
  cells: Map<string, CellData>;
  rowCount: number;
  colCount: number;
}

/** Parse an uploaded .xlsx/.xls File into our sparse cell map. */
export async function importXlsx(file: File): Promise<ImportedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellStyles: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

  const cells = new Map<string, CellData>();
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      const value = cell.f ? `=${cell.f}` : cell.v !== undefined ? String(cell.v) : '';
      if (value !== '') cells.set(cellKey(r, c), { value });
    }
  }

  return {
    cells,
    rowCount: Math.max(range.e.r + 1, 100),
    colCount: Math.max(range.e.c + 1, 26),
  };
}

/** Parse a CSV file into our sparse cell map. */
export async function importCsv(file: File): Promise<ImportedSheet> {
  const text = await file.text();
  const rows = parseCsvText(text);
  const cells = new Map<string, CellData>();
  rows.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val !== '') cells.set(cellKey(r, c), { value: val });
    });
  });
  return {
    cells,
    rowCount: Math.max(rows.length, 100),
    colCount: Math.max(...rows.map((r) => r.length), 26),
  };
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // skip
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Export the given (evaluated) grid of display strings to a .xlsx file download. */
export function exportXlsx(
  getCellDisplay: (row: number, col: number) => string,
  rowCount: number,
  colCount: number,
  filename = 'spreadsheet.xlsx'
) {
  const aoa: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: string[] = [];
    let hasData = false;
    for (let c = 0; c < colCount; c++) {
      const val = getCellDisplay(r, c);
      if (val !== '') hasData = true;
      row.push(val);
    }
    if (hasData || r === 0) aoa.push(row);
    else aoa.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

/** Export to CSV and trigger a browser download. */
export function exportCsv(
  getCellDisplay: (row: number, col: number) => string,
  rowCount: number,
  colCount: number,
  filename = 'spreadsheet.csv'
) {
  const lines: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const cellsInRow: string[] = [];
    let hasData = false;
    for (let c = 0; c < colCount; c++) {
      const val = getCellDisplay(r, c);
      if (val !== '') hasData = true;
      const escaped = /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
      cellsInRow.push(escaped);
    }
    if (hasData) lines.push(cellsInRow.join(','));
  }
  downloadBlob(lines.join('\n'), filename, 'text/csv');
}

export function exportJson(data: unknown, filename = 'spreadsheet.json') {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json');
}

export async function importJsonFile(file: File): Promise<any> {
  const text = await file.text();
  return JSON.parse(text);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { colToLetter };
