import { useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, orientationsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useToast } from "./Toast";
import { startBlocker } from "../workflow";

/**
 * The assigned auditor's next step on an audit:
 * complete orientation → start → evaluate the checklist (on the audit page).
 * `onChanged` is called after a successful action so the caller can reload.
 */
export default function AuditorActions({ audit, onChanged, compact }) {
    const notify = useToast();
    const [busy, setBusy] = useState("");
    const mine = audit.my_assignment;
    if (!mine) return null;

    const run = async (key, fn, message) => {
        setBusy(key);
        try {
            await fn();
            notify(message);
            await onChanged?.();
        } catch (err) {
            notify(errorMessage(err), "error");
        } finally {
            setBusy("");
        }
    };

    const blocker = startBlocker(audit);
    const size = compact ? "btn-sm" : "";
    const oriented = mine.orientation_status === "COMPLETED";

    return (
        <div className="auditor-actions">
            {!oriented && (
                <button className={`btn btn-primary ${size}`} disabled={busy === "orientation"}
                    onClick={() => run("orientation", () => orientationsApi.complete(mine.orientation_id), "Orientation completed.")}>
                    {busy === "orientation" ? "Saving…" : "Mark orientation complete"}
                </button>
            )}

            {audit.status === "ASSIGNED" && oriented && (
                <button className={`btn btn-success ${size}`} disabled={Boolean(blocker) || busy === "start"} title={blocker || ""}
                    onClick={() => run("start", () => auditsApi.start(audit.id), `${audit.audit_code} started.`)}>
                    {busy === "start" ? "Starting…" : "Start audit"}
                </button>
            )}

            {audit.status === "IN_PROGRESS" && (
                <Link className={`btn btn-primary ${size}`} to={`/audits/${audit.id}#execute`}>
                    {audit.progress?.checklist?.pending ? "Evaluate checklist" : "Review NCs"}
                </Link>
            )}

            {audit.status === "ASSIGNED" && oriented && blocker && <span className="field-hint">{blocker}</span>}
        </div>
    );
}
