import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, authApi, checklistsApi, frameworksApi, orientationsApi } from "../../api/endpoints";
import useLoad from "../../hooks/useLoad";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { ChecklistCoverage } from "../../components/dashboard";
import { formatDate } from "../../utils/format";
import { ROLES, departmentLabel } from "../../constants";
import { STAGES, auditStage, daysUntil, dueState, relativeDays, stageMeta } from "../../workflow";

const QMS_STAGES = ["assign", "schedule", "confirm"];
const ACTIVE_STAGES = STAGES.filter((s) => s.key !== "closing");

function Pipeline({ counts, active, onSelect }) {
    return (
        <div className="pipeline" role="tablist" aria-label="Audits by stage">
            {ACTIVE_STAGES.map((stage) => (
                <button
                    key={stage.key}
                    role="tab"
                    aria-selected={active === stage.key}
                    className={`pipe ${active === stage.key ? "is-active" : ""} ${QMS_STAGES.includes(stage.key) ? "is-mine" : ""}`}
                    onClick={() => onSelect(active === stage.key ? "mine" : stage.key)}
                >
                    <span className="pipe-count">{counts[stage.key] || 0}</span>
                    <span className="pipe-label">{stage.label}</span>
                    <span className="pipe-owner">{stage.owner}</span>
                </button>
            ))}
        </div>
    );
}

