"use client";

import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';

export default function FindReplaceDialog() {
  const store = useSpreadsheetStore();
  const [replacement, setReplacement] = useState('');

  if (!store.showFindReplace) return null;

  return (
    <div className="absolute top-12 right-4 z-40 bg-white border border-excel-border rounded shadow-xl w-80 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Find &amp; Replace</span>
        <button onClick={() => store.toggleFindReplace(false)}><X size={16} /></button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          autoFocus
          className="flex-1 h-7 text-sm border border-excel-border rounded-sm px-2"
          placeholder="Find..."
          value={store.searchTerm}
          onChange={(e) => store.setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && store.gotoNextMatch()}
        />
        <button className="p-1 border border-excel-border rounded-sm hover:bg-gray-100" onClick={store.gotoPrevMatch}><ChevronUp size={14} /></button>
        <button className="p-1 border border-excel-border rounded-sm hover:bg-gray-100" onClick={store.gotoNextMatch}><ChevronDown size={14} /></button>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        {store.searchMatches.length > 0
          ? `${store.searchIndex + 1} of ${store.searchMatches.length} matches`
          : store.searchTerm ? 'No matches' : ''}
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          className="flex-1 h-7 text-sm border border-excel-border rounded-sm px-2"
          placeholder="Replace with..."
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="text-xs px-2 py-1 border border-excel-border rounded-sm hover:bg-gray-100"
          onClick={() => store.replaceCurrentMatch(replacement)}
        >
          Replace
        </button>
        <button
          className="text-xs px-2 py-1 bg-excel-green text-white rounded-sm hover:bg-excel-green-dark"
          onClick={() => store.replaceAllMatches(store.searchTerm, replacement)}
        >
          Replace All
        </button>
      </div>
    </div>
  );
}
