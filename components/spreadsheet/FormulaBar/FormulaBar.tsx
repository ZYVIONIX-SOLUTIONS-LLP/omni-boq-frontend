"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, X, FunctionSquare } from 'lucide-react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';
import { coordToLabel, labelToCoord } from '@/components/spreadsheet/utils/cellUtils';

export default function FormulaBar() {
  const store = useSpreadsheetStore();
  const { selection, editing } = store;
  const [nameBoxValue, setNameBoxValue] = useState(coordToLabel(selection.active));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameBoxValue(coordToLabel(selection.active));
  }, [selection.active.row, selection.active.col]);

  const displayValue = editing
    ? editing.value
    : store.getCellData(selection.active.row, selection.active.col)?.value ?? '';

  const commitNameBox = () => {
    const coord = labelToCoord(nameBoxValue);
    if (coord) {
      store.setSelection({ start: coord, end: coord }, 'cell', coord);
    } else {
      setNameBoxValue(coordToLabel(selection.active));
    }
  };

  return (
    <div className="flex items-center h-8 border-b border-excel-border bg-white px-1 gap-1 shrink-0">
      <input
        className="w-24 h-6 text-sm px-2 border border-excel-border rounded-sm text-center focus:outline-none focus:ring-1 focus:ring-excel-selection"
        value={nameBoxValue}
        onChange={(e) => setNameBoxValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitNameBox();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commitNameBox}
        title="Name Box"
      />
      <div className="h-5 w-px bg-excel-border mx-1" />
      <div className="flex items-center gap-0.5 text-gray-400 px-1">
        <X size={14} className="opacity-40" />
        <Check size={14} className="opacity-40" />
        <FunctionSquare size={14} />
      </div>
      <div className="h-5 w-px bg-excel-border mx-1" />
      <input
        ref={inputRef}
        className="flex-1 h-6 text-sm px-2 border border-transparent focus:border-excel-border rounded-sm focus:outline-none"
        value={displayValue}
        placeholder=""
        onChange={(e) => {
          if (!editing) {
            store.startEditing(selection.active, e.target.value, true);
          } else {
            store.updateEditingValue(e.target.value);
          }
        }}
        onFocus={() => {
          if (!editing) store.startEditing(selection.active);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            store.commitEditing('down');
          } else if (e.key === 'Escape') {
            store.cancelEditing();
          }
        }}
      />
    </div>
  );
}
