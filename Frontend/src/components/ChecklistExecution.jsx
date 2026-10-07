import { useState } from "react";
import { auditItemsApi, auditsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import useLoad from "../hooks/useLoad";
import { useToast } from "./Toast";
import { Badge, ErrorBox, Loading } from "./ui";

/**
 * The assigned auditor evaluates the audit's checklist snapshot.
 * PENDING → COMPLIANT (final) or NON_COMPLIANT (creates an NC).
 * NON_COMPLIANT → COMPLIANT only once QMS has accepted that item's NC.
 */
export default function ChecklistExecution({ audit, ncs, onChanged }) {
    const notify = useToast();
    const { data, loading, error, reload } = useLoad(() => auditsApi.checklist(audit.id), [audit.id]);
    const [remarks, setRemarks] = useState({});
    const [busy, setBusy] = useState(null);

    if (loading && !data) return <Loading label="Loading checklist…" />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const items = [...data.items].sort((a, b) => a.order - b.order);
    const ncFor = (itemId) => ncs.find((nc) => nc.checklist_item_id === itemId);
    const done = items.filter((i) => i.result !== "PENDING").length;

    const evaluate = async (item, result) => {
        setBusy(item.id);
        try {
            const body = { result };
            if (remarks[item.id] !== undefined) body.remarks = remarks[item.id];
            await auditItemsApi(audit.id).update(item.id, body);
            notify(
                result === "NON_COMPLIANT"
                    ? `${item.item_code} marked non-compliant. An NC was opened: add the finding and risk action below.`
                    : `${item.item_code} marked compliant.`
            );
            await reload();
            await onChanged();
        } catch (err) {
            notify(errorMessage(err), "error");
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <div className="progress-line">
                <div className="progress"><span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
                <span>{done} of {items.length} items evaluated</span>
            </div>
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr><th className="num">#</th><th>Code</th><th>Requirement</th><th>Remarks / evidence</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const nc = ncFor(item.id);
                            const canRecheck = item.result === "NON_COMPLIANT" && nc?.status === "ACCEPTED";
                            return (
                                <tr key={item.id}>
                                    <td className="num">{item.order}</td>
                                    <td className="mono nowrap">{item.item_code}</td>
                                    <td className="pre">{item.question}</td>
                                    <td>
                                        {item.result === "PENDING" ? (
                                            <textarea
                                                className="input"
                                                rows={2}
                                                placeholder="What you checked, evidence seen…"
                                                value={remarks[item.id] ?? item.remarks}
                                                onChange={(e) => setRemarks({ ...remarks, [item.id]: e.target.value })}
                                            />
                                        ) : (
                                            <span className="pre">{item.remarks || <span className="muted">—</span>}</span>
                                        )}
                                    </td>
                                    <td className="nowrap">
                                        {item.result === "PENDING" ? (
                                            <div className="auditor-actions">
                                                <button className="btn btn-sm btn-success" disabled={busy === item.id}
                                                    onClick={() => evaluate(item, "COMPLIANT")}>Compliant</button>
                                                <button className="btn btn-sm btn-ghost danger" disabled={busy === item.id}
                                                    onClick={() => evaluate(item, "NON_COMPLIANT")}>Non-compliant</button>
                                            </div>
                                        ) : (
                                            <>
                                                <Badge value={item.result} />
                                                {canRecheck && (
                                                    <button className="btn btn-sm btn-success item-recheck" disabled={busy === item.id}
                                                        onClick={() => evaluate(item, "COMPLIANT")}>Mark compliant</button>
                                                )}
                                                {item.result === "NON_COMPLIANT" && !canRecheck && (
                                                    <div className="muted small">Mark compliant once QMS accepts the NC</div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="field-hint">
                A compliant result is final. Suggestions for improvement are not NCs; note them in the remarks.
            </p>
        </>
    );
}
