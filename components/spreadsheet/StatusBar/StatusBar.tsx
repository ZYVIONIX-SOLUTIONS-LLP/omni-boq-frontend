"use client";

import React, { useMemo } from 'react';
import { useSpreadsheetStore } from '@/components/spreadsheet/store/spreadsheetStore';
import { normalizeRange } from '@/components/spreadsheet/utils/cellUtils';

export default function StatusBar() {
  const store = useSpreadsheetStore();
  const n = normalizeRange(store.selection.range);

  const stats = useMemo(() => {
    let count = 0;
    let numericCount = 0;
    let sum = 0;
    const rowSpan = n.end.row - n.start.row + 1;
    const colSpan = n.end.col - n.start.col + 1;
    // Guard against scanning enormous ranges (e.g. whole-column selections)
    const cappedRowEnd = Math.min(n.end.row, n.start.row + 5000);
    if (rowSpan * colSpan < 2_000_000) {
      for (let r = n.start.row; r <= cappedRowEnd; r++) {
        for (let c = n.start.col; c <= n.end.col; c++) {
          const ev = store.getEvaluatedCell(r, c);
          if (ev.display === '') continue;
          count++;
          if (typeof ev.raw === 'number') {
            numericCount++;
            sum += ev.raw;
          }
        }
      }
    }
    return { count, numericCount, sum, average: numericCount ? sum / numericCount : 0 };
  }, [n.start.row, n.start.col, n.end.row, n.end.col, store.version]);

  const isRange = !(n.start.row === n.end.row && n.start.col === n.end.col);

  return (
    <div className="h-6 border-t border-excel-border bg-excel-toolbar flex items-center justify-end gap-4 px-4 text-xs text-gray-600 shrink-0">
      {isRange && stats.count > 0 && (
        <>
          {stats.numericCount > 0 && <span>Average: {(stats.average).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>}
          <span>Count: {stats.count}</span>
          {stats.numericCount > 0 && <span>Sum: {stats.sum.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>}
        </>
      )}
    </div>
  );
}
