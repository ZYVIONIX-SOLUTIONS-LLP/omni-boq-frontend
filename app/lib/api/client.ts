// The real HTTP client is disabled while the UI is finalised against local data.
// PageMeta is re-exported here so existing imports keep working; all data now flows
// through app/lib/local/*.
export type { PageMeta } from "../local/store";
