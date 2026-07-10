import { AuthUser, clearAuth, saveAuth } from "../auth-storage";
import { delay } from "../local/store";
import { SEED_USERS } from "../local/seed-data";

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

/** Local login: validate against the seeded demo users, persist a mock session. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
    const user = SEED_USERS.find(
        (u) => u.username.toLowerCase() === payload.username.toLowerCase()
    );
    if (!user || user.password !== payload.password) {
        throw new Error("Invalid credentials");
    }
    if (user.role !== payload.role) {
        throw new Error(`This account is not authorized to log in as ${payload.role}`);
    }

    const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: [user.role],
    };
    const tokens: AuthTokens = {
        accessToken: `local-access-${user.id}`,
        refreshToken: `local-refresh-${user.id}`,
        expiresIn: "15m",
    };
    saveAuth(authUser, tokens.accessToken, tokens.refreshToken);
    return delay({ user: authUser, tokens });
}

export async function logout(): Promise<void> {
    clearAuth();
    return delay(undefined);
}
