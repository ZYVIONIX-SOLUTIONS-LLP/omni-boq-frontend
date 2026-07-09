import { apiFetch } from "./client";
import { AuthUser, clearAuth, getRefreshToken, saveAuth } from "../auth-storage";

export interface LoginPayload {
    username: string;
    password: string;
    role: "STAFF" | "ADMIN" | "SUPERADMIN";
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface LoginResponse {
    user: AuthUser;
    tokens: AuthTokens;
}

/** Logs in and persists user + tokens to localStorage. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
    });

    saveAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
    return data;
}

/** Revokes the refresh token server-side and clears local auth state. */
export async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
        try {
            await apiFetch<void>("/auth/logout", {
                method: "POST",
                body: JSON.stringify({ refreshToken }),
                auth: false,
            });
        } catch {
            // Even if the server call fails (expired/revoked already), still log out locally.
        }
    }

    clearAuth();
}
