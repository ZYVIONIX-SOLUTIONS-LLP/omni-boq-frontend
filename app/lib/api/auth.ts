import { AuthUser, clearAuth, getRefreshToken, saveAuth } from "../auth-storage";
import { apiDelete, apiGet, apiPost } from "./client";

export interface User {
    id: string;
    username: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: "STAFF" | "ADMIN" | "SUPERADMIN";
    createdAt?: string;
}

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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    const result = await apiPost<LoginResponse>("/auth/login", payload);
    saveAuth(result.user, result.tokens.accessToken, result.tokens.refreshToken);
    return result;
}

export async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
        try {
            await apiPost("/auth/logout", { refreshToken });
        } catch {
            /* best-effort revoke; still clear local session below */
        }
    }
    clearAuth();
}

export async function listUsers(): Promise<User[]> {
    return apiGet<User[]>("/users");
}

export async function createUser(payload: Omit<User, "id">): Promise<User> {
    return apiPost<User>("/users", payload);
}

export async function deleteUser(id: string): Promise<void> {
    await apiDelete(`/users/${id}`);
}
