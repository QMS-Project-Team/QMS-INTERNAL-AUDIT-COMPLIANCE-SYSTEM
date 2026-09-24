import axios from "axios";

export const API_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const STORAGE = {
    access: "accessToken",
    refresh: "refreshToken",
    user: "user",
};

export const tokenStore = {
    getAccess: () => localStorage.getItem(STORAGE.access),
    getRefresh: () => localStorage.getItem(STORAGE.refresh),
    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE.user));
        } catch {
            return null;
        }
    },
    save({ access, refresh, user }) {
        if (access) localStorage.setItem(STORAGE.access, access);
        if (refresh) localStorage.setItem(STORAGE.refresh, refresh);
        if (user) localStorage.setItem(STORAGE.user, JSON.stringify(user));
    },
    clear() {
        Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    },
};

const client = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
    const token = tokenStore.getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// One refresh at a time: concurrent 401s wait on the same promise.
let refreshing = null;

function refreshAccessToken() {
    if (!refreshing) {
        const refresh = tokenStore.getRefresh();
        refreshing = (
            refresh
                ? axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
                : Promise.reject(new Error("No refresh token"))
        )
            .then(({ data }) => {
                tokenStore.save({ access: data.access });
                return data.access;
            })
            .finally(() => {
                refreshing = null;
            });
    }
    return refreshing;
}

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const isAuthCall = original?.url?.startsWith("/auth/login");

        if (error.response?.status === 401 && !original._retry && !isAuthCall) {
            original._retry = true;
            try {
                const access = await refreshAccessToken();
                original.headers.Authorization = `Bearer ${access}`;
                return client(original);
            } catch {
                tokenStore.clear();
                window.location.assign("/login");
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Turn a DRF error response into one readable line.
 * DRF returns {detail}, {field: [msgs]}, {non_field_errors: [...]} or a bare list.
 */
export function errorMessage(error, fallback = "Something went wrong.") {
    const data = error?.response?.data;

    if (!error?.response) {
        return "Cannot reach the server. Is the backend running on port 8000?";
    }
    if (typeof data === "string") {
        return data.startsWith("<") ? `${fallback} (HTTP ${error.response.status})` : data;
    }
    if (Array.isArray(data)) return data.join(" ");
    if (data && typeof data === "object") {
        if (data.detail) {
            const extra = data.pending_auditors?.length
                ? ` Pending: ${data.pending_auditors.join(", ")}.`
                : "";
            return `${data.detail}${extra}`;
        }
        return Object.entries(data)
            .map(([field, messages]) => {
                const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
                return field === "non_field_errors" ? text : `${field.replaceAll("_", " ")}: ${text}`;
            })
            .join(" ");
    }
    return fallback;
}

export default client;
