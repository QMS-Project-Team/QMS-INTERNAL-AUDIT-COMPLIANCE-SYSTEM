import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

/**
 * Load data on mount (and whenever `deps` change).
 * Returns { data, loading, error, reload, setData }.
 */
export default function useLoad(loader, deps = []) {
    const [state, setState] = useState({ data: null, loading: true, error: "" });
    const loaderRef = useRef(loader);
    loaderRef.current = loader;

    const reload = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
            const data = await loaderRef.current();
            setState({ data, loading: false, error: "" });
        } catch (error) {
            setState((s) => ({ ...s, loading: false, error: errorMessage(error, "Failed to load data.") }));
        }
    }, []);

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    const setData = useCallback(
        (updater) =>
            setState((s) => ({
                ...s,
                data: typeof updater === "function" ? updater(s.data) : updater,
            })),
        []
    );

    return { ...state, reload, setData };
}
