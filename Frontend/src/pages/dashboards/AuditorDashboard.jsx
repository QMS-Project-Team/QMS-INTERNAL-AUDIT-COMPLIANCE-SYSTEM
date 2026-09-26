import { Link } from "react-router-dom";
import { auditsApi } from "../../api/endpoints";
import useLoad from "../../hooks/useLoad";
import AuditorActions from "../../components/AuditorActions";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { Stat } from "../../components/dashboard";
import { formatDate, formatDateTime } from "../../utils/format";
import { ROLE_LABELS, departmentLabel } from "../../constants";
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
        case "in_progress":
            return { tone: "live", text: "In progress" };
        default:
            return { tone: "wait", text: audit.status === "CLOSED" ? "Closed" : "Awaiting closure" };
    }
}

function Steps({ audit }) {
    const p = audit.progress || {};
    const steps = [
        { label: "Orientation", done: audit.my_assignment?.orientation_status === "COMPLETED" },
        { label: "Scheduled", done: Boolean(p.schedule) },
        { label: "Confirmed", done: p.schedule?.status === "CONFIRMED" },
        { label: "Started", done: ["IN_PROGRESS", "PENDING_CLOSURE", "CLOSED"].includes(audit.status) },
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
    const team = (p.auditors || []).filter((a) => a.assignment_id !== mine?.assignment_id);

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
                        {p.schedule ? (
                            <>
                                {formatDateTime(p.schedule.scheduled_start)}
                                {" "}<Badge value={p.schedule.status} />
                            </>
                        ) : (
                            <span className="muted">Not scheduled yet</span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>Checklist</dt>
                    <dd>{p.checklist ? `${p.checklist.name} · ${p.checklist.item_count} items` : <span className="muted">—</span>}</dd>
                </div>
                <div>
                    <dt>Co-auditors</dt>
                    <dd className="chip-row">
                        {team.length === 0 ? <span className="muted">None</span> : team.map((a) => (
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
                <Link to={`/audits/${audit.id}`} className="btn btn-sm btn-ghost">Details</Link>
            </footer>
        </article>
    );
}

const GUIDELINES = [
    "Complete the orientation programme before your first audit.",
    "You never audit your own department.",
    "Audit against the attached checklist and collect evidence for each item.",
    "Log every non-conformity within 2 days, including the risk action (yours to fill).",
    "Suggestions for improvement are not NCs.",
    "Verify corrective actions before accepting them. Only the auditor can close an NC or audit.",
];

export default function AuditorDashboard({ user }) {
    const { data, loading, error, reload } = useLoad(() => auditsApi.list());

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const byDate = [...data].sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1));
    const active = byDate.filter((a) => !["PENDING_CLOSURE", "CLOSED"].includes(a.status));
    const history = byDate.filter((a) => ["PENDING_CLOSURE", "CLOSED"].includes(a.status));

    const orientationDue = active.filter((a) => a.my_assignment?.orientation_status === "PENDING");
    const ready = active.filter((a) => auditStage(a).key === "ready");
    const today = active.filter((a) => {
        const d = daysUntil(a.planned_start_date);
        return d !== null && d <= 0 && daysUntil(a.planned_end_date) >= 0;
    });
    const next = active.find((a) => daysUntil(a.planned_start_date) >= 0) || active[0];
    const nextDays = next ? daysUntil(next.planned_start_date) : null;

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`${ROLE_LABELS[user.role]} · ${departmentLabel(user.department)}`}
                actions={<Link to="/audits" className="btn btn-ghost">My audits</Link>}
            />

            {today.length > 0 && (
                <div className="banner banner-info">
                    <span>
                        <strong>Audit day:</strong> {today.map((a) => a.audit_code).join(", ")}{" "}
                        {today.length === 1 ? "is" : "are"} scheduled for today.
                    </span>
                </div>
            )}
            {orientationDue.length > 0 && (
                <div className="banner banner-warn">
                    <span>
                        Complete your orientation for <strong>{orientationDue.map((a) => a.audit_code).join(", ")}</strong> before auditing.
                    </span>
                </div>
            )}

            <div className="stats">
                <Stat label="Active assignments" value={active.length} sub={`${history.length} completed`} to="/audits" />
                <Stat label="Orientation due" value={orientationDue.length} to="/orientations" />
                <Stat label="Ready to start" value={ready.length} sub="Scheduled and confirmed" />
                <Stat
                    label="Next audit"
                    value={next ? formatDate(next.planned_start_date) : "—"}
                    sub={next ? `${next.audit_code} · ${nextDays >= 0 ? relativeDays(nextDays) : "under way"}` : "Nothing scheduled"}
                />
            </div>

            <div className="card-head section-head">
                <h2>My assignments</h2>
            </div>

            {active.length === 0 ? (
                <div className="card">
                    <EmptyState title="No active assignments" text="You'll see audits here once QMS assigns you." />
                </div>
            ) : (
                <div className="assignment-grid">
                    {active.map((audit) => (
                        <AssignmentCard key={audit.id} audit={audit} isNext={audit.id === next?.id} onChanged={reload} />
                    ))}
                </div>
            )}

            <div className="grid-2">
                <div className="card">
                    <div className="card-head"><h2>Auditor guidelines</h2></div>
                    <ul className="guidelines">
                        {GUIDELINES.map((g) => <li key={g}>{g}</li>)}
                    </ul>
                </div>
                <div className="card">
                    <div className="card-head"><h2>Completed audits</h2></div>
                    {history.length === 0 ? (
                        <p className="muted">No completed audits yet.</p>
                    ) : (
                        <ul className="plain-list">
                            {history.map((a) => (
                                <li key={a.id}>
                                    <Link to={`/audits/${a.id}`} className="link mono">{a.audit_code}</Link>
                                    <span className="muted">{a.framework_name} · {formatDate(a.planned_start_date)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
