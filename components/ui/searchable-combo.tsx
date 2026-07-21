"use client";

// Searchable dropdown built for very large option sets:
//  • debounced search against an async loader (pages come from the API layer)
//  • infinite scroll — the next page loads as the list nears the bottom
//  • full keyboard navigation (↑ ↓ Enter Esc)
//  • inline "Create new" option
// The same component serves every hierarchy level, so it must never assume a
// particular entity shape beyond { id, name }.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboItem {
  id: string;
  name: string;
  /** Optional muted line under the name (e.g. manufacturer of a series). */
  hint?: string;
}

export interface ComboPage {
  items: ComboItem[];
  hasMore: boolean;
}

const PAGE_SIZE = 40;

export default function SearchableCombo({
  value,
  valueLabel,
  placeholder = "Select...",
  disabled,
  allowClear,
  loadOptions,
  onSelect,
  onCreate,
  createLabel = "Create",
  className,
}: {
  /** Selected id ("" for none). */
  value: string;
  /** Display name of the selected item (kept by the parent so we never need a lookup). */
  valueLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  /** Page loader — receives the current search text and 1-based page number. */
  loadOptions: (search: string, page: number, pageSize: number) => Promise<ComboPage>;
  onSelect: (item: ComboItem | null) => void;
  /** When provided, an inline "Create ..." row appears at the end of the list. */
  onCreate?: (name: string) => Promise<ComboItem>;
  createLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ComboItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    async (searchText: string, pageNum: number, append: boolean) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      try {
        const result = await loadOptions(searchText, pageNum, PAGE_SIZE);
        if (seq !== requestSeq.current) return; // stale response
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(pageNum);
        setError("");
      } catch (err) {
        if (seq === requestSeq.current)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [loadOptions]
  );

  // Load first page when opened; debounce reloads as the user types
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setHighlight(0);
      fetchPage(search, 1, false);
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, search, fetchPage]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openDropdown = () => {
    if (disabled) return;
    setSearch("");
    setItems([]);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (item: ComboItem) => {
    onSelect(item);
    setOpen(false);
  };

  const canCreate = Boolean(onCreate) && search.trim().length > 0;
  const exactMatch = useMemo(
    () => items.some((i) => i.name.toLowerCase() === search.trim().toLowerCase()),
    [items, search]
  );
  const showCreateRow = canCreate && !exactMatch;
  // Virtual rows = options + optional create row, one flat index space for keyboard nav
  const rowCount = items.length + (showCreateRow ? 1 : 0);

  const handleCreate = async () => {
    if (!onCreate || !search.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const created = await onCreate(search.trim());
      select(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rowCount) return;
      const next =
        e.key === "ArrowDown"
          ? Math.min(highlight + 1, rowCount - 1)
          : Math.max(highlight - 1, 0);
      setHighlight(next);
      listRef.current
        ?.querySelector(`[data-row-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
      // Nearing the end of loaded rows → pull the next page
      if (e.key === "ArrowDown" && hasMore && !loading && next >= items.length - 5) {
        fetchPage(search, page + 1, true);
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (showCreateRow && highlight === items.length) {
        handleCreate();
      } else if (items[highlight]) {
        select(items[highlight]);
      }
    }
  };

  const onListScroll = () => {
    const el = listRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      fetchPage(search, page + 1, true);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 text-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          disabled && "opacity-50 cursor-not-allowed",
          !valueLabel && "text-muted-foreground"
        )}
      >
        <span className="truncate">{valueLabel || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {allowClear && value && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
            />
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to search..."
              className="w-full h-9 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div ref={listRef} onScroll={onListScroll} className="max-h-64 overflow-y-auto py-1">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-row-index={index}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => select(item)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                  index === highlight ? "bg-primary/10 text-primary" : "text-foreground"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  {item.hint && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.hint}
                    </span>
                  )}
                </span>
                {item.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            ))}

            {!loading && items.length === 0 && !showCreateRow && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {search ? `No results for "${search}"` : "No options yet"}
              </p>
            )}

            {showCreateRow && (
              <button
                type="button"
                data-row-index={items.length}
                onMouseEnter={() => setHighlight(items.length)}
                onClick={handleCreate}
                disabled={creating}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold",
                  highlight === items.length ? "bg-primary/10 text-primary" : "text-primary"
                )}
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {createLabel} “{search.trim()}”
              </button>
            )}

            {loading && (
              <p className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </p>
            )}
            {!loading && hasMore && (
              <p className="px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                Scroll for more…
              </p>
            )}
          </div>

          {error && (
            <p className="border-t border-border px-3 py-2 text-[11px] text-red-500">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
