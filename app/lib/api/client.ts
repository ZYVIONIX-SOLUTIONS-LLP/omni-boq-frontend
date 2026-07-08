import { API_BASE_URL } from "./config";

interface ApiOptions extends RequestInit {
    auth?: boolean;
}

export async function apiFetch<T = any>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {
    const { auth = false, headers, ...rest } = options;

    const finalHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...headers,
    };

    if (auth) {
        const token = localStorage.getItem("token");
        if (token) {
            (finalHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        headers: finalHeaders,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || "Something went wrong");
    }

    return data;
}