"use client";

import React, { useEffect, useRef } from 'react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';
import { normalizeRange } from '@/components/spreadsheet/utils/cellUtils';

function MenuItem({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="w-full text-left px-3 py-1.5 text-sm hover:bg-excel-header-active disabled:opacity-40 disabled:hover:bg-transparent"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Separator() {
  return <div className="h-px bg-excel-border my-1" />;
}

export default function ContextMenu() {
  const store = useSpreadsheetStore();
  const { contextMenu, selection } = store;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => store.closeContextMenu();
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu, store]);

  if (!contextMenu) return null;
  const n = normalizeRange(selection.range);

  const close = (fn: () => void) => () => {
    fn();
    store.closeContextMenu();
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-excel-border rounded shadow-lg py-1 w-52 text-gray-800"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <MenuItem label="Copy" onClick={close(() => store.copySelection(false))} />
      <MenuItem label="Cut" onClick={close(() => store.copySelection(true))} />
      <MenuItem label="Paste" onClick={close(() => store.pasteAt(selection.active))} />
      <Separator />

      {contextMenu.target === 'row' && (
        <>
          <MenuItem label="Insert row above" onClick={close(() => store.insertRowAt(n.start.row))} />
          <MenuItem label="Delete row" onClick={close(() => store.deleteRowAt(n.start.row))} />
          <MenuItem label="Duplicate row" onClick={close(() => store.duplicateRowAt(n.start.row))} />
          <MenuItem label="Hide row" onClick={close(() => store.toggleHideRow(n.start.row))} />
          <MenuItem label="Unhide all rows" onClick={close(() => store.unhideAllRows())} />
          <MenuItem label="Autofit row height" onClick={close(() => store.autoFitRow(n.start.row))} />
          <Separator />
        </>
      )}

      {contextMenu.target === 'col' && (
        <>
          <MenuItem label="Insert column left" onClick={close(() => store.insertColAt(n.start.col))} />
          <MenuItem label="Delete column" onClick={close(() => store.deleteColAt(n.start.col))} />
          <MenuItem label="Duplicate column" onClick={close(() => store.duplicateColAt(n.start.col))} />
          <MenuItem label="Hide column" onClick={close(() => store.toggleHideCol(n.start.col))} />
          <MenuItem label="Unhide all columns" onClick={close(() => store.unhideAllCols())} />
          <MenuItem label="Autofit column width" onClick={close(() => store.autoFitColumn(n.start.col))} />
          <Separator />
        </>
      )}

      <MenuItem label="Merge cells" onClick={close(() => store.mergeSelection())} disabled={n.start.row === n.end.row && n.start.col === n.end.col} />
      <MenuItem label="Unmerge cells" onClick={close(() => store.unmergeSelection())} />
      <Separator />
      <MenuItem label="Clear contents" onClick={close(() => store.clearRange(selection.range))} />
    </div>
  );
}
