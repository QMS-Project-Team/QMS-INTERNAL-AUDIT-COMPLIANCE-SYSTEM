import { useState } from "react";
import { orientationsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import useLoad from "../hooks/useLoad";
import { useToast } from "../components/Toast";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { formatDateTime } from "../utils/format";
import { ROLES } from "../constants";

export function OrientationTable({ orientations, isAuditor, onCompleted }) {
    const notify = useToast();
    const [busy, setBusy] = useState(null);

    const complete = async (orientation) => {
        setBusy(orientation.id);
        try {
            const result = await orientationsApi.complete(orientation.id);
            notify(`Orientation for ${result.audit_code} completed.`);
            onCompleted(orientation.id, result);
        } catch (err) {
            notify(errorMessage(err), "error");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="table-wrap">
            <table className="table">
                <thead>
                    <tr>
                        <th>Audit</th>
                        {!isAuditor && <th>Auditor</th>}
                        <th>Status</th>
                        <th>Completed</th>
                        {isAuditor && <th className="right">Action</th>}
                    </tr>
                </thead>
                <tbody>
                    {orientations.map((o) => (
                        <tr key={o.id}>
                            <td className="mono"><strong>{o.audit_code}</strong></td>
                            {!isAuditor && <td>{o.auditor_name}</td>}
                            <td><Badge value={o.status} /></td>
                            <td>{formatDateTime(o.completed_at)}</td>
                            {isAuditor && (
                                <td className="right">
                                    {o.status === "PENDING" ? (
                                        <button className="btn btn-sm btn-primary" disabled={busy === o.id} onClick={() => complete(o)}>
                                            {busy === o.id ? "Saving…" : "Mark orientation complete"}
                                        </button>
                                    ) : (
                                        <span className="ok">✓ Done</span>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function OrientationsPage() {
    const { user } = useAuth();
    const isAuditor = user.role === ROLES.AUDITOR;
    const [filter, setFilter] = useState("");
    const { data, loading, error, reload, setData } = useLoad(() => orientationsApi.list());

    const orientations = (data || []).filter((o) => !filter || o.status === filter);

    const onCompleted = (id, result) =>
        setData((list) => list.map((o) => (o.id === id ? { ...o, status: result.status, completed_at: result.completed_at } : o)));

    return (
        <>
            <PageHeader
                title={isAuditor ? "My orientations" : "Auditor orientations"}
                subtitle={
                    isAuditor
                        ? "Go through the orientation programme (PPT) for each audit you're assigned to, then mark it complete."
                        : "Orientation progress of every assigned auditor."
                }
            />
            <div className="card">
                <div className="toolbar">
                    <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : orientations.length === 0 ? (
                    <EmptyState title="No orientations" text={isAuditor ? "You'll see an entry here when QMS assigns you to an audit." : null} />
                ) : (
                    <OrientationTable orientations={orientations} isAuditor={isAuditor} onCompleted={onCompleted} />
                )}
            </div>
        </>
    );
}
