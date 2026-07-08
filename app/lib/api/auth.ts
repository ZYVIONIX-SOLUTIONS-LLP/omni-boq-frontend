import { apiFetch } from "./client";

export interface LoginPayload {
    username: string;
    password: string;
    role: "STAFF" | "ADMIN" | "SUPERADMIN";
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        username: string;
        role: string;
        [key: string]: any;
    };
}

export function login(payload: LoginPayload) {
    return apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}