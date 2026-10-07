import { Link } from "react-router-dom";
import { auditsApi } from "../../api/endpoints";
import useLoad from "../../hooks/useLoad";
import AuditorActions from "../../components/AuditorActions";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { Stat } from "../../components/dashboard";
import { formatDate, formatDateTime } from "../../utils/format";
import { AUDIT_STATUS_LABELS, ROLE_LABELS, departmentLabel } from "../../constants";
import { auditStage, daysUntil, relativeDays } from "../../workflow";

/** Stage wording from the auditor's point of view. */
function auditorStatus(audit) {
    const stage = auditStage(audit);
    const mine = audit.my_assignment;
    switch (stage.key) {
        case "orientation":
            return mine?.orientation_status === "PENDING"
                ? { tone: "action", text: "Your orientation is due" }
                : { tone: "wait", text: "Waiting on co-auditor orientation" };
        case "schedule":
            return { tone: "wait", text: "Waiting for QMS to schedule" };
        case "confirm":
            return { tone: "wait", text: "Waiting for QMS confirmation" };
        case "ready":
            return { tone: "action", text: "Ready to start" };
        case "evaluating":
            return { tone: "action", text: stage.next };
        case "nc_recheck":
            return { tone: "action", text: stage.next };
        case "nc_team":
            return { tone: "live", text: "Waiting on the audited team's corrective actions" };
        case "nc_verify":
            return { tone: "live", text: "Waiting on QMS to verify NCs" };
        case "close":
            return { tone: "live", text: "Waiting on QMS to close" };
        case "closed":
            return { tone: "wait", text: "Closed" };
        default:
            return { tone: "wait", text: stage.next };
    }
}

function Steps({ audit }) {
    const p = audit.progress || {};
    const started = ["IN_PROGRESS", "PENDING_CLOSURE", "CLOSED"].includes(audit.status);
    const steps = [
        { label: "Orientation", done: audit.my_assignment?.orientation_status === "COMPLETED" },
        { label: "Scheduled", done: Boolean(p.schedule) },
        { label: "Confirmed", done: p.schedule?.status === "CONFIRMED" },
        { label: "Started", done: started },
        { label: "Evaluated", done: started && p.checklist?.pending === 0 },
        { label: "Closed", done: audit.status === "CLOSED" },
    ];
    return (
        <ol className="mini-steps">
            {steps.map((s) => (
                <li key={s.label} className={s.done ? "done" : ""}>
                    <span aria-hidden="true">{s.done ? "✓" : "○"}</span> {s.label}
                </li>
            ))}
        </ol>
    );
}

