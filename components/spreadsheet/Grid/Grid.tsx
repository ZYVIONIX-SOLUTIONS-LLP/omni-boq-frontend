"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';
import { useAxisLayout } from '@/components/spreadsheet/hooks/useAxisLayout';
import {
  cellKey,
  colToLetter,
  COL_HEADER_HEIGHT,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  normalizeRange,
  ROW_HEADER_WIDTH,
} from '@/components/spreadsheet/utils/cellUtils';
import type { CellCoord, CellRange } from '@/components/spreadsheet/types';
import { GridCell } from './GridCell';

const BUFFER = 4;

export default function Grid() {
  const store = useSpreadsheetStore();
  const {
    rowCount,
    colCount,
    rowHeights,
    colWidths,
    hiddenRows,
    hiddenCols,
    merges,
    frozenRows,
    frozenCols,
    selection,
    editing,
    contextMenu,
  } = store;

  const outerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const colHeaderRef = useRef<HTMLDivElement>(null);
  const rowHeaderRef = useRef<HTMLDivElement>(null);
  const frozenRowRef = useRef<HTMLDivElement>(null);
  const frozenColRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });

  const rowLayout = useAxisLayout(rowCount, DEFAULT_ROW_HEIGHT, rowHeights, hiddenRows);
  const colLayout = useAxisLayout(colCount, DEFAULT_COL_WIDTH, colWidths, hiddenCols);

  // Track container size responsively
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      setViewport({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
    if (colHeaderRef.current) colHeaderRef.current.scrollLeft = el.scrollLeft;
    if (rowHeaderRef.current) rowHeaderRef.current.scrollTop = el.scrollTop;
    if (frozenRowRef.current) frozenRowRef.current.scrollLeft = el.scrollLeft;
    if (frozenColRef.current) frozenColRef.current.scrollTop = el.scrollTop;
  }, []);

  // ---- visible range computation -------------------------------------------------
  const bodyLeftOffset = frozenCols ? colLayout.sizeOf(0) : 0;
  const bodyTopOffset = frozenRows ? rowLayout.sizeOf(0) : 0;

  const visibleRows = useMemo(() => {
    const start = Math.max(frozenRows ? 1 : 0, rowLayout.indexAtPosition(scrollTop) - BUFFER);
    const end = Math.min(rowCount - 1, rowLayout.indexAtPosition(scrollTop + viewport.h) + BUFFER);
    const arr: number[] = [];
    for (let r = start; r <= end; r++) if (!hiddenRows.has(r)) arr.push(r);
    return arr;
  }, [scrollTop, viewport.h, rowLayout, rowCount, hiddenRows, frozenRows]);

  const visibleCols = useMemo(() => {
    const start = Math.max(frozenCols ? 1 : 0, colLayout.indexAtPosition(scrollLeft) - BUFFER);
    const end = Math.min(colCount - 1, colLayout.indexAtPosition(scrollLeft + viewport.w) + BUFFER);
    const arr: number[] = [];
    for (let c = start; c <= end; c++) if (!hiddenCols.has(c)) arr.push(c);
    return arr;
  }, [scrollLeft, viewport.w, colLayout, colCount, hiddenCols, frozenCols]);

  // ---- merge lookup for the currently visible window -------------------------------
  const mergeAt = useCallback(
    (row: number, col: number) => merges.find((m) => row >= m.start.row && row <= m.end.row && col >= m.start.col && col <= m.end.col),
    [merges]
  );

  // ---- coordinate <-> pixel helpers ------------------------------------------------
  const coordFromClientPos = useCallback(
    (clientX: number, clientY: number): CellCoord | null => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = clientX - rect.left + scrollLeft;
      const y = clientY - rect.top + scrollTop;
      if (x < 0 || y < 0) return null;
      return { row: rowLayout.indexAtPosition(y), col: colLayout.indexAtPosition(x) };
    },
    [scrollLeft, scrollTop, rowLayout, colLayout]
  );

  // ---- selection drag ---------------------------------------------------------------
  const selectingRef = useRef<{ anchor: CellCoord } | null>(null);
  const fillDragRef = useRef<{ source: CellRange } | null>(null);

  const handleCellMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      outerRef.current?.focus();
      if (store.editing) store.commitEditing('none');
      const merge = mergeAt(row, col);
      const anchor = merge ? merge.start : { row, col };
      if (e.shiftKey) {
        store.setSelection({ start: store.selection.range.start, end: { row, col } }, 'cell', { row, col });
      } else {
        selectingRef.current = { anchor };
        store.setSelection({ start: anchor, end: merge ? merge.end : anchor }, 'cell', anchor);
      }
    },
    [store, mergeAt]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (fillDragRef.current) return; // handled separately
      if (!selectingRef.current) return;
      const coord = coordFromClientPos(e.clientX, e.clientY);
      if (!coord) return;
      store.setSelection({ start: selectingRef.current.anchor, end: coord }, 'cell', selectingRef.current.anchor);
    };
    const onUp = () => {
      selectingRef.current = null;
      if (fillDragRef.current) {
        fillDragRef.current = null;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [coordFromClientPos, store]);

  // ---- fill handle drag ---------------------------------------------------------------
  const startFillDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const source = normalizeRange(store.selection.range);
      fillDragRef.current = { source };

      const onMove = (ev: MouseEvent) => {
        const coord = coordFromClientPos(ev.clientX, ev.clientY);
        if (!coord || !fillDragRef.current) return;
        const src = fillDragRef.current.source;
        // Extend either vertically or horizontally, whichever the user dragged further
        const dRow = coord.row > src.end.row ? coord.row - src.end.row : coord.row < src.start.row ? coord.row - src.start.row : 0;
        const dCol = coord.col > src.end.col ? coord.col - src.end.col : coord.col < src.start.col ? coord.col - src.start.col : 0;
        let preview: CellRange;
        if (Math.abs(dRow) >= Math.abs(dCol)) {
          preview = { start: src.start, end: { row: coord.row, col: src.end.col } };
        } else {
          preview = { start: src.start, end: { row: src.end.row, col: coord.col } };
        }
        store.setSelection(preview, 'cell', src.start);
      };
      const onUp = () => {
        const finalRange = normalizeRange(store.selection.range);
        if (!(finalRange.start.row === source.start.row && finalRange.start.col === source.start.col && finalRange.end.row === source.end.row && finalRange.end.col === source.end.col)) {
          store.fillRange(source, finalRange);
        }
        fillDragRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [store, coordFromClientPos]
  );

  // ---- column / row resize ---------------------------------------------------------------
  const startColResize = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = colLayout.sizeOf(col);
      const onMove = (ev: MouseEvent) => store.resizeColumn(col, startWidth + (ev.clientX - startX));
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [colLayout, store]
  );

  const startRowResize = useCallback(
    (row: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = rowLayout.sizeOf(row);
      const onMove = (ev: MouseEvent) => store.resizeRow(row, startHeight + (ev.clientY - startY));
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [rowLayout, store]
  );

  // ---- editing ---------------------------------------------------------------------------
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      if (editing.replaceMode) editInputRef.current.select();
      else editInputRef.current.setSelectionRange(len, len);
    }
  }, [editing?.coord.row, editing?.coord.col]);

  const beginEdit = useCallback(
    (row: number, col: number, initial?: string, replaceMode = false) => {
      store.startEditing({ row, col }, initial, replaceMode);
    },
    [store]
  );

  // ---- keyboard navigation ------------------------------------------------------------------
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { active, range } = store.selection;

      if (editing) {
        if (e.key === 'Enter') {
          e.preventDefault();
          store.commitEditing('down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          store.commitEditing('right');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          store.cancelEditing();
        }
        return;
      }

      const move = (dr: number, dc: number, extend: boolean) => {
        e.preventDefault();
        const base = extend ? active : { row: active.row, col: active.col };
        const target = extend ? { row: range.end.row + dr, col: range.end.col + dc } : { row: active.row + dr, col: active.col + dc };
        const clampedRow = Math.max(0, Math.min(rowCount - 1, target.row));
        const clampedCol = Math.max(0, Math.min(colCount - 1, target.col));
        if (extend) {
          store.setSelection({ start: range.start, end: { row: clampedRow, col: clampedCol } }, 'cell', range.start);
        } else {
          const coord = { row: clampedRow, col: clampedCol };
          store.setSelection({ start: coord, end: coord }, 'cell', coord);
        }
      };

      switch (e.key) {
        case 'ArrowDown':
          return move(1, 0, e.shiftKey);
        case 'ArrowUp':
          return move(-1, 0, e.shiftKey);
        case 'ArrowLeft':
          return move(0, -1, e.shiftKey);
        case 'ArrowRight':
          return move(0, 1, e.shiftKey);
        case 'Tab':
          e.preventDefault();
          return move(0, 1, false);
        case 'Enter':
          e.preventDefault();
          return move(1, 0, false);
        case 'F2':
          e.preventDefault();
          return beginEdit(active.row, active.col);
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          return store.clearRange(range);
        case 'Escape':
          store.closeContextMenu();
          return;
        default:
          break;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            return store.copySelection(false);
          case 'x':
            e.preventDefault();
            return store.copySelection(true);
          case 'v':
            e.preventDefault();
            return store.pasteAt(active);
          case 'z':
            e.preventDefault();
            return store.undo();
          case 'y':
            e.preventDefault();
            return store.redo();
          case 'a':
            e.preventDefault();
            return store.selectAll();
          case 'b':
            e.preventDefault();
            return store.setRangeFormat(range, { bold: !store.getCellData(active.row, active.col)?.format?.bold });
          case 'i':
            e.preventDefault();
            return store.setRangeFormat(range, { italic: !store.getCellData(active.row, active.col)?.format?.italic });
          case 'u':
            e.preventDefault();
            return store.setRangeFormat(range, { underline: !store.getCellData(active.row, active.col)?.format?.underline });
          case 'f':
            e.preventDefault();
            return store.toggleFindReplace(true);
          default:
            break;
        }
      }

      // Printable character -> start editing in replace mode
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        beginEdit(active.row, active.col, e.key, true);
      }
    },
    [store, editing, beginEdit, rowCount, colCount]
  );

  // ---- context menu -------------------------------------------------------------------------
  const onCellContextMenu = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (!(row >= normalizeRange(store.selection.range).start.row && row <= normalizeRange(store.selection.range).end.row &&
            col >= normalizeRange(store.selection.range).start.col && col <= normalizeRange(store.selection.range).end.col)) {
        const coord = { row, col };
        store.setSelection({ start: coord, end: coord }, 'cell', coord);
      }
      store.openContextMenu(e.clientX, e.clientY, 'cell');
    },
    [store]
  );

  // ---- render helpers -------------------------------------------------------------------------
  const renderedMergeKeys = useMemo(() => {
    const set = new Set<string>();
    merges.forEach((m) => {
      for (let r = m.start.row; r <= m.end.row; r++)
        for (let c = m.start.col; c <= m.end.col; c++) set.add(cellKey(r, c));
    });
    return set;
  }, [merges]);

  const sel = normalizeRange(selection.range);

  function renderCellsFor(rows: number[], cols: number[], keyPrefix: string, offsetMode: 'main' | 'raw' = 'main') {
    const nodes: React.ReactNode[] = [];
    for (const row of rows) {
      for (const col of cols) {
        const key = cellKey(row, col);
        const merge = mergeAt(row, col);
        if (merge && (merge.start.row !== row || merge.start.col !== col)) continue; // covered by span

        const top = offsetMode === 'main' ? rowLayout.offsets[row] - (frozenRows ? bodyTopOffset : 0) : rowLayout.offsets[row];
        const left = offsetMode === 'main' ? colLayout.offsets[col] - (frozenCols ? bodyLeftOffset : 0) : colLayout.offsets[col];
        const width = merge ? colLayout.offsets[merge.end.col + 1] - colLayout.offsets[merge.start.col] : colLayout.sizeOf(col);
        const height = merge ? rowLayout.offsets[merge.end.row + 1] - rowLayout.offsets[merge.start.row] : rowLayout.sizeOf(row);

        const data = store.getCellData(row, col);
        const ev = store.getEvaluatedCell(row, col);
        const isActive = selection.active.row === row && selection.active.col === col;
        const isSelected =
          row >= sel.start.row && row <= sel.end.row && col >= sel.start.col && col <= sel.end.col && !isActive;

        nodes.push(
          <GridCell
            key={`${keyPrefix}-${key}`}
            left={left}
            top={top}
            width={width}
            height={height}
            display={editing && editing.coord.row === row && editing.coord.col === col ? '' : ev.display}
            format={data?.format}
            isError={!!ev.error}
            isActive={isActive}
            isSelected={isSelected}
            onMouseDown={(e) => handleCellMouseDown(row, col, e)}
            onDoubleClick={() => beginEdit(row, col)}
            onContextMenu={(e) => onCellContextMenu(row, col, e)}
          />
        );
      }
    }
    return nodes;
  }

  // Selection overlay rectangle (drawn over main body only, approximated ignoring frozen offset nuance)
  const selectionOverlayStyle: React.CSSProperties | null = useMemo(() => {
    if (sel.start.row === sel.end.row && sel.start.col === sel.end.col) return null;
    const left = colLayout.offsets[sel.start.col];
    const top = rowLayout.offsets[sel.start.row];
    const width = colLayout.offsets[sel.end.col + 1] - left;
    const height = rowLayout.offsets[sel.end.row + 1] - top;
    return { position: 'absolute', left, top, width, height, border: '2px solid #0f6cbd', pointerEvents: 'none', boxSizing: 'border-box', zIndex: 5 };
  }, [sel, colLayout, rowLayout]);

  // Fill handle position: bottom-right corner of selection/active cell
  const fillHandleStyle: React.CSSProperties = useMemo(() => {
    const left = colLayout.offsets[sel.end.col + 1];
    const top = rowLayout.offsets[sel.end.row + 1];
    return {
      position: 'absolute',
      left: left - 4,
      top: top - 4,
      width: 7,
      height: 7,
      background: '#0f6cbd',
      border: '1px solid #fff',
      cursor: 'crosshair',
      zIndex: 6,
    };
  }, [sel, colLayout, rowLayout]);

  const editingStyle: React.CSSProperties | null = useMemo(() => {
    if (!editing) return null;
    const merge = mergeAt(editing.coord.row, editing.coord.col);
    const r = merge ?? { start: editing.coord, end: editing.coord };
    const left = colLayout.offsets[r.start.col];
    const top = rowLayout.offsets[r.start.row];
    const width = Math.max(colLayout.offsets[r.end.col + 1] - left, 60);
    const height = rowLayout.offsets[r.end.row + 1] - top;
    return { position: 'absolute', left, top, minWidth: width, minHeight: height, zIndex: 10 };
  }, [editing, colLayout, rowLayout, mergeAt]);

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 overflow-hidden bg-white outline-none no-select"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Corner box */}
      <div
        className="absolute top-0 left-0 bg-excel-header border-b border-r border-excel-border flex items-end justify-center z-30"
        style={{ width: ROW_HEADER_WIDTH, height: COL_HEADER_HEIGHT }}
        onClick={() => store.selectAll()}
      >
        <svg width="10" height="8" viewBox="0 0 10 8"><path d="M0 0 L10 8 L0 8 Z" fill="#c7c7c7" /></svg>
      </div>

      {/* Column headers */}
      <div
        ref={colHeaderRef}
        className="absolute top-0 overflow-hidden bg-excel-header z-20 border-b border-excel-border"
        style={{ left: ROW_HEADER_WIDTH, right: 0, height: COL_HEADER_HEIGHT }}
      >
        <div style={{ position: 'relative', width: colLayout.totalSize, height: COL_HEADER_HEIGHT }}>
          {visibleCols.concat(frozenCols ? [0] : []).map((col) => {
            const isSel = col >= sel.start.col && col <= sel.end.col;
            return (
              <div
                key={col}
                className={`absolute top-0 flex items-center justify-center text-xs border-r border-excel-border select-none ${isSel ? 'bg-excel-header-active font-semibold' : ''}`}
                style={{ left: colLayout.offsets[col], width: colLayout.sizeOf(col), height: COL_HEADER_HEIGHT }}
                onMouseDown={() => store.selectColumn(col)}
                onContextMenu={(e) => { e.preventDefault(); store.selectColumn(col); store.openContextMenu(e.clientX, e.clientY, 'col'); }}
              >
                {colToLetter(col)}
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-excel-selection"
                  onMouseDown={(e) => startColResize(col, e)}
                  onDoubleClick={() => store.autoFitColumn(col)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Row headers */}
      <div
        ref={rowHeaderRef}
        className="absolute left-0 overflow-hidden bg-excel-header z-20 border-r border-excel-border"
        style={{ top: COL_HEADER_HEIGHT, bottom: 0, width: ROW_HEADER_WIDTH }}
      >
        <div style={{ position: 'relative', width: ROW_HEADER_WIDTH, height: rowLayout.totalSize }}>
          {visibleRows.concat(frozenRows ? [0] : []).map((row) => {
            const isSel = row >= sel.start.row && row <= sel.end.row;
            return (
              <div
                key={row}
                className={`absolute left-0 flex items-center justify-center text-xs border-b border-excel-border select-none ${isSel ? 'bg-excel-header-active font-semibold' : ''}`}
                style={{ top: rowLayout.offsets[row], height: rowLayout.sizeOf(row), width: ROW_HEADER_WIDTH }}
                onMouseDown={() => store.selectRow(row)}
                onContextMenu={(e) => { e.preventDefault(); store.selectRow(row); store.openContextMenu(e.clientX, e.clientY, 'row'); }}
              >
                {row + 1}
                <div
                  className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-excel-selection"
                  onMouseDown={(e) => startRowResize(row, e)}
                  onDoubleClick={() => store.autoFitRow(row)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Frozen top-row strip (only when freeze-top-row is enabled) */}
      {frozenRows > 0 && (
        <div
          ref={frozenRowRef}
          className="absolute overflow-hidden bg-white z-10 border-b-2 border-excel-selection"
          style={{ left: ROW_HEADER_WIDTH, top: COL_HEADER_HEIGHT, right: 0, height: rowLayout.sizeOf(0) }}
        >
          <div style={{ position: 'relative', width: colLayout.totalSize, height: rowLayout.sizeOf(0) }}>
            {renderCellsFor([0], visibleCols, 'frozrow', 'raw')}
          </div>
        </div>
      )}

      {/* Frozen first-column strip */}
      {frozenCols > 0 && (
        <div
          ref={frozenColRef}
          className="absolute overflow-hidden bg-white z-10 border-r-2 border-excel-selection"
          style={{ left: ROW_HEADER_WIDTH, top: COL_HEADER_HEIGHT + (frozenRows ? rowLayout.sizeOf(0) : 0), bottom: 0, width: colLayout.sizeOf(0) }}
        >
          <div style={{ position: 'relative', width: colLayout.sizeOf(0), height: rowLayout.totalSize }}>
            {renderCellsFor(visibleRows, [0], 'frozcol', 'raw')}
          </div>
        </div>
      )}

      {/* Top-left intersection cell (visible only when BOTH freeze panes are active) */}
      {frozenRows > 0 && frozenCols > 0 && (
        <div
          className="absolute z-20 bg-white border-b-2 border-r-2 border-excel-selection"
          style={{ left: ROW_HEADER_WIDTH, top: COL_HEADER_HEIGHT, width: colLayout.sizeOf(0), height: rowLayout.sizeOf(0) }}
        >
          {renderCellsFor([0], [0], 'corner', 'raw')}
        </div>
      )}

      {/* Main scrollable body */}
      <div
        ref={bodyRef}
        className="absolute overflow-auto excel-scroll"
        style={{
          left: ROW_HEADER_WIDTH + (frozenCols ? colLayout.sizeOf(0) : 0),
          top: COL_HEADER_HEIGHT + (frozenRows ? rowLayout.sizeOf(0) : 0),
          right: 0,
          bottom: 0,
        }}
        onScroll={onBodyScroll}
      >
        <div
          style={{
            position: 'relative',
            width: colLayout.totalSize - bodyLeftOffset,
            height: rowLayout.totalSize - bodyTopOffset,
          }}
        >
          {renderCellsFor(visibleRows, visibleCols, 'main')}
          {selectionOverlayStyle && <div style={selectionOverlayStyle} />}
          <div style={fillHandleStyle} onMouseDown={startFillDrag} />

          {editing && editingStyle && (
            <textarea
              ref={editInputRef}
              className="excel-scroll"
              style={{
                ...editingStyle,
                border: '2px solid #0f6cbd',
                outline: 'none',
                resize: 'none',
                padding: '1px 3px',
                font: '13px Calibri, Segoe UI, Arial, sans-serif',
                background: '#fff',
                overflow: 'hidden',
              }}
              value={editing.value}
              onChange={(e) => store.updateEditingValue(e.target.value)}
              onBlur={() => store.commitEditing('none')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
