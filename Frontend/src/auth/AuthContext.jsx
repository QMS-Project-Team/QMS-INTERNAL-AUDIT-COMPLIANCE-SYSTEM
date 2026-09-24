import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/endpoints";
import { tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(tokenStore.getUser);
    // Only block rendering when we hold a token that still needs validating.
    const [restoring, setRestoring] = useState(() => Boolean(tokenStore.getAccess()));

    // Restore the session on page load / refresh (GET /api/auth/me/).
    useEffect(() => {
        if (!tokenStore.getAccess()) return;

        authApi
            .me()
            .then((me) => {
                tokenStore.save({ user: me });
                setUser(me);
            })
            .catch(() => {
                tokenStore.clear();
                setUser(null);
            })
            .finally(() => setRestoring(false));
    }, []);

    const login = useCallback(async (username, password) => {
        const result = await authApi.login(username, password);
        tokenStore.save(result);
        setUser(result.user);
        return result.user;
    }, []);

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, restoring, login, logout }),
        [user, restoring, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}
