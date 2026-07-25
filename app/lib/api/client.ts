// Thin fetch wrapper for the NestJS backend. Every api/* and catalog/api module calls through
// here instead of localStorage — signatures of their exported functions are unchanged, so no
// component needed to change for this swap.
import { clearAuth, getAccessToken, getRefreshToken, saveTokens } from "../auth-storage";

export interface PageMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://omnibackend.zyvionixsolutions.com/";
const BASE_URL = "https://omnibackend.zyvionixsolutions.com";


async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.message)) return body.message.join(", ");
    if (typeof body?.message === "string") return body.message;
  } catch {
    /* body wasn't JSON */
  }
  return `Request failed (${res.status})`;
}

// The 15-minute access token expires well within a normal working session, so a 401 triggers
// one silent refresh-and-retry before giving up. Concurrent 401s share a single in-flight
// refresh call instead of each racing their own.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearAuth();
          return null;
        }
        const tokens = await res.json();
        saveTokens(tokens.accessToken, tokens.refreshToken);
        return tokens.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !isRetry && path !== "/auth/login" && path !== "/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, options, true);
  }

  if (!res.ok) throw new Error(await extractErrorMessage(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}
export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}
export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/** Builds a query string from a params object, skipping undefined/null/empty values. */
export function toQueryString<T extends object>(params: T): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
