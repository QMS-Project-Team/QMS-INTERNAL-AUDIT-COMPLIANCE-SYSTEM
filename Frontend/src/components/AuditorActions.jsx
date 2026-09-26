import { useState } from "react";
import { auditsApi, orientationsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import useLoad from "../hooks/useLoad";
import { useToast } from "./Toast";
import { Badge, EmptyState, ErrorBox, Loading, Modal } from "./ui";
import { startBlocker } from "../workflow";

function ChecklistModal({ audit, onClose }) {
    const { data, loading, error, reload } = useLoad(() => auditsApi.checklist(audit.id), [audit.id]);
    const items = data ? [...data.items].sort((a, b) => a.order - b.order) : [];

    return (
        <Modal title={`${audit.audit_code} · checklist`} onClose={onClose} wide>
            {loading && !data ? (
                <Loading />
            ) : error ? (
                <ErrorBox message={error} onRetry={reload} />
            ) : (
                <>
                    <p className="muted">
                        {data.checklist_name} · {data.framework_name} · {items.length} items
                    </p>
                    {items.length === 0 ? (
                        <EmptyState title="This checklist has no items" />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr><th className="num">#</th><th>Code</th><th>Requirement</th><th>Result</th></tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="num">{item.order}</td>
                                            <td className="mono nowrap">{item.item_code}</td>
                                            <td className="pre">
                                                {item.question}
                                                {item.remarks && <div className="muted">{item.remarks}</div>}
                                            </td>
                                            <td><Badge value={item.result} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="alert alert-info">
                        Recording results, evidence and NCs will be available once the audit-execution APIs are released.
                    </div>
                </>
            )}
        </Modal>
    );
}

/**
 * The auditor's own next step on an audit: complete orientation → start → view checklist.
 * `onChanged` is called after a successful action so the caller can reload.
 */
export default function AuditorActions({ audit, onChanged, compact }) {
    const notify = useToast();
    const [busy, setBusy] = useState("");
    const [showChecklist, setShowChecklist] = useState(false);
    const mine = audit.my_assignment;
    if (!mine) return null;

    const run = async (key, fn, message) => {
        setBusy(key);
        try {
            const result = await fn();
            notify(typeof message === "function" ? message(result) : message);
            await onChanged?.();
        } catch (err) {
            notify(errorMessage(err), "error");
        } finally {
            setBusy("");
        }
    };

    const blocker = startBlocker(audit);
    const size = compact ? "btn-sm" : "";

    return (
        <div className="auditor-actions">
            {mine.orientation_status === "PENDING" && (
                <button className={`btn btn-primary ${size}`} disabled={busy === "orientation"}
                    onClick={() => run("orientation", () => orientationsApi.complete(mine.orientation_id), "Orientation completed.")}>
                    {busy === "orientation" ? "Saving…" : "Mark orientation complete"}
                </button>
            )}

            {audit.status === "ASSIGNED" && mine.orientation_status === "COMPLETED" && (
                <button className={`btn btn-success ${size}`} disabled={Boolean(blocker) || busy === "start"}
                    title={blocker || ""}
                    onClick={() => run("start", () => auditsApi.start(audit.id), `${audit.audit_code} started.`)}>
                    {busy === "start" ? "Starting…" : "Start audit"}
                </button>
            )}

            {audit.status === "IN_PROGRESS" && (
                <button className={`btn btn-primary ${size}`} onClick={() => setShowChecklist(true)}>
                    Open checklist
                </button>
            )}

            {audit.status === "ASSIGNED" && mine.orientation_status === "COMPLETED" && blocker && (
                <span className="field-hint">{blocker}</span>
            )}

            {showChecklist && <ChecklistModal audit={audit} onClose={() => setShowChecklist(false)} />}
        </div>
    );
}
