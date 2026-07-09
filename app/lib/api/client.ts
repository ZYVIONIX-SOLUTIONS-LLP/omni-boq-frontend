import { API_BASE_URL } from "./config";
import {
    clearAuth,
    getAccessToken,
    getRefreshToken,
    saveTokens,
} from "../auth-storage";

interface ApiOptions extends RequestInit {
    /** Attach the Authorization header. Defaults to true; set false for public endpoints (login/register). */
    auth?: boolean;
}

/**
 * Backend responses are wrapped in a standard envelope:
 * { success, statusCode, message, data, meta?, timestamp, path }
 * apiFetch unwraps and returns `data` directly.
 */
interface ApiEnvelope<T> {
    success: boolean;
    statusCode: number;
    message: string | string[];
    data: T;
    meta?: Record<string, unknown>;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
    // Deduplicate: if several requests hit 401 at once, refresh only once.
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return false;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                });
                if (!response.ok) return false;

                const envelope = await response.json();
                const tokens = envelope?.data?.tokens;
                if (!tokens?.accessToken || !tokens?.refreshToken) return false;

                saveTokens(tokens.accessToken, tokens.refreshToken);
                return true;
            } catch {
                return false;
            }
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

async function apiFetchEnvelope<T = unknown>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<ApiEnvelope<T>> {
    const { auth = true, headers, ...rest } = options;

    const doFetch = async (): Promise<Response> => {
        const finalHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...(headers as Record<string, string>),
        };

        if (auth) {
            const token = getAccessToken();
            if (token) {
                finalHeaders.Authorization = `Bearer ${token}`;
            }
        }

        return fetch(`${API_BASE_URL}${endpoint}`, { ...rest, headers: finalHeaders });
    };

    let response = await doFetch();

    // Access token expired — try one silent refresh, then retry the request.
    if (response.status === 401 && auth) {
        const refreshed = await tryRefreshTokens();
        if (refreshed) {
            response = await doFetch();
        } else {
            clearAuth();
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/Login")) {
                window.location.href = "/Login";
            }
        }
    }

    const envelope: ApiEnvelope<T> | null = await response.json().catch(() => null);

    if (!response.ok) {
        const message = envelope?.message;
        throw new Error(
            Array.isArray(message) ? message.join(", ") : message || "Something went wrong"
        );
    }

    return envelope as ApiEnvelope<T>;
}

export async function apiFetch<T = unknown>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {
    const envelope = await apiFetchEnvelope<T>(endpoint, options);
    return envelope?.data as T;
}

export interface PageMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/** For paginated list endpoints — returns both the items (data) and the pagination meta. */
export async function apiFetchPaged<T = unknown>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<{ items: T[]; meta: PageMeta }> {
    const envelope = await apiFetchEnvelope<T[]>(endpoint, options);
    return {
        items: envelope?.data ?? [],
        meta: (envelope?.meta as unknown as PageMeta) ?? {
            page: 1,
            limit: 20,
            totalItems: envelope?.data?.length ?? 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        },
    };
}