function AssignmentCard({ audit, isNext, onChanged }) {
    const p = audit.progress || {};
    const mine = audit.my_assignment;
    const status = auditorStatus(audit);
    const days = daysUntil(audit.planned_start_date);
    const team = (p.auditors || []).filter((a) => a.assignment_id !== mine.assignment_id);
    const openNcs = (p.ncs?.total || 0) - (p.ncs?.accepted || 0);

    return (
        <article className={`assignment-card tone-${status.tone}`}>
            {isNext && <span className="ribbon">Next up</span>}
            <header className="assignment-head">
                <div>
                    <Link to={`/audits/${audit.id}`} className="link mono assignment-code">{audit.audit_code}</Link>
                    <div className="muted">{audit.project_name}</div>
                </div>
                <Badge value={mine.assignment_type} label={`${mine.assignment_type.toLowerCase()} auditor`} />
            </header>

            <div className={`assignment-status status-${status.tone}`}>{status.text}</div>

            <dl className="assignment-meta">
                <div><dt>Department</dt><dd>{departmentLabel(audit.department)}</dd></div>
                <div><dt>Framework</dt><dd>{audit.framework_name}</dd></div>
                <div>
                    <dt>Planned</dt>
                    <dd>
                        {formatDate(audit.planned_start_date)} → {formatDate(audit.planned_end_date)}
                        {days !== null && days >= 0 && <span className="muted"> · {relativeDays(days)}</span>}
                    </dd>
                </div>
                <div>
                    <dt>Schedule</dt>
                    <dd>
                        {p.schedule ? <>{formatDateTime(p.schedule.scheduled_start)} <Badge value={p.schedule.status} /></> : <span className="muted">Not scheduled yet</span>}
                    </dd>
                </div>
                <div>
                    <dt>Checklist</dt>
                    <dd>
                        {p.checklist ? `${p.checklist.name} · ${p.checklist.item_count} items` : "—"}
                        {p.checklist && audit.status !== "ASSIGNED" && (
                            <div className="muted small">{p.checklist.compliant} compliant · {p.checklist.non_compliant} NC · {p.checklist.pending} pending</div>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>Co-auditor</dt>
                    <dd className="chip-row">
                        {team.length === 0 ? <span className="muted">Not assigned yet</span> : team.map((a) => (
                            <span key={a.assignment_id} className="chip">
                                {a.auditor_name} · {a.assignment_type.toLowerCase()}
                                {a.orientation_status !== "COMPLETED" && <span className="chip-flag" title="Orientation pending">•</span>}
                            </span>
                        ))}
                    </dd>
                </div>
            </dl>

            <Steps audit={audit} />

            <footer className="assignment-foot">
                <AuditorActions audit={audit} onChanged={onChanged} compact />
                <span className="auditor-actions">
                    {openNcs > 0 && <Link to={`/audits/${audit.id}#ncs`} className="btn btn-sm btn-ghost">{openNcs} open NC{openNcs === 1 ? "" : "s"}</Link>}
                    <Link to={`/audits/${audit.id}`} className="btn btn-sm btn-ghost">Details</Link>
                </span>
            </footer>
        </article>
    );
}

/** Audits of the employee's own project: the team answers NCs with corrective actions. */
function TeamAudits({ audits }) {
    return (
        <div className="card">
            <div className="card-head">
                <div className="section-heading">
                    <h2>Audits of your project</h2>
                    {audits.length > 0 && <span className="section-count">{audits.length}</span>}
                </div>
            </div>
            {audits.length === 0 ? (
                <p className="muted">No audits of your project yet.</p>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Audit</th><th>Framework</th><th>Planned</th><th>Auditors</th><th>Status</th><th>NCs needing your team</th><th /></tr>
                        </thead>
                        <tbody>
                            {audits.map((a) => {
                                const ncs = a.progress?.ncs || {};
                                const due = (ncs.awaiting_action || 0) + (ncs.rework_required || 0);
                                return (
                                    <tr key={a.id}>
                                        <td><Link to={`/audits/${a.id}`} className="link mono"><strong>{a.audit_code}</strong></Link></td>
                                        <td>{a.framework_name}</td>
                                        <td className="nowrap">{formatDate(a.planned_start_date)}</td>
                                        <td>{(a.progress?.auditors || []).map((x) => x.auditor_name).join(", ") || <span className="muted">—</span>}</td>
                                        <td><Badge value={a.status} label={AUDIT_STATUS_LABELS[a.status]} /></td>
                                        <td>
                                            {due > 0 ? <span className="due due-overdue">{due} to answer</span>
                                                : ncs.total ? <span className="muted">{ncs.accepted}/{ncs.total} accepted</span>
                                                    : <span className="muted">None</span>}
                                        </td>
                                        <td className="right">
                                            <Link to={`/audits/${a.id}#ncs`} className={`btn btn-sm ${due ? "btn-primary" : "btn-ghost"}`}>{due ? "Respond" : "View"}</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="table-note muted">
                For each NC, your team fills the correction, corrective action and preventive action. QMS then verifies them.
            </p>
        </div>
    );
}

const GUIDELINES = [
    "Complete the orientation programme before your first audit.",
    "You never audit your own project.",
    "Audit against the checklist and record what you checked in the remarks.",
    "Log every non-conformity within 2 days: the finding and the risk action are yours to fill.",
    "Suggestions for improvement are not NCs.",
    "Once QMS accepts an NC, mark that item compliant so the audit can close.",
];

export default function EmployeeDashboard({ user }) {
    const { data, loading, error, reload } = useLoad(() => auditsApi.list());

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const byDate = [...data].sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1));
    const auditing = byDate.filter((a) => a.my_assignment);
    const activeAuditing = auditing.filter((a) => a.status !== "CLOSED");
    const ownProject = byDate.filter((a) => !a.my_assignment);

    const orientationDue = activeAuditing.filter((a) => a.my_assignment.orientation_status === "PENDING");
    const toEvaluate = activeAuditing.filter((a) => ["ready", "evaluating", "nc_recheck"].includes(auditStage(a).key));
    const teamNcsDue = ownProject.reduce((n, a) => n + (a.progress?.ncs?.awaiting_action || 0) + (a.progress?.ncs?.rework_required || 0), 0);
    const today = activeAuditing.filter((a) => {
        const d = daysUntil(a.planned_start_date);
        return d !== null && d <= 0 && daysUntil(a.planned_end_date) >= 0;
    });
    const next = activeAuditing.find((a) => daysUntil(a.planned_start_date) >= 0) || activeAuditing[0];

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`${ROLE_LABELS[user.role]} · ${departmentLabel(user.department)}`}
                actions={<Link to="/audits" className="btn btn-ghost">My audits</Link>}
            />

            {today.length > 0 && (
                <div className="banner banner-info">
                    <span><strong>Audit day:</strong> {today.map((a) => a.audit_code).join(", ")} {today.length === 1 ? "is" : "are"} scheduled for today.</span>
                </div>
            )}
            {orientationDue.length > 0 && (
                <div className="banner banner-warn">
                    <span>Complete your orientation for <strong>{orientationDue.map((a) => a.audit_code).join(", ")}</strong> before auditing.</span>
                </div>
            )}
            {teamNcsDue > 0 && (
                <div className="banner banner-danger">
                    <span>Your project has <strong>{teamNcsDue}</strong> NC{teamNcsDue === 1 ? "" : "s"} waiting for corrective actions.</span>
                </div>
            )}

            <div className="stats">
                <Stat label="Auditing" value={activeAuditing.length} sub={`${auditing.length - activeAuditing.length} completed`} to="/audits" />
                <Stat label="Orientation due" value={orientationDue.length} to="/orientations" />
                <Stat label="To start or evaluate" value={toEvaluate.length} sub="As an auditor" />
                <Stat label="Team NCs to answer" value={teamNcsDue} sub="On your project" />
            </div>

            <div className="card-head section-head">
                <h2>Audits you're conducting</h2>
            </div>
            {activeAuditing.length === 0 ? (
                <div className="card">
                    <EmptyState title="No active auditing assignments"
                        text="POCs are picked by QMS to audit other projects. Your assignments will appear here." />
                </div>
            ) : (
                <div className="assignment-grid">
                    {activeAuditing.map((audit) => (
                        <AssignmentCard key={audit.id} audit={audit} isNext={audit.id === next?.id} onChanged={reload} />
                    ))}
                </div>
            )}

            <TeamAudits audits={ownProject} />

            <div className="card">
                <div className="card-head"><h2>Auditor guidelines</h2></div>
                <ul className="guidelines">
                    {GUIDELINES.map((g) => <li key={g}>{g}</li>)}
                </ul>
            </div>
        </>
    );
}
