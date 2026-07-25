"use client";

import React, { useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Undo2, Redo2, Copy, Scissors, ClipboardPaste,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  WrapText, Merge, Grid3x3, RotateCw, Search, Rows, Columns, Trash2, Plus,
  Pin, PinOff, Download, Upload, FileSpreadsheet, FileJson, FileText, ArrowDownAZ, ArrowUpZA,
  Filter, Save,
} from 'lucide-react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';
import type { NumberFormat } from '@/components/spreadsheet/types';
import { normalizeRange } from '@/components/spreadsheet/utils/cellUtils';
import {
  exportCsv, exportJson, exportXlsx, importCsv, importJsonFile, importXlsx,
} from '@/components/spreadsheet/utils/fileIO';

function ToolbarButton({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded hover:bg-gray-200 active:bg-gray-300 ${active ? 'bg-excel-header-active' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-excel-border mx-1" />;
}

const FONTS = ['Calibri', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];

export default function Toolbar() {
  const store = useSpreadsheetStore();
  const { selection } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportKind, setPendingImportKind] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  const activeFormat = store.getCellData(selection.active.row, selection.active.col)?.format;

  const patch = (p: Parameters<typeof store.setRangeFormat>[1]) => store.setRangeFormat(selection.range, p);

  const handleImportFile = async (file: File) => {
    store.setLoading(true);
    try {
      if (pendingImportKind === 'xlsx') {
        const { cells, rowCount, colCount } = await importXlsx(file);
        store.loadSheet(cells, rowCount, colCount);
      } else if (pendingImportKind === 'csv') {
        const { cells, rowCount, colCount } = await importCsv(file);
        store.loadSheet(cells, rowCount, colCount);
      } else {
        const json = await importJsonFile(file);
        const cells = new Map<string, any>(json.cells);
        store.loadSheet(cells, json.rowCount ?? 100, json.colCount ?? 26);
      }
    } finally {
      store.setLoading(false);
    }
  };

  const doExportXlsx = () => {
    const n = { start: { row: 0, col: 0 }, end: { row: Math.min(store.rowCount - 1, 999), col: store.colCount - 1 } };
    exportXlsx((r, c) => store.getEvaluatedCell(r, c).display, n.end.row + 1, n.end.col + 1);
  };
  const doExportCsv = () => {
    exportCsv((r, c) => store.getEvaluatedCell(r, c).display, Math.min(store.rowCount, 1000), store.colCount);
  };
  const doExportJson = () => {
    exportJson({
      rowCount: store.rowCount,
      colCount: store.colCount,
      cells: Array.from(store.cells.entries()),
    });
  };

  return (
    <div className="border-b border-excel-border bg-excel-toolbar shrink-0">
      {/* Title bar */}
      {/* <div className="flex items-center gap-2 px-3 h-9 bg-excel-green text-white text-sm font-medium">
        <Grid3x3 size={16} />
        <span>Sheets</span>
        <span className="opacity-70 font-normal">— Untitled workbook</span>
      </div> */}

      {/* Ribbon */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1">
        {/* Undo/redo */}
        <ToolbarButton title="Undo (Ctrl+Z)" onClick={store.undo}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton title="Redo (Ctrl+Y)" onClick={store.redo}><Redo2 size={16} /></ToolbarButton>
        <Divider />

        {/* Clipboard — hidden per request, not needed for now */}
        {/*
        <ToolbarButton title="Copy (Ctrl+C)" onClick={() => store.copySelection(false)}><Copy size={16} /></ToolbarButton>
        <ToolbarButton title="Cut (Ctrl+X)" onClick={() => store.copySelection(true)}><Scissors size={16} /></ToolbarButton>
        <ToolbarButton title="Paste (Ctrl+V)" onClick={() => store.pasteAt(selection.active)}><ClipboardPaste size={16} /></ToolbarButton>
        <Divider />
        */}

        {/* Font */}
        <select
          className="h-7 text-xs border border-excel-border rounded-sm px-1 bg-white"
          value={activeFormat?.fontFamily || 'Calibri'}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          title="Font"
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          className="h-7 w-14 text-xs border border-excel-border rounded-sm px-1 bg-white"
          value={activeFormat?.fontSize || 11}
          onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          title="Font size"
        >
          {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Divider />

        {/* Bold / italic / underline — italic & underline hidden per request */}
        <ToolbarButton title="Bold (Ctrl+B)" active={!!activeFormat?.bold} onClick={() => patch({ bold: !activeFormat?.bold })}><Bold size={16} /></ToolbarButton>
        {/*
        <ToolbarButton title="Italic (Ctrl+I)" active={!!activeFormat?.italic} onClick={() => patch({ italic: !activeFormat?.italic })}><Italic size={16} /></ToolbarButton>
        <ToolbarButton title="Underline (Ctrl+U)" active={!!activeFormat?.underline} onClick={() => patch({ underline: !activeFormat?.underline })}><Underline size={16} /></ToolbarButton>
        */}

        {/* Font color */}
        <label title="Font color" className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-200 cursor-pointer">
          <span className="font-bold text-sm leading-none" style={{ color: activeFormat?.color || '#000' }}>A</span>
          <input type="color" className="w-5 h-1 p-0 border-0" value={activeFormat?.color || '#000000'} onChange={(e) => patch({ color: e.target.value })} />
        </label>

        {/* Fill color */}
        <label title="Fill color" className="flex flex-col items-center justify-center w-7 h-7 rounded hover:bg-gray-200 cursor-pointer">
          <svg width="14" height="12"><rect width="14" height="12" fill={activeFormat?.bgColor || '#ffffff'} stroke="#888" /></svg>
          <input type="color" className="w-5 h-1 p-0 border-0" value={activeFormat?.bgColor || '#ffffff'} onChange={(e) => patch({ bgColor: e.target.value })} />
        </label>
        <Divider />

        {/* Borders */}
        <select
          className="h-7 text-xs border border-excel-border rounded-sm px-1 bg-white"
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            store.applyBorders(selection.range, e.target.value as any, '#000000');
            e.target.value = '';
          }}
          title="Borders"
        >
          <option value="" disabled>Borders</option>
          <option value="all">All borders</option>
          <option value="outer">Outer border</option>
          <option value="none">No border</option>
        </select>
        <Divider />

        {/* Alignment */}
        <ToolbarButton title="Align left" active={activeFormat?.hAlign === 'left'} onClick={() => patch({ hAlign: 'left' })}><AlignLeft size={16} /></ToolbarButton>
        <ToolbarButton title="Align center" active={activeFormat?.hAlign === 'center'} onClick={() => patch({ hAlign: 'center' })}><AlignCenter size={16} /></ToolbarButton>
        <ToolbarButton title="Align right" active={activeFormat?.hAlign === 'right'} onClick={() => patch({ hAlign: 'right' })}><AlignRight size={16} /></ToolbarButton>
        <ToolbarButton title="Align top" active={activeFormat?.vAlign === 'top'} onClick={() => patch({ vAlign: 'top' })}><AlignStartVertical size={16} /></ToolbarButton>
        <ToolbarButton title="Align middle" active={activeFormat?.vAlign === 'middle'} onClick={() => patch({ vAlign: 'middle' })}><AlignCenterVertical size={16} /></ToolbarButton>
        <ToolbarButton title="Align bottom" active={activeFormat?.vAlign === 'bottom'} onClick={() => patch({ vAlign: 'bottom' })}><AlignEndVertical size={16} /></ToolbarButton>
        <ToolbarButton title="Wrap text" active={!!activeFormat?.wrap} onClick={() => patch({ wrap: !activeFormat?.wrap })}><WrapText size={16} /></ToolbarButton>
        {/* Rotate text — hidden per request */}
        {/* <ToolbarButton title="Rotate text" onClick={() => patch({ rotation: activeFormat?.rotation === 45 ? 0 : 45 })}><RotateCw size={16} /></ToolbarButton> */}
        <ToolbarButton title="Merge cells" onClick={store.mergeSelection}><Merge size={16} /></ToolbarButton>
        <Divider />

        {/* Number format */}
        <select
          className="h-7 text-xs border border-excel-border rounded-sm px-1 bg-white"
          value={activeFormat?.numberFormat || 'general'}
          onChange={(e) => patch({ numberFormat: e.target.value as NumberFormat })}
          title="Number format"
        >
          <option value="general">General</option>
          <option value="number">Number</option>
          <option value="number2">Number (2 dp)</option>
          <option value="currency">Currency</option>
          <option value="percentage">Percentage</option>
          <option value="date">Date</option>
          <option value="datetime">Date &amp; Time</option>
          <option value="time">Time</option>
        </select>
        <Divider />

        {/* Rows / columns — row insert/delete hidden per request; column insert/delete kept */}
        {/*
        <ToolbarButton title="Insert row above" onClick={() => store.insertRowAt(normalizeRange(selection.range).start.row)}><Rows size={16} /><Plus size={10} /></ToolbarButton>
        <ToolbarButton title="Delete row" onClick={() => store.deleteRowAt(normalizeRange(selection.range).start.row)}><Rows size={16} /><Trash2 size={10} /></ToolbarButton>
        */}
        {/* <ToolbarButton title="Insert column left" onClick={() => store.insertColAt(normalizeRange(selection.range).start.col)}><Columns size={16} /><Plus size={10} /></ToolbarButton>
        <ToolbarButton title="Delete column" onClick={() => store.deleteColAt(normalizeRange(selection.range).start.col)}><Columns size={16} /><Trash2 size={10} /></ToolbarButton> */}

        {/* Freeze panes, sort/filter/find, import/export — all hidden per request, not needed for now */}
        {/*
        <Divider />
        <ToolbarButton title="Freeze top row" active={store.frozenRows > 0} onClick={store.toggleFreezeTopRow}><Pin size={16} /></ToolbarButton>
        <ToolbarButton title="Freeze first column" active={store.frozenCols > 0} onClick={store.toggleFreezeFirstCol}><PinOff size={16} /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Sort A → Z" onClick={() => store.sortByColumn(selection.active.col, 'asc')}><ArrowDownAZ size={16} /></ToolbarButton>
        <ToolbarButton title="Sort Z → A" onClick={() => store.sortByColumn(selection.active.col, 'desc')}><ArrowUpZA size={16} /></ToolbarButton>
        <ToolbarButton title="Find & Replace (Ctrl+F)" onClick={() => store.toggleFindReplace(true)}><Search size={16} /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Import .xlsx" onClick={() => { setPendingImportKind('xlsx'); fileInputRef.current?.click(); }}><Upload size={16} /></ToolbarButton>
        <ToolbarButton title="Export .xlsx" onClick={doExportXlsx}><FileSpreadsheet size={16} /></ToolbarButton>
        <ToolbarButton title="Export .csv" onClick={doExportCsv}><FileText size={16} /></ToolbarButton>
        <ToolbarButton title="Import .csv" onClick={() => { setPendingImportKind('csv'); fileInputRef.current?.click(); }}><Download size={16} /></ToolbarButton>
        <ToolbarButton title="Save as JSON" onClick={doExportJson}><Save size={16} /></ToolbarButton>
        <ToolbarButton title="Load JSON" onClick={() => { setPendingImportKind('json'); jsonInputRef.current?.click(); }}><FileJson size={16} /></ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept={pendingImportKind === 'xlsx' ? '.xlsx,.xls' : '.csv'}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
        />
        */}
      </div>
    </div>
  );
}