function WorkQueue({ rows, filter, setFilter, overdueCount }) {
    const FILTERS = [
        { key: "mine", label: "Needs QMS" },
        { key: "overdue", label: `Overdue (${overdueCount})` },
        { key: "all", label: "All active" },
    ];
    const stageFilter = stageMeta(filter);

    return (
        <div className="card">
            <div className="card-head">
                <h2>Work queue {stageFilter && <span className="muted">· {stageFilter.label}</span>}</h2>
                <div className="segmented" role="group" aria-label="Queue filter">
                    {FILTERS.map((f) => (
                        <button key={f.key} className={filter === f.key ? "is-active" : ""} onClick={() => setFilter(f.key)}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <EmptyState
                    title={filter === "mine" ? "Nothing waiting on QMS" : "No audits here"}
                    text={filter === "mine" ? "Audits come back here when they need assignment, scheduling or confirmation." : null}
                />
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Audit</th>
                                <th>Scope</th>
                                <th>Planned start</th>
                                <th>Stage</th>
                                <th>Next action</th>
                                <th>Deadline</th>
                                <th className="right" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ audit, stage, due, blocker }) => {
                                const meta = stageMeta(stage.key);
                                const mine = QMS_STAGES.includes(stage.key);
                                return (
                                    <tr key={audit.id}>
                                        <td>
                                            <Link to={`/audits/${audit.id}`} className="link mono"><strong>{audit.audit_code}</strong></Link>
                                            <div className="muted clamp">{audit.project_name}</div>
                                        </td>
                                        <td>
                                            {departmentLabel(audit.department)}
                                            <div className="muted">{audit.framework_name}</div>
                                        </td>
                                        <td className="nowrap">
                                            {formatDate(audit.planned_start_date)}
                                            <div className="muted">{relativeDays(daysUntil(audit.planned_start_date))}</div>
                                        </td>
                                        <td>
                                            <span className={`stage-pill stage-${stage.key}`}>{meta.label}</span>
                                            <div className="muted small">{meta.owner}</div>
                                        </td>
                                        <td>
                                            {blocker ? <span className="danger-text">⚠ {blocker}</span> : stage.next}
                                        </td>
                                        <td className="nowrap">
                                            {due ? (
                                                <>
                                                    <span className={`due due-${due.tone}`}>{due.text}</span>
                                                    <div className="muted small">{stage.dueLabel} · {formatDate(stage.due.toISOString())}</div>
                                                </>
                                            ) : (
                                                <span className="muted">—</span>
                                            )}
                                        </td>
                                        <td className="right">
                                            <Link to={`/audits/${audit.id}`} className={`btn btn-sm ${mine ? "btn-primary" : "btn-ghost"}`}>
                                                {mine ? "Act" : "View"}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function OrientationTracker({ orientations }) {
    const pending = orientations.filter((o) => o.status === "PENDING");
    const done = orientations.length - pending.length;
    const byAuditor = pending.reduce((acc, o) => {
        (acc[o.auditor_name] = acc[o.auditor_name] || []).push(o.audit_code);
        return acc;
    }, {});

    return (
        <div className="card">
            <div className="card-head">
                <h2>Orientation tracker</h2>
                <Link to="/orientations" className="link">All orientations →</Link>
            </div>
            <div className="progress-line">
                <div className="progress">
                    <span style={{ width: `${orientations.length ? (done / orientations.length) * 100 : 0}%` }} />
                </div>
                <span>{done} of {orientations.length} complete</span>
            </div>
            {pending.length === 0 ? (
                <p className="muted">{orientations.length ? "Every assigned auditor has completed orientation." : "No auditors assigned yet."}</p>
            ) : (
                <ul className="plain-list">
                    {Object.entries(byAuditor).map(([name, codes]) => (
                        <li key={name}>
                            <strong>{name}</strong>
                            <span className="chip-row">
                                {codes.map((code) => <span key={code} className="chip mono">{code}</span>)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function AuditorWorkload({ auditors, audits }) {
    const rows = auditors
        .map((user) => {
            const assignments = audits
                .filter((a) => a.status !== "CLOSED")
                .flatMap((a) => (a.progress?.auditors || []).filter((x) => x.auditor === user.id));
            return {
                user,
                total: assignments.length,
                primary: assignments.filter((a) => a.assignment_type === "PRIMARY").length,
                secondary: assignments.filter((a) => a.assignment_type === "SECONDARY").length,
                pending: assignments.filter((a) => a.orientation_status !== "COMPLETED").length,
            };
        })
        .sort((a, b) => b.total - a.total || a.user.username.localeCompare(b.user.username));
    const max = Math.max(1, ...rows.map((r) => r.total));

    return (
        <div className="card">
            <div className="card-head"><h2>Auditor workload</h2></div>
            {rows.length === 0 ? (
                <p className="muted">No users with the Auditor role.</p>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Auditor</th>
                                <th>Dept.</th>
                                <th>Active audits</th>
                                <th className="num" title="Primary / Secondary">P / S</th>
                                <th className="num">Orientation due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.user.id}>
                                    <td>{r.user.first_name ? `${r.user.first_name} ${r.user.last_name}` : r.user.username}</td>
                                    <td>{departmentLabel(r.user.department)}</td>
                                    <td>
                                        <span className="bar-cell">
                                            <span className="bar"><span style={{ width: `${(r.total / max) * 100}%` }} /></span>
                                            {r.total}
                                        </span>
                                    </td>
                                    <td className="num nowrap">{r.primary} / {r.secondary}</td>
                                    <td className="num">{r.pending ? <span className="due due-soon">{r.pending}</span> : 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="table-note muted">Auditors never audit their own department; roughly one auditor per five team members.</p>
        </div>
    );
}

export default function QmsDashboard({ user }) {
    const [filter, setFilter] = useState("mine");

    const { data, loading, error, reload } = useLoad(async () => {
        const [audits, orientations, checklists, frameworks, auditors] = await Promise.all([
            auditsApi.list(),
            orientationsApi.list(),
            checklistsApi.list(),
            frameworksApi.list(),
            authApi.users({ role: ROLES.AUDITOR }),
        ]);
        return { audits, orientations, checklists, frameworks, auditors };
    });

    const rows = useMemo(() => {
        if (!data) return [];
        return data.audits.map((audit) => {
            const stage = auditStage(audit);
            const hasChecklist = data.checklists.some(
                (c) => c.is_active && c.framework === audit.framework && c.department === audit.department
            );
            return {
                audit,
                stage,
                due: dueState(stage.due),
                blocker: stage.key === "assign" && !hasChecklist
                    ? `No active ${audit.framework_name} checklist for ${departmentLabel(audit.department)}`
                    : null,
            };
        });
    }, [data]);

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const active = rows.filter((r) => r.stage.key !== "closing");
    const counts = active.reduce((acc, r) => ({ ...acc, [r.stage.key]: (acc[r.stage.key] || 0) + 1 }), {});
    const overdue = active.filter((r) => r.due?.tone === "overdue");
    const mineCount = active.filter((r) => QMS_STAGES.includes(r.stage.key)).length;

    const visible = active
        .filter((r) =>
            filter === "all" ? true
                : filter === "mine" ? QMS_STAGES.includes(r.stage.key)
                    : filter === "overdue" ? r.due?.tone === "overdue"
                        : r.stage.key === filter
        )
        .sort((a, b) => (a.stage.due?.getTime() ?? Infinity) - (b.stage.due?.getTime() ?? Infinity));

    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`QMS dashboard · ${today}`}
                actions={
                    <>
                        <Link to="/checklists" className="btn btn-ghost">Checklists</Link>
                        <Link to="/audits" className="btn btn-primary">All audits</Link>
                    </>
                }
            />

            {(mineCount > 0 || overdue.length > 0) && (
                <div className={`banner ${overdue.length ? "banner-danger" : "banner-info"}`}>
                    <span>
                        <strong>{mineCount}</strong> audit{mineCount === 1 ? "" : "s"} waiting on QMS
                        {overdue.length > 0 && <> · <strong>{overdue.length}</strong> past deadline</>}
                    </span>
                    {overdue.length > 0 && (
                        <button className="btn btn-sm btn-ghost" onClick={() => setFilter("overdue")}>Show overdue</button>
                    )}
                </div>
            )}

            <Pipeline counts={counts} active={filter} onSelect={setFilter} />

            <WorkQueue rows={visible} filter={filter} setFilter={setFilter} overdueCount={overdue.length} />

            <div className="grid-2">
                <OrientationTracker orientations={data.orientations} />
                <AuditorWorkload auditors={data.auditors} audits={data.audits} />
            </div>

            <ChecklistCoverage frameworks={data.frameworks} checklists={data.checklists} />
        </>
    );
}
