"use client";

// Excel-style sheet tabs along the bottom of the workbook: click to switch,
// double-click (or the tab's own rename action) to rename in place, "+" to add
// a new blank sheet, and an "x" on each tab to delete it (the last remaining
// sheet can't be deleted).

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';

export default function SheetTabs() {
  const store = useSpreadsheetStore();
  const { sheets, activeSheetId } = store;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingValue(currentName);
  };

  const commitRename = () => {
    if (editingId) store.renameSheet(editingId, editingValue);
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-0.5 border-t border-excel-border bg-excel-toolbar px-1.5 py-1 shrink-0 overflow-x-auto">
      {sheets.map((tab) => {
        const isActive = tab.id === activeSheetId;
        return (
          <div
            key={tab.id}
            onClick={() => editingId !== tab.id && store.switchToSheet(tab.id)}
            onDoubleClick={() => startRename(tab.id, tab.name)}
            className={`group flex items-center gap-1.5 h-7 px-2.5 rounded-t text-xs cursor-pointer whitespace-nowrap ${
              isActive ? 'bg-white font-semibold text-excel-green border border-excel-border border-b-white -mb-px' : 'text-gray-600 hover:bg-gray-200'
            }`}
            title="Double-click to rename"
          >
            {editingId === tab.id ? (
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-20 h-5 px-1 text-xs border border-excel-green rounded-sm outline-none"
              />
            ) : (
              <span>{tab.name}</span>
            )}
            {sheets.length > 1 && editingId !== tab.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  store.deleteSheet(tab.id);
                }}
                title="Delete sheet"
                className="opacity-0 group-hover:opacity-100 hover:text-red-600 shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => store.addSheet()}
        title="Add sheet"
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 text-gray-600 shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
