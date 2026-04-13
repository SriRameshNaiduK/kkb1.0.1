// ─── Secure API Client ──────────────────────────────────────
// Handles CSRF tokens, token refresh, and secure requests

let csrfToken: string | null = null;

// ─── Fetch CSRF Token ───────────────────────────────────────
async function fetchCsrfToken(): Promise<string> {
    try {
        const res = await fetch("/api/csrf-token", {
            credentials: "same-origin",
        });
        if (res.ok) {
            const data = await res.json();
            csrfToken = data.csrfToken;
            return csrfToken!;
        }
    } catch {
        // Ignore — will retry on next request
    }
    return "";
}

// ─── Token Refresh ──────────────────────────────────────────
async function refreshAccessToken(): Promise<boolean> {
    try {
        const res = await fetch("/api/refresh", {
            method: "POST",
            credentials: "same-origin",
        });
        if (res.ok) {
            const data = await res.json();
            if (data.csrfToken) {
                csrfToken = data.csrfToken;
            }
            return true;
        }
    } catch {
        // Refresh failed
    }
    return false;
}

// ─── Secure Fetch Wrapper ───────────────────────────────────
export async function secureFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Ensure CSRF token is available for mutating requests
    const method = (options.method || "GET").toUpperCase();
    const needsCsrf = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

    if (needsCsrf && !csrfToken) {
        await fetchCsrfToken();
    }

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (needsCsrf && csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
    }

    if (
        options.body &&
        typeof options.body === "string" &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const fetchOptions: RequestInit = {
        ...options,
        headers,
        credentials: "same-origin",
    };

    let response = await fetch(url, fetchOptions);

    // If 401, try to refresh the token and retry
    if (response.status === 401 && url !== "/api/login" && url !== "/api/refresh") {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Update CSRF token and retry
            if (needsCsrf && csrfToken) {
                headers["X-CSRF-Token"] = csrfToken;
            }
            response = await fetch(url, { ...fetchOptions, headers });
        }
    }

    return response;
}

// ─── Convenience Methods ────────────────────────────────────
export const api = {
    get: (url: string) => secureFetch(url),

    post: (url: string, data?: any) =>
        secureFetch(url, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: (url: string, data?: any) =>
        secureFetch(url, {
            method: "PUT",
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: (url: string) => secureFetch(url, { method: "DELETE" }),
};

// ─── Store CSRF token from login response ───────────────────
export function setCsrfToken(token: string) {
    csrfToken = token;
}

export function clearCsrfToken() {
    csrfToken = null;
}

// ─── Initialize (fetch CSRF on load) ────────────────────────
export async function initSecurity(): Promise<void> {
    await fetchCsrfToken();
}