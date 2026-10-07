import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, checklistsApi, frameworksApi, orientationsApi, pocsApi, projectsApi } from "../../api/endpoints";
import useLoad from "../../hooks/useLoad";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { ChecklistCoverage, TaskList } from "../../components/dashboard";
import { formatDate } from "../../utils/format";
import { departmentLabel, pocLabel } from "../../constants";
import { QMS_STAGES, STAGES, auditStage, daysUntil, dueState, pocReadiness, relativeDays, stageMeta } from "../../workflow";

const OPEN_STAGES = STAGES.filter((s) => s.key !== "closed");

function Pipeline({ counts, active, onSelect }) {
    return (
        <div className="pipeline pipeline-wide" role="tablist" aria-label="Audits by stage">
            {OPEN_STAGES.map((stage) => (
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
        { key: "all", label: "All open" },
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
                    text={filter === "mine" ? "Audits come back here when they need assignment, scheduling, confirmation, NC verification or closure." : null}
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
                            {rows.map(({ audit, stage, due }) => {
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
                                        <td>{stage.next}</td>
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

/** The POC pool and who is currently tied up on an open audit. */
function AuditorWorkload({ pocs, audits }) {
    const busy = {};
    audits
        .filter((a) => a.status !== "CLOSED")
        .forEach((a) => (a.progress?.auditors || []).forEach((x) => { busy[x.auditor] = { audit: a, type: x.assignment_type }; }));
    const available = pocs.filter((p) => !busy[p.employee]);

    return (
        <div className="card">
            <div className="card-head">
                <h2>Auditor pool</h2>
                <Link to="/auditor-pool" className="link">Full pool →</Link>
            </div>
            <div className="progress-line">
                <div className="progress"><span style={{ width: `${pocs.length ? (available.length / pocs.length) * 100 : 0}%` }} /></div>
                <span>{available.length} of {pocs.length} POCs available</span>
            </div>
            {pocs.length === 0 ? (
                <p className="muted">No POCs yet. Directors mark them on their projects.</p>
            ) : (
                <ul className="plain-list">
                    {pocs.slice(0, 8).map((p) => (
                        <li key={p.id}>
                            <span><strong>{p.employee_name}</strong> <span className="muted">· {pocLabel(p.poc_type)}, {p.project_code}</span></span>
                            {busy[p.employee] ? (
                                <Link to={`/audits/${busy[p.employee].audit.id}`} className="chip mono">{busy[p.employee].audit.audit_code}</Link>
                            ) : (
                                <span className="ok small">Available</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <p className="table-note muted">An employee can be on one open audit at a time and never audits their own project.</p>
        </div>
    );
}

export default function QmsDashboard({ user }) {
    const [filter, setFilter] = useState("mine");

    const { data, loading, error, reload } = useLoad(async () => {
        const [audits, orientations, checklists, frameworks, pocs, projects] = await Promise.all([
            auditsApi.list(),
            orientationsApi.list(),
            checklistsApi.list(),
            frameworksApi.list(),
            pocsApi.list(),
            projectsApi.list(),
        ]);
        return { audits, orientations, checklists, frameworks, pocs, projects };
    });

    const rows = useMemo(
        () => (data?.audits || []).map((audit) => {
            const stage = auditStage(audit);
            return { audit, stage, due: dueState(stage.due) };
        }),
        [data]
    );

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const open = rows.filter((r) => r.stage.key !== "closed");
    const counts = open.reduce((acc, r) => ({ ...acc, [r.stage.key]: (acc[r.stage.key] || 0) + 1 }), {});
    const overdue = open.filter((r) => r.due?.tone === "overdue");
    const mineCount = open.filter((r) => QMS_STAGES.includes(r.stage.key)).length;

    const visible = open
        .filter((r) =>
            filter === "all" ? true
                : filter === "mine" ? QMS_STAGES.includes(r.stage.key)
                    : filter === "overdue" ? r.due?.tone === "overdue"
                        : r.stage.key === filter
        )
        .sort((a, b) => (a.stage.due?.getTime() ?? Infinity) - (b.stage.due?.getTime() ?? Infinity));

    // Projects QMS could audit now: active, POCs set, and no open audit yet.
    const auditedProjects = new Set(data.audits.filter((a) => a.status !== "CLOSED").map((a) => a.project));
    const readyProjects = data.projects
        .filter((p) => p.status === "ACTIVE" && !auditedProjects.has(p.id))
        .filter((p) => pocReadiness(data.pocs.filter((m) => m.project === p.id)).ready)
        .map((p) => ({
            key: p.id,
            to: `/projects/${p.id}`,
            code: p.project_code,
            text: `${p.name} · ${departmentLabel(p.department)}`,
            meta: "Create audit",
        }));

    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`QMS dashboard · ${today}`}
                actions={
                    <>
                        <Link to="/auditor-pool" className="btn btn-ghost">Auditor pool</Link>
                        <Link to="/audits" className="btn btn-primary">Audits</Link>
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
                <TaskList title="Projects ready for an audit" items={readyProjects} viewAll={false}
                    empty="No active project with Primary + Secondary POCs is waiting for an audit." />
                <OrientationTracker orientations={data.orientations} />
            </div>

            <AuditorWorkload pocs={data.pocs} audits={data.audits} />

            <ChecklistCoverage frameworks={data.frameworks} checklists={data.checklists} />
        </>
    );
}
