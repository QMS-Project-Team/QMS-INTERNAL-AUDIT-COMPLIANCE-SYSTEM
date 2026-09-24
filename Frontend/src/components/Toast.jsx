import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const notify = useCallback((message, type = "success") => {
        const id = Date.now() + Math.random();
        setToasts((list) => [...list.slice(-2), { id, message, type }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
    }, []);

    return (
        <ToastContext.Provider value={notify}>
            {children}
            <div className="toast-stack" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    return useContext(ToastContext);
}
