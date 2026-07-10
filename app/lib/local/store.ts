// ─────────────────────────────────────────────────────────────────────────────
// Local (localStorage-backed) data store — stand-in for the backend while the UI
// is finalised. Every API module reads/writes through here. When the real backend
// is ready, swap the API modules back to fetch-based implementations; components
// are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const isBrowser = () => typeof window !== "undefined";

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Load a collection from localStorage, seeding it on first access. */
export function loadCollection<T>(key: string, seed: T[]): T[] {
  if (!isBrowser()) return [...seed];
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as T[];
    } catch {
      /* fall through to reseed */
    }
  }
  window.localStorage.setItem(key, JSON.stringify(seed));
  return [...seed];
}

export function saveCollection<T>(key: string, items: T[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

/** Slice an array into a page + build the same PageMeta shape the backend returned. */
export function paginate<T>(items: T[], page = 1, limit = 20): { items: T[]; meta: PageMeta } {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/** Simulate a tiny async delay so loading states still render (feels real). */
export function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
