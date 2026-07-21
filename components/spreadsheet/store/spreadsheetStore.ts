import { create } from 'zustand';
import type {
  CellCoord,
  CellData,
  CellFormat,
  CellRange,
  ClipboardData,
  EvaluatedCell,
  HistoryEntry,
  MergedRange,
  SelectionKind,
  SelectionState,
  SortState,
} from '@/components/spreadsheet/types';
import {
  cellKey,
  clamp,
  colToLetter,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  formatValue,
  keyToCoord,
  letterToCol,
  normalizeRange,
} from '@/components/spreadsheet/utils/cellUtils';
import { evaluateFormula, type FormulaResolver } from '@/components/spreadsheet/utils/formulaEngine';

export const DEFAULT_ROW_COUNT = 100000;
export const DEFAULT_COL_COUNT = 50;

// ---------------------------------------------------------------------------
// Non-reactive evaluation cache. Kept OUTSIDE the zustand state on purpose:
// it is a pure derived cache of `cells`, recomputed lazily on read, and
// mutating it must never trigger a re-render by itself (only actual cell
// edits, which bump `version`, should do that).
// ---------------------------------------------------------------------------
let evalCache = new Map<string, EvaluatedCell>();

function invalidateEvalCache() {
  evalCache = new Map();
}

function evaluateCell(
  row: number,
  col: number,
  cells: Map<string, CellData>,
  visiting: Set<string>
): EvaluatedCell {
  const key = cellKey(row, col);
  const cached = evalCache.get(key);
  if (cached) return cached;

  if (visiting.has(key)) {
    const res: EvaluatedCell = { display: '#CIRCULAR!', raw: null, error: '#CIRCULAR!' };
    evalCache.set(key, res);
    return res;
  }

  const data = cells.get(key);
  if (!data || data.value === '') {
    const res: EvaluatedCell = { display: '', raw: null };
    evalCache.set(key, res);
    return res;
  }

  visiting.add(key);
  let result: EvaluatedCell;

  if (data.value.startsWith('=')) {
    const resolver: FormulaResolver = {
      getCellValue: (r, c) => {
        const ev = evaluateCell(r, c, cells, visiting);
        return ev.error ? null : ev.raw;
      },
    };
    const evalResult = evaluateFormula(data.value.slice(1), resolver);
    if (evalResult.error) {
      result = { display: evalResult.error, raw: null, error: evalResult.error };
    } else {
      result = {
        display: formatValue(evalResult.value, data.format?.numberFormat),
        raw: evalResult.value,
      };
    }
  } else {
    const trimmed = data.value.trim();
    const maybeNum = Number(trimmed);
    const raw = trimmed !== '' && !isNaN(maybeNum) ? maybeNum : data.value;
    result = { display: formatValue(raw, data.format?.numberFormat), raw };
  }

  visiting.delete(key);
  evalCache.set(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// Formula relative-reference shifting for copy/paste & row/col insert/delete
// ---------------------------------------------------------------------------
function shiftFormula(formula: string, rowOffset: number, colOffset: number): string {
  return formula.replace(/([A-Za-z]{1,3})(\d+)/g, (match, letters, digits) => {
    // Avoid accidentally touching function names by requiring the match to be a real ref;
    // since a ref always has trailing digits directly after letters this is already safe.
    const col = letterToCol(letters.toUpperCase()) + colOffset;
    const row = parseInt(digits, 10) - 1 + rowOffset;
    if (col < 0 || row < 0) return match;
    return `${colToLetter(col)}${row + 1}`;
  });
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------
interface EditingState {
  coord: CellCoord;
  value: string;
  /** true if the edit was started by typing (replaces content) vs F2/double-click (append/edit in place) */
  replaceMode: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  target: 'cell' | 'row' | 'col';
}

interface SpreadsheetState {
  // --- core data ---
  cells: Map<string, CellData>;
  rowHeights: Map<number, number>;
  colWidths: Map<number, number>;
  merges: MergedRange[];
  hiddenRows: Set<number>;
  hiddenCols: Set<number>;
  frozenRows: number;
  frozenCols: number;
  rowCount: number;
  colCount: number;
  /** bumped on every mutation so React subscribers re-render even though Maps mutate in place */
  version: number;

  // --- interaction state ---
  selection: SelectionState;
  editing: EditingState | null;
  clipboard: ClipboardData | null;
  contextMenu: ContextMenuState | null;
  filters: Map<number, Set<string>>;
  sort: SortState | null;

  // find & replace
  searchTerm: string;
  searchMatches: CellCoord[];
  searchIndex: number;
  showFindReplace: boolean;

  // history
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  loading: boolean;

  // --- derived read helpers (not reactive selectors, plain functions) ---
  getEvaluatedCell: (row: number, col: number) => EvaluatedCell;
  getCellData: (row: number, col: number) => CellData | undefined;
  getRowHeight: (row: number) => number;
  getColWidth: (col: number) => number;
  getMergeFor: (row: number, col: number) => MergedRange | undefined;

  // --- actions ---
  setCellValue: (row: number, col: number, value: string) => void;
  setRangeFormat: (range: CellRange, patch: CellFormat) => void;
  applyBorders: (range: CellRange, mode: 'all' | 'outer' | 'none', color: string) => void;
  clearRange: (range: CellRange) => void;

  setSelection: (range: CellRange, kind?: SelectionKind, active?: CellCoord) => void;
  selectRow: (row: number, additive?: boolean) => void;
  selectColumn: (col: number, additive?: boolean) => void;
  selectAll: () => void;

  startEditing: (coord: CellCoord, initialValue?: string, replaceMode?: boolean) => void;
  updateEditingValue: (value: string) => void;
  commitEditing: (moveDir?: 'down' | 'right' | 'none') => void;
  cancelEditing: () => void;

  copySelection: (cut?: boolean) => void;
  pasteAt: (target: CellCoord) => void;
  fillRange: (source: CellRange, target: CellRange) => void;

  undo: () => void;
  redo: () => void;

  insertRowAt: (index: number) => void;
  deleteRowAt: (index: number) => void;
  duplicateRowAt: (index: number) => void;
  insertColAt: (index: number) => void;
  deleteColAt: (index: number) => void;
  duplicateColAt: (index: number) => void;

  mergeSelection: () => void;
  unmergeSelection: () => void;

  resizeRow: (row: number, height: number) => void;
  resizeColumn: (col: number, width: number) => void;
  autoFitRow: (row: number) => void;
  autoFitColumn: (col: number) => void;

  toggleHideRow: (row: number) => void;
  toggleHideCol: (col: number) => void;
  unhideAllRows: () => void;
  unhideAllCols: () => void;

  toggleFreezeTopRow: () => void;
  toggleFreezeFirstCol: () => void;

  sortByColumn: (col: number, direction: 'asc' | 'desc') => void;
  setColumnFilter: (col: number, allowed: Set<string> | null) => void;
  isRowVisibleByFilter: (row: number) => boolean;

  setSearchTerm: (term: string) => void;
  gotoNextMatch: () => void;
  gotoPrevMatch: () => void;
  replaceCurrentMatch: (replacement: string) => void;
  replaceAllMatches: (term: string, replacement: string) => void;
  toggleFindReplace: (open?: boolean) => void;

  openContextMenu: (x: number, y: number, target: 'cell' | 'row' | 'col') => void;
  closeContextMenu: () => void;

  loadSheet: (
    cells: Map<string, CellData>,
    rowCount: number,
    colCount: number,
    colWidths?: Map<number, number>,
    rowHeights?: Map<number, number>
  ) => void;
  resetSheet: () => void;
  setLoading: (v: boolean) => void;
}

function createDefaultCells(): Map<string, CellData> {
  const cells = new Map<string, CellData>();
  const headers = [
    { text: 'SL.NO', isRed: false },
    { text: 'ITEM DESCRIPTION', isRed: false },
    { text: 'UNIT', isRed: false },
    { text: 'QTY', isRed: false },
    { text: 'REMARKS', isRed: true },
    { text: 'PRICE', isRed: true },
    { text: 'DISCOUNT', isRed: true },
    { text: 'PRICE AFTER DISCOUNT', isRed: true },
    { text: 'QTY', isRed: true },
    { text: 'AMOUNT', isRed: true },
    { text: 'PROFIT', isRed: true },
    { text: 'MATERIAL', isRed: true },
    { text: 'LABOUR', isRed: true },
  ];

  const borderStyle = { style: 'thin' as const, color: '#000000' };

  headers.forEach((h, col) => {
    cells.set(cellKey(0, col), {
      value: h.text,
      format: {
        bold: true,
        hAlign: 'center',
        vAlign: 'middle',
        color: h.isRed ? '#ff0000' : '#000000',
        borders: {
          top: borderStyle,
          bottom: borderStyle,
          left: borderStyle,
          right: borderStyle,
        },
      },
    });
  });

  return cells;
}

function createDefaultColWidths(): Map<number, number> {
  const widths = new Map<number, number>();
  widths.set(0, 60);   // SL.NO
  widths.set(1, 220);  // ITEM DESCRIPTION
  widths.set(2, 60);   // UNIT
  widths.set(3, 60);   // QTY
  widths.set(4, 100);  // REMARKS
  widths.set(5, 80);   // PRICE
  widths.set(6, 80);   // DISCOUNT
  widths.set(7, 180);  // PRICE AFTER DISCOUNT
  widths.set(8, 60);   // QTY
  widths.set(9, 80);   // AMOUNT
  widths.set(10, 80);  // PROFIT
  widths.set(11, 100); // MATERIAL
  widths.set(12, 100); // LABOUR
  return widths;
}

const initialSelection: SelectionState = {
  kind: 'cell',
  range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
  active: { row: 0, col: 0 },
};

const HISTORY_LIMIT = 100;

function snapshot(state: SpreadsheetState): HistoryEntry {
  return {
    cells: new Map(state.cells),
    rowHeights: new Map(state.rowHeights),
    colWidths: new Map(state.colWidths),
    merges: [...state.merges],
    hiddenRows: [...state.hiddenRows],
    hiddenCols: [...state.hiddenCols],
    selection: state.selection,
  };
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  cells: createDefaultCells(),
  rowHeights: new Map(),
  colWidths: createDefaultColWidths(),
  merges: [],
  hiddenRows: new Set(),
  hiddenCols: new Set(),
  frozenRows: 0,
  frozenCols: 0,
  rowCount: DEFAULT_ROW_COUNT,
  colCount: DEFAULT_COL_COUNT,
  version: 0,

  selection: initialSelection,
  editing: null,
  clipboard: null,
  contextMenu: null,
  filters: new Map(),
  sort: null,

  searchTerm: '',
  searchMatches: [],
  searchIndex: -1,
  showFindReplace: false,

  undoStack: [],
  redoStack: [],
  loading: false,

  // ---- read helpers -------------------------------------------------------
  getEvaluatedCell: (row, col) => evaluateCell(row, col, get().cells, new Set()),
  getCellData: (row, col) => get().cells.get(cellKey(row, col)),
  getRowHeight: (row) => get().rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT,
  getColWidth: (col) => get().colWidths.get(col) ?? DEFAULT_COL_WIDTH,
  getMergeFor: (row, col) =>
    get().merges.find(
      (m) => row >= m.start.row && row <= m.end.row && col >= m.start.col && col <= m.end.col
    ),

  // ---- editing -------------------------------------------------------------
  setCellValue: (row, col, value) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map(state.cells);
      const key = cellKey(row, col);
      if (value === '') {
        const existing = cells.get(key);
        if (existing?.format) cells.set(key, { value: '', format: existing.format });
        else cells.delete(key);
      } else {
        const existing = cells.get(key);
        cells.set(key, { value, format: existing?.format });
      }
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  setRangeFormat: (range, patch) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const n = normalizeRange(range);
      const cells = new Map(state.cells);
      for (let r = n.start.row; r <= n.end.row; r++) {
        for (let c = n.start.col; c <= n.end.col; c++) {
          const key = cellKey(r, c);
          const existing = cells.get(key);
          cells.set(key, {
            value: existing?.value ?? '',
            format: { ...existing?.format, ...patch },
          });
        }
      }
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  applyBorders: (range, mode, color) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const n = normalizeRange(range);
      const cells = new Map(state.cells);
      const style = { style: 'thin' as const, color };
      for (let r = n.start.row; r <= n.end.row; r++) {
        for (let c = n.start.col; c <= n.end.col; c++) {
          const key = cellKey(r, c);
          const existing = cells.get(key);
          let borders: CellFormat['borders'] = {};
          if (mode === 'all') {
            borders = { top: style, right: style, bottom: style, left: style };
          } else if (mode === 'outer') {
            borders = {
              top: r === n.start.row ? style : undefined,
              bottom: r === n.end.row ? style : undefined,
              left: c === n.start.col ? style : undefined,
              right: c === n.end.col ? style : undefined,
            };
          } // 'none' -> borders stays {}
          cells.set(key, { value: existing?.value ?? '', format: { ...existing?.format, borders } });
        }
      }
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  clearRange: (range) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const n = normalizeRange(range);
      const cells = new Map(state.cells);
      for (let r = n.start.row; r <= n.end.row; r++) {
        for (let c = n.start.col; c <= n.end.col; c++) {
          const key = cellKey(r, c);
          const existing = cells.get(key);
          if (existing?.format) cells.set(key, { value: '', format: existing.format });
          else cells.delete(key);
        }
      }
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  // ---- selection -----------------------------------------------------------
  setSelection: (range, kind = 'cell', active) => {
    set({ selection: { kind, range, active: active ?? range.start } });
  },
  selectRow: (row) => {
    set((state) => ({
      selection: {
        kind: 'row',
        range: { start: { row, col: 0 }, end: { row, col: state.colCount - 1 } },
        active: { row, col: 0 },
      },
    }));
  },
  selectColumn: (col) => {
    set((state) => ({
      selection: {
        kind: 'column',
        range: { start: { row: 0, col }, end: { row: state.rowCount - 1, col } },
        active: { row: 0, col },
      },
    }));
  },
  selectAll: () => {
    set((state) => ({
      selection: {
        kind: 'all',
        range: { start: { row: 0, col: 0 }, end: { row: state.rowCount - 1, col: state.colCount - 1 } },
        active: { row: 0, col: 0 },
      },
    }));
  },

  startEditing: (coord, initialValue, replaceMode = false) => {
    const data = get().getCellData(coord.row, coord.col);
    set({
      editing: {
        coord,
        value: initialValue !== undefined ? initialValue : data?.value ?? '',
        replaceMode,
      },
    });
  },
  updateEditingValue: (value) => {
    set((state) => (state.editing ? { editing: { ...state.editing, value } } : {}));
  },
  commitEditing: (moveDir = 'down') => {
    const { editing } = get();
    if (!editing) return;
    get().setCellValue(editing.coord.row, editing.coord.col, editing.value);
    set({ editing: null });
    if (moveDir === 'down') {
      const next = { row: editing.coord.row + 1, col: editing.coord.col };
      get().setSelection({ start: next, end: next }, 'cell', next);
    } else if (moveDir === 'right') {
      const next = { row: editing.coord.row, col: editing.coord.col + 1 };
      get().setSelection({ start: next, end: next }, 'cell', next);
    }
  },
  cancelEditing: () => set({ editing: null }),

  // ---- clipboard -------------------------------------------------------------
  copySelection: (cut = false) => {
    const state = get();
    const n = normalizeRange(state.selection.range);
    const cells = new Map<string, CellData>();
    for (let r = n.start.row; r <= n.end.row; r++) {
      for (let c = n.start.col; c <= n.end.col; c++) {
        const key = cellKey(r, c);
        const data = state.cells.get(key);
        if (data) cells.set(key, { ...data });
      }
    }
    set({ clipboard: { mode: cut ? 'cut' : 'copy', range: n, cells } });

    // Best-effort native clipboard sync as TSV for cross-app paste
    try {
      const rows: string[] = [];
      for (let r = n.start.row; r <= n.end.row; r++) {
        const row: string[] = [];
        for (let c = n.start.col; c <= n.end.col; c++) {
          row.push(state.getEvaluatedCell(r, c).display);
        }
        rows.push(row.join('\t'));
      }
      navigator.clipboard?.writeText(rows.join('\n')).catch(() => {});
    } catch {
      /* clipboard API unavailable, ignore */
    }
  },

  pasteAt: (target) => {
    const state = get();
    const { clipboard } = state;
    if (!clipboard) return;
    const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
    const cells = new Map(state.cells);
    const rowOffset = target.row - clipboard.range.start.row;
    const colOffset = target.col - clipboard.range.start.col;

    clipboard.cells.forEach((data, key) => {
      const { row, col } = keyToCoord(key);
      const destRow = row + rowOffset;
      const destCol = col + colOffset;
      if (destRow < 0 || destCol < 0 || destRow >= state.rowCount || destCol >= state.colCount) return;
      let value = data.value;
      if (value.startsWith('=')) {
        value = '=' + shiftFormula(value.slice(1), rowOffset, colOffset);
      }
      cells.set(cellKey(destRow, destCol), { value, format: data.format });
    });

    if (clipboard.mode === 'cut') {
      clipboard.cells.forEach((_, key) => {
        const { row, col } = keyToCoord(key);
        // don't delete if it was also a paste destination (rare overlap edge case ignored for simplicity)
        cells.delete(cellKey(row, col));
      });
    }

    invalidateEvalCache();
    set({
      cells,
      undoStack,
      redoStack: [],
      version: state.version + 1,
      clipboard: clipboard.mode === 'cut' ? null : clipboard,
    });
  },

  // ---- fill handle -------------------------------------------------------------
  fillRange: (source, target) => {
    set((state) => {
      const src = normalizeRange(source);
      const tgt = normalizeRange(target);
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map(state.cells);

      const srcRows = src.end.row - src.start.row + 1;
      const srcCols = src.end.col - src.start.col + 1;
      const vertical = tgt.end.row > src.end.row || tgt.start.row < src.start.row;

      for (let r = tgt.start.row; r <= tgt.end.row; r++) {
        for (let c = tgt.start.col; c <= tgt.end.col; c++) {
          if (r >= src.start.row && r <= src.end.row && c >= src.start.col && c <= src.end.col) continue; // inside source, skip
          if (vertical) {
            // Extend downward/upward: operate per-column using the source column's series
            const colInSrc = src.start.col + ((c - src.start.col) % srcCols);
            const seriesVals: (number | null)[] = [];
            for (let rr = src.start.row; rr <= src.end.row; rr++) {
              const ev = evaluateCell(rr, colInSrc, state.cells, new Set());
              seriesVals.push(typeof ev.raw === 'number' ? ev.raw : null);
            }
            const stepIndex = r > src.end.row ? r - src.end.row : r - src.start.row - srcRows;
            const allNumeric = seriesVals.every((v) => v !== null);
            const sourceRowIdx = ((r - src.start.row) % srcRows + srcRows) % srcRows;
            const sourceRow = src.start.row + sourceRowIdx;
            const sourceData = state.cells.get(cellKey(sourceRow, colInSrc));

            if (allNumeric && srcRows >= 2) {
              const diff = (seriesVals[1]! - seriesVals[0]!);
              const base = r > src.end.row ? seriesVals[seriesVals.length - 1]! : seriesVals[0]!;
              const n = r > src.end.row ? r - src.end.row : r - (src.start.row - 1);
              const newVal = base + diff * n;
              cells.set(cellKey(r, c), { value: String(newVal), format: sourceData?.format });
            } else if (sourceData) {
              let value = sourceData.value;
              if (value.startsWith('=')) value = '=' + shiftFormula(value.slice(1), r - sourceRow, c - colInSrc);
              cells.set(cellKey(r, c), { value, format: sourceData.format });
            }
          } else {
            const rowInSrc = src.start.row + ((r - src.start.row) % srcRows);
            const seriesVals: (number | null)[] = [];
            for (let cc = src.start.col; cc <= src.end.col; cc++) {
              const ev = evaluateCell(rowInSrc, cc, state.cells, new Set());
              seriesVals.push(typeof ev.raw === 'number' ? ev.raw : null);
            }
            const allNumeric = seriesVals.every((v) => v !== null);
            const sourceColIdx = ((c - src.start.col) % srcCols + srcCols) % srcCols;
            const sourceCol = src.start.col + sourceColIdx;
            const sourceData = state.cells.get(cellKey(rowInSrc, sourceCol));

            if (allNumeric && srcCols >= 2) {
              const diff = (seriesVals[1]! - seriesVals[0]!);
              const base = c > src.end.col ? seriesVals[seriesVals.length - 1]! : seriesVals[0]!;
              const n = c > src.end.col ? c - src.end.col : c - (src.start.col - 1);
              const newVal = base + diff * n;
              cells.set(cellKey(r, c), { value: String(newVal), format: sourceData?.format });
            } else if (sourceData) {
              let value = sourceData.value;
              if (value.startsWith('=')) value = '=' + shiftFormula(value.slice(1), r - rowInSrc, c - sourceCol);
              cells.set(cellKey(r, c), { value, format: sourceData.format });
            }
          }
        }
      }
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  // ---- undo / redo -----------------------------------------------------------
  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const entry = state.undoStack[state.undoStack.length - 1];
      const redoStack = [...state.redoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      invalidateEvalCache();
      return {
        cells: entry.cells,
        rowHeights: entry.rowHeights,
        colWidths: entry.colWidths,
        merges: entry.merges,
        hiddenRows: new Set(entry.hiddenRows),
        hiddenCols: new Set(entry.hiddenCols),
        selection: entry.selection,
        undoStack: state.undoStack.slice(0, -1),
        redoStack,
        version: state.version + 1,
      };
    });
  },
  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const entry = state.redoStack[state.redoStack.length - 1];
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      invalidateEvalCache();
      return {
        cells: entry.cells,
        rowHeights: entry.rowHeights,
        colWidths: entry.colWidths,
        merges: entry.merges,
        hiddenRows: new Set(entry.hiddenRows),
        hiddenCols: new Set(entry.hiddenCols),
        selection: entry.selection,
        undoStack,
        redoStack: state.redoStack.slice(0, -1),
        version: state.version + 1,
      };
    });
  },

  // ---- rows / columns --------------------------------------------------------
  insertRowAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        cells.set(cellKey(row >= index ? row + 1 : row, col), data);
      });
      const rowHeights = new Map<number, number>();
      state.rowHeights.forEach((h, r) => rowHeights.set(r >= index ? r + 1 : r, h));
      invalidateEvalCache();
      return { cells, rowHeights, rowCount: state.rowCount + 1, undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  deleteRowAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        if (row === index) return;
        cells.set(cellKey(row > index ? row - 1 : row, col), data);
      });
      invalidateEvalCache();
      return { cells, rowCount: Math.max(1, state.rowCount - 1), undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  duplicateRowAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        cells.set(cellKey(row > index ? row + 1 : row, col), data);
      });
      for (let c = 0; c < state.colCount; c++) {
        const data = state.cells.get(cellKey(index, c));
        if (data) cells.set(cellKey(index + 1, c), { ...data });
      }
      invalidateEvalCache();
      return { cells, rowCount: state.rowCount + 1, undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  insertColAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        cells.set(cellKey(row, col >= index ? col + 1 : col), data);
      });
      const colWidths = new Map<number, number>();
      state.colWidths.forEach((w, c) => colWidths.set(c >= index ? c + 1 : c, w));
      invalidateEvalCache();
      return { cells, colWidths, colCount: state.colCount + 1, undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  deleteColAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        if (col === index) return;
        cells.set(cellKey(row, col > index ? col - 1 : col), data);
      });
      invalidateEvalCache();
      return { cells, colCount: Math.max(1, state.colCount - 1), undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  duplicateColAt: (index) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map<string, CellData>();
      state.cells.forEach((data, key) => {
        const { row, col } = keyToCoord(key);
        cells.set(cellKey(row, col > index ? col + 1 : col), data);
      });
      for (let r = 0; r < state.rowCount; r++) {
        const data = state.cells.get(cellKey(r, index));
        if (data) cells.set(cellKey(r, index + 1), { ...data });
      }
      invalidateEvalCache();
      return { cells, colCount: state.colCount + 1, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  // ---- merges ----------------------------------------------------------------
  mergeSelection: () => {
    set((state) => {
      const n = normalizeRange(state.selection.range);
      if (n.start.row === n.end.row && n.start.col === n.end.col) return {};
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const merges = state.merges.filter(
        (m) => !(m.start.row <= n.end.row && m.end.row >= n.start.row && m.start.col <= n.end.col && m.end.col >= n.start.col)
      );
      merges.push({ id: `${n.start.row}-${n.start.col}-${n.end.row}-${n.end.col}`, ...n });
      return { merges, undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  unmergeSelection: () => {
    set((state) => {
      const n = normalizeRange(state.selection.range);
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const merges = state.merges.filter(
        (m) => !(m.start.row <= n.end.row && m.end.row >= n.start.row && m.start.col <= n.end.col && m.end.col >= n.start.col)
      );
      return { merges, undoStack, redoStack: [], version: state.version + 1 };
    });
  },

  // ---- sizing ------------------------------------------------------------------
  resizeRow: (row, height) => {
    set((state) => {
      const rowHeights = new Map(state.rowHeights);
      rowHeights.set(row, clamp(height, 4, 1000));
      return { rowHeights, version: state.version + 1 };
    });
  },
  resizeColumn: (col, width) => {
    set((state) => {
      const colWidths = new Map(state.colWidths);
      colWidths.set(col, clamp(width, 20, 1000));
      return { colWidths, version: state.version + 1 };
    });
  },
  autoFitRow: (row) => {
    set((state) => {
      let maxLines = 1;
      for (let c = 0; c < Math.min(state.colCount, 200); c++) {
        const ev = state.getEvaluatedCell(row, c);
        if (ev.display) maxLines = Math.max(maxLines, ev.display.split('\n').length);
      }
      const rowHeights = new Map(state.rowHeights);
      rowHeights.set(row, Math.max(DEFAULT_ROW_HEIGHT, maxLines * 16 + 4));
      return { rowHeights, version: state.version + 1 };
    });
  },
  autoFitColumn: (col) => {
    set((state) => {
      let maxLen = 4;
      for (let r = 0; r < Math.min(state.rowCount, 2000); r++) {
        const ev = state.getEvaluatedCell(r, col);
        if (ev.display) maxLen = Math.max(maxLen, ev.display.length);
      }
      const colWidths = new Map(state.colWidths);
      colWidths.set(col, clamp(maxLen * 7.5 + 16, 40, 500));
      return { colWidths, version: state.version + 1 };
    });
  },

  // ---- hide / unhide -------------------------------------------------------------
  toggleHideRow: (row) => {
    set((state) => {
      const hiddenRows = new Set(state.hiddenRows);
      hiddenRows.has(row) ? hiddenRows.delete(row) : hiddenRows.add(row);
      return { hiddenRows, version: state.version + 1 };
    });
  },
  toggleHideCol: (col) => {
    set((state) => {
      const hiddenCols = new Set(state.hiddenCols);
      hiddenCols.has(col) ? hiddenCols.delete(col) : hiddenCols.add(col);
      return { hiddenCols, version: state.version + 1 };
    });
  },
  unhideAllRows: () => set((state) => ({ hiddenRows: new Set(), version: state.version + 1 })),
  unhideAllCols: () => set((state) => ({ hiddenCols: new Set(), version: state.version + 1 })),

  // ---- freeze panes -----------------------------------------------------------------
  toggleFreezeTopRow: () => set((state) => ({ frozenRows: state.frozenRows ? 0 : 1 })),
  toggleFreezeFirstCol: () => set((state) => ({ frozenCols: state.frozenCols ? 0 : 1 })),

  // ---- sort / filter ------------------------------------------------------------------
  sortByColumn: (col, direction) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      // Determine the contiguous data extent (last row with any data)
      let lastRow = 0;
      state.cells.forEach((_, key) => {
        const { row } = keyToCoord(key);
        if (row > lastRow) lastRow = row;
      });
      const rowIndices = Array.from({ length: lastRow + 1 }, (_, i) => i);
      rowIndices.sort((a, b) => {
        const va = state.getEvaluatedCell(a, col).raw;
        const vb = state.getEvaluatedCell(b, col).raw;
        const na = typeof va === 'number' ? va : va === null ? -Infinity : String(va);
        const nb = typeof vb === 'number' ? vb : vb === null ? -Infinity : String(vb);
        if (typeof na === 'number' && typeof nb === 'number') return direction === 'asc' ? na - nb : nb - na;
        return direction === 'asc' ? String(na).localeCompare(String(nb)) : String(nb).localeCompare(String(na));
      });
      const cells = new Map<string, CellData>();
      // copy rows beyond sorted extent unchanged
      state.cells.forEach((data, key) => {
        const { row, col: c } = keyToCoord(key);
        if (row > lastRow) cells.set(key, data);
      });
      for (let newRow = 0; newRow <= lastRow; newRow++) {
        const oldRow = rowIndices[newRow];
        for (let c = 0; c < state.colCount; c++) {
          const data = state.cells.get(cellKey(oldRow, c));
          if (data) cells.set(cellKey(newRow, c), data);
        }
      }
      invalidateEvalCache();
      return { cells, sort: { col, direction }, undoStack, redoStack: [], version: state.version + 1 };
    });
  },
  setColumnFilter: (col, allowed) => {
    set((state) => {
      const filters = new Map(state.filters);
      if (allowed === null) filters.delete(col);
      else filters.set(col, allowed);
      return { filters, version: state.version + 1 };
    });
  },
  isRowVisibleByFilter: (row) => {
    const state = get();
    if (state.filters.size === 0) return true;
    for (const [col, allowed] of state.filters) {
      const display = state.getEvaluatedCell(row, col).display;
      if (!allowed.has(display)) return false;
    }
    return true;
  },

  // ---- find & replace -----------------------------------------------------------------
  setSearchTerm: (term) => {
    set((state) => {
      if (!term) return { searchTerm: '', searchMatches: [], searchIndex: -1 };
      const matches: CellCoord[] = [];
      const lower = term.toLowerCase();
      state.cells.forEach((_, key) => {
        const { row, col } = keyToCoord(key);
        const display = state.getEvaluatedCell(row, col).display;
        if (display.toLowerCase().includes(lower)) matches.push({ row, col });
      });
      matches.sort((a, b) => (a.row - b.row) || (a.col - b.col));
      return { searchTerm: term, searchMatches: matches, searchIndex: matches.length ? 0 : -1 };
    });
    const first = get().searchMatches[0];
    if (first) get().setSelection({ start: first, end: first }, 'cell', first);
  },
  gotoNextMatch: () => {
    set((state) => {
      if (state.searchMatches.length === 0) return {};
      const idx = (state.searchIndex + 1) % state.searchMatches.length;
      return { searchIndex: idx };
    });
    const state = get();
    const m = state.searchMatches[state.searchIndex];
    if (m) state.setSelection({ start: m, end: m }, 'cell', m);
  },
  gotoPrevMatch: () => {
    set((state) => {
      if (state.searchMatches.length === 0) return {};
      const idx = (state.searchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      return { searchIndex: idx };
    });
    const state = get();
    const m = state.searchMatches[state.searchIndex];
    if (m) state.setSelection({ start: m, end: m }, 'cell', m);
  },
  replaceCurrentMatch: (replacement) => {
    const state = get();
    const m = state.searchMatches[state.searchIndex];
    if (!m) return;
    const data = state.getCellData(m.row, m.col);
    const newVal = (data?.value ?? '').split(state.searchTerm).join(replacement);
    state.setCellValue(m.row, m.col, newVal);
    state.setSearchTerm(state.searchTerm);
  },
  replaceAllMatches: (term, replacement) => {
    set((state) => {
      const undoStack = [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT);
      const cells = new Map(state.cells);
      const lower = term.toLowerCase();
      cells.forEach((data, key) => {
        if (data.value.toLowerCase().includes(lower)) {
          const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          cells.set(key, { ...data, value: data.value.replace(re, replacement) });
        }
      });
      invalidateEvalCache();
      return { cells, undoStack, redoStack: [], version: state.version + 1, searchMatches: [], searchIndex: -1 };
    });
  },
  toggleFindReplace: (open) => set((state) => ({ showFindReplace: open ?? !state.showFindReplace })),

  // ---- context menu -----------------------------------------------------------------
  openContextMenu: (x, y, target) => set({ contextMenu: { x, y, target } }),
  closeContextMenu: () => set({ contextMenu: null }),

  // ---- import / reset -----------------------------------------------------------------
  loadSheet: (cells, rowCount, colCount, colWidths, rowHeights) => {
    invalidateEvalCache();
    set({
      cells,
      rowCount: Math.max(rowCount, DEFAULT_ROW_COUNT),
      colCount: Math.max(colCount, DEFAULT_COL_COUNT),
      rowHeights: rowHeights ? new Map(rowHeights) : new Map(),
      colWidths: colWidths ? new Map(colWidths) : new Map(),
      merges: [],
      hiddenRows: new Set(),
      hiddenCols: new Set(),
      undoStack: [],
      redoStack: [],
      selection: initialSelection,
      version: 0,
    });
  },
  resetSheet: () => {
    invalidateEvalCache();
    set({
      cells: createDefaultCells(),
      rowHeights: new Map(),
      colWidths: createDefaultColWidths(),
      merges: [],
      hiddenRows: new Set(),
      hiddenCols: new Set(),
      frozenRows: 0,
      frozenCols: 0,
      undoStack: [],
      redoStack: [],
      selection: initialSelection,
      version: 0,
    });
  },
  setLoading: (v) => set({ loading: v }),
}));
