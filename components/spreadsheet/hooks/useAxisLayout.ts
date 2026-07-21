import { useMemo } from 'react';

export interface AxisLayout {
  /** offsets[i] = pixel position where index i starts; offsets[count] = total size */
  offsets: Float64Array;
  totalSize: number;
  sizeOf: (index: number) => number;
  /** Binary search: which index contains pixel position `pos` */
  indexAtPosition: (pos: number) => number;
}

/**
 * Builds a cumulative-offset lookup table for a grid axis (rows or columns),
 * honoring per-index overrides and a hidden-set. Runs in O(count) but only
 * recomputes when the overrides map / hidden set / count actually change
 * (not on every keystroke), so it stays cheap even for 100,000 rows.
 */
export function useAxisLayout(
  count: number,
  defaultSize: number,
  overrides: Map<number, number>,
  hidden: Set<number>
): AxisLayout {
  return useMemo(() => {
    const offsets = new Float64Array(count + 1);
    let acc = 0;
    for (let i = 0; i < count; i++) {
      offsets[i] = acc;
      const size = hidden.has(i) ? 0 : overrides.get(i) ?? defaultSize;
      acc += size;
    }
    offsets[count] = acc;

    const sizeOf = (index: number) => {
      if (index < 0 || index >= count) return 0;
      return offsets[index + 1] - offsets[index];
    };

    const indexAtPosition = (pos: number) => {
      // binary search over offsets
      let lo = 0;
      let hi = count - 1;
      if (pos <= 0) return 0;
      if (pos >= offsets[count]) return count - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= pos) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };

    return { offsets, totalSize: acc, sizeOf, indexAtPosition };
  }, [count, defaultSize, overrides, hidden]);
}
