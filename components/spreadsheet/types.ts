// ============================================================================
// Core type definitions for the spreadsheet engine.
// Kept framework-agnostic so they can be reused by the formula engine,
// the file-IO utilities and the React layer alike.
// ============================================================================

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export type NumberFormat =
  | 'general'
  | 'number'
  | 'number2'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'time';

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted' | 'double';
  color: string;
}

export interface CellBorders {
  top?: BorderStyle;
  right?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string; // font color
  bgColor?: string; // background/fill color
  hAlign?: HAlign;
  vAlign?: VAlign;
  wrap?: boolean;
  rotation?: number; // degrees, -90 to 90
  numberFormat?: NumberFormat;
  borders?: CellBorders;
}

/** A single cell's raw data as stored in the sheet model. */
export interface CellData {
  /** Raw input exactly as typed by the user, e.g. "=SUM(A1:A5)" or "Hello" or "42" */
  value: string;
  format?: CellFormat;
}

/** A resolved cell value + any evaluation error, kept in a separate cache
 *  so raw input (for the formula bar) and computed output (for display)
 *  never get confused. */
export interface EvaluatedCell {
  display: string;
  raw: string | number | boolean | null;
  error?: string;
}

export interface CellCoord {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellCoord;
  end: CellCoord;
}

export type SelectionKind = 'cell' | 'row' | 'column' | 'all';

export interface SelectionState {
  kind: SelectionKind;
  /** Active/anchor-normalized range. start <= end always after normalization. */
  range: CellRange;
  /** The single cell that receives keystrokes / shows in the name box. */
  active: CellCoord;
}

export interface MergedRange extends CellRange {
  id: string;
}

export interface HistoryEntry {
  cells: Map<string, CellData>;
  rowHeights: Map<number, number>;
  colWidths: Map<number, number>;
  merges: MergedRange[];
  hiddenRows: number[];
  hiddenCols: number[];
  selection: SelectionState;
}

export interface SheetData {
  cells: Map<string, CellData>;
  rowHeights: Map<number, number>;
  colWidths: Map<number, number>;
  merges: MergedRange[];
  hiddenRows: Set<number>;
  hiddenCols: Set<number>;
  frozenRows: number; // 0 or 1
  frozenCols: number; // 0 or 1
  rowCount: number;
  colCount: number;
}

/** Everything a sheet tab needs to fully restore itself when switched back to,
 *  including its own undo history and cursor position. */
export interface SheetSnapshot extends SheetData {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  selection: SelectionState;
}

/** One tab in the workbook — the currently-active tab's snapshot is kept live in
 *  the store's flat top-level fields; inactive tabs' snapshots sit here until
 *  switched back to. */
export interface SheetTab {
  id: string;
  name: string;
  snapshot: SheetSnapshot;
}

/** Plain-JSON-serializable form of a sheet, suitable for a Prisma `Json` column
 *  (Maps/Sets become entry arrays). Undo/redo history is intentionally dropped —
 *  it's a within-session convenience, not something worth persisting. */
export interface SerializedSheet {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  cells: [string, CellData][];
  colWidths: [number, number][];
  rowHeights: [number, number][];
  merges: MergedRange[];
  hiddenRows: number[];
  hiddenCols: number[];
  frozenRows: number;
  frozenCols: number;
}

export interface SerializedWorkbook {
  sheets: SerializedSheet[];
  activeSheetId: string;
}

export type ClipboardMode = 'copy' | 'cut' | null;

export interface ClipboardData {
  mode: ClipboardMode;
  range: CellRange;
  cells: Map<string, CellData>;
}

export interface SortState {
  col: number;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  col: number;
  /** Set of allowed raw display values; if undefined, no filter applied on this column */
  allowed: Set<string>;
}
