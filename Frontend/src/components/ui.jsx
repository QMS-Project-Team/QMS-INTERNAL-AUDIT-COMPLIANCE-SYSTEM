import { useEffect, useState } from "react";
import { errorMessage } from "../api/client";

export function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="page-head">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
        </div>
    );
}

export function Loading({ label = "Loading…" }) {
    return (
        <div className="state-box">
            <span className="spinner" aria-hidden="true" />
            {label}
        </div>
    );
}

export function ErrorBox({ message, onRetry }) {
    if (!message) return null;
    return (
        <div className="alert alert-error">
            <span>{message}</span>
            {onRetry && (
                <button className="btn btn-sm btn-ghost" onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}

export function EmptyState({ title, text, action }) {
    return (
        <div className="state-box empty">
            <strong>{title}</strong>
            {text && <span className="muted">{text}</span>}
            {action}
        </div>
    );
}

const BADGE_TONES = {
    ACTIVE: "green",
    INACTIVE: "gray",
    DRAFT: "gray",
    PENDING_ASSIGNMENT: "amber",
    ASSIGNED: "blue",
    IN_PROGRESS: "violet",
    PENDING_CLOSURE: "amber",
    CLOSED: "green",
    PENDING: "amber",
    COMPLETED: "green",
    SCHEDULED: "blue",
    CONFIRMED: "green",
    PRIMARY: "violet",
    SECONDARY: "blue",
    COMBINED: "blue",
    INDIVIDUAL: "violet",
};

export function Badge({ value, label, tone }) {
    const text = label || (value ? value.replaceAll("_", " ").toLowerCase() : "—");
    return <span className={`badge badge-${tone || BADGE_TONES[value] || "gray"}`}>{text}</span>;
}

export function Modal({ title, onClose, children, footer, wide }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div
                className={`modal ${wide ? "modal-wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="modal-head">
                    <h2>{title}</h2>
                    <button className="icon-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

/** Confirmation dialog that runs an async action and shows its error inline. */
export function ConfirmDialog({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onClose }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const run = async () => {
        setBusy(true);
        setError("");
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                    <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={run} disabled={busy}>
                        {busy ? "Working…" : confirmLabel}
                    </button>
                </>
            }
        >
            <p>{message}</p>
            <ErrorBox message={error} />
        </Modal>
    );
}

export function Field({ label, hint, children, full }) {
    return (
        <label className={`field ${full ? "field-full" : ""}`}>
            <span className="field-label">{label}</span>
            {children}
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    );
}

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
    return (
        <input
            type="search"
            className="input search"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
