import { Link } from "react-router-dom";
import { auditsApi, checklistsApi, departmentsApi, frameworksApi, orientationsApi, projectsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import useLoad from "../hooks/useLoad";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { formatDate } from "../utils/format";
import { AUDIT_STATUS_LABELS, DEPARTMENTS, ROLES, ROLE_LABELS, departmentLabel, isManagement } from "../constants";
import { OrientationTable } from "./OrientationsPage";

function Stat({ label, value, sub, to }) {
    const body = (
        <>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </>
    );
    return to ? <Link to={to} className="stat stat-link">{body}</Link> : <div className="stat">{body}</div>;
}

function TaskList({ title, items, empty }) {
    return (
        <div className="card">
            <div className="card-head"><h2>{title}</h2></div>
            {items.length === 0 ? (
                <p className="muted">{empty}</p>
            ) : (
                <ul className="task-list">
                    {items.map((t) => (
                        <li key={t.key}>
                            <Link to={t.to} className="task">
                                <span>
                                    <strong className="mono">{t.code}</strong>
                                    <span className="muted"> · {t.text}</span>
                                </span>
                                <span className="task-meta">{t.meta}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Framework × department grid: which audits could complete assignment today. */
function ChecklistCoverage({ frameworks, checklists }) {
    const active = frameworks.filter((f) => f.is_active);
    return (
        <div className="card">
            <div className="card-head">
                <h2>Checklist coverage</h2>
                <Link to="/checklists" className="link">Manage checklists →</Link>
            </div>
            <p className="muted">
                Audits use the active checklist matching their framework and department. Red cells mean an audit there cannot complete assignment yet.
            </p>
            <div className="table-wrap">
                <table className="table coverage">
                    <thead>
                        <tr>
                            <th>Framework</th>
                            {DEPARTMENTS.map((d) => <th key={d.value} className="center">{d.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {active.map((f) => (
                            <tr key={f.id}>
                                <td><strong>{f.name}</strong></td>
                                {DEPARTMENTS.map((d) => {
                                    const c = checklists.find((x) => x.is_active && x.framework === f.id && x.department === d.value);
                                    const state = !c ? "missing" : c.items.length === 0 ? "empty" : "ok";
                                    return (
                                        <td key={d.value} className="center">
                                            {c ? (
                                                <Link to={`/checklists/${c.id}`} className={`cov cov-${state}`}>
                                                    {c.items.length} items
                                                </Link>
                                            ) : (
                                                <span className="cov cov-missing">None</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ManagementDashboard({ user }) {
    const { data, loading, error, reload } = useLoad(async () => {
        const [projects, audits, checklists, frameworks, departments] = await Promise.all([
            projectsApi.list(),
            auditsApi.list(),
            checklistsApi.list(),
            frameworksApi.list(),
            departmentsApi.list(),
        ]);
        return { projects, audits, checklists, frameworks, departments };
    });

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { projects, audits, checklists, frameworks, departments } = data;
    const byStatus = (s) => audits.filter((a) => a.status === s);
    const today = new Date().toISOString().slice(0, 10);

    const drafts = byStatus("DRAFT").map((a) => ({
        key: a.id, to: `/audits/${a.id}`, code: a.audit_code,
        text: `${a.project_name} · ${departmentLabel(a.department)}`,
        meta: "Nominate auditors & submit to QMS",
    }));
    const upcoming = audits
        .filter((a) => a.planned_start_date >= today && a.status !== "CLOSED")
        .sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1))
        .slice(0, 6)
        .map((a) => ({
            key: a.id, to: `/audits/${a.id}`, code: a.audit_code,
            text: `${a.framework_name} · ${departmentLabel(a.department)}`,
            meta: <><span className="muted">{formatDate(a.planned_start_date)}</span> <Badge value={a.status} label={AUDIT_STATUS_LABELS[a.status]} /></>,
        }));

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`${ROLE_LABELS[user.role]} dashboard · ${departmentLabel(user.department)}`}
                actions={
                    <>
                        <Link to="/projects" className="btn btn-ghost">Projects</Link>
                        <Link to="/audits" className="btn btn-primary">Plan an audit</Link>
                    </>
                }
            />

            <div className="stats">
                <Stat label="Projects" value={projects.length} sub={`${projects.filter((p) => p.status === "ACTIVE").length} active`} to="/projects" />
                <Stat label="My audits" value={audits.length} sub={`${byStatus("DRAFT").length} draft · ${byStatus("PENDING_ASSIGNMENT").length} with QMS`} to="/audits" />
                <Stat label="Active checklists" value={checklists.filter((c) => c.is_active).length} sub={`${checklists.length} total`} to="/checklists" />
                <Stat label="Frameworks" value={frameworks.filter((f) => f.is_active).length} sub={frameworks.map((f) => f.code).join(" · ")} to="/frameworks" />
                <Stat label="Departments" value={departments.length} sub={departments.map((d) => d.name).join(" · ")} to="/departments" />
            </div>

            <div className="grid-2">
                <TaskList title="Needs your action" items={drafts} empty="Nothing waiting on you. All your audits are with QMS or beyond." />
                <TaskList title="Upcoming audits" items={upcoming} empty="No upcoming audits planned." />
            </div>

            <ChecklistCoverage frameworks={frameworks} checklists={checklists} />
        </>
    );
}

function QmsDashboard({ user }) {
    const { data, loading, error, reload } = useLoad(async () => {
        const [audits, orientations, checklists, frameworks] = await Promise.all([
            auditsApi.list(),
            orientationsApi.list(),
            checklistsApi.list(),
            frameworksApi.list(),
        ]);
        return { audits, orientations, checklists, frameworks };
    });

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { audits, orientations, checklists, frameworks } = data;
    const item = (a, meta) => ({ key: a.id, to: `/audits/${a.id}`, code: a.audit_code, text: `${a.project_name} · ${departmentLabel(a.department)}`, meta });
    const pendingOrientation = orientations.filter((o) => o.status === "PENDING");

    return (
        <>
            <PageHeader title={`Welcome back, ${user.first_name || user.username}`} subtitle="QMS dashboard" />
            <div className="stats">
                <Stat label="All audits" value={audits.length} to="/audits" />
                <Stat label="Awaiting assignment" value={audits.filter((a) => a.status === "PENDING_ASSIGNMENT").length} to="/audits" />
                <Stat label="Assigned" value={audits.filter((a) => a.status === "ASSIGNED").length} to="/audits" />
                <Stat label="Pending orientations" value={pendingOrientation.length} to="/orientations" />
            </div>
            <div className="grid-2">
                <TaskList title="Assign auditors" empty="No audits waiting for assignment."
                    items={audits.filter((a) => a.status === "PENDING_ASSIGNMENT").map((a) => item(a, "Assign & complete"))} />
                <TaskList title="Schedule & confirm" empty="No assigned audits yet."
                    items={audits.filter((a) => a.status === "ASSIGNED").map((a) => item(a, formatDate(a.planned_start_date)))} />
            </div>
            <ChecklistCoverage frameworks={frameworks} checklists={checklists} />
        </>
    );
}

function AuditorDashboard({ user }) {
    const { data, loading, error, reload, setData } = useLoad(() => orientationsApi.list());

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const pending = data.filter((o) => o.status === "PENDING");
    const onCompleted = (id, result) =>
        setData((list) => list.map((o) => (o.id === id ? { ...o, status: result.status, completed_at: result.completed_at } : o)));

    return (
        <>
            <PageHeader title={`Welcome back, ${user.first_name || user.username}`} subtitle="Auditor dashboard" />
            <div className="stats">
                <Stat label="My assignments" value={data.length} to="/orientations" />
                <Stat label="Orientations pending" value={pending.length} to="/orientations" />
                <Stat label="Orientations done" value={data.length - pending.length} />
            </div>
            <div className="card">
                <div className="card-head"><h2>My assignments</h2></div>
                {data.length === 0 ? (
                    <EmptyState title="No assignments yet" text="You'll see audits here once QMS assigns you." />
                ) : (
                    <OrientationTable orientations={data} isAuditor onCompleted={onCompleted} />
                )}
                <p className="muted table-note">Audit execution, evidence and findings are coming in a later release.</p>
            </div>
        </>
    );
}

export default function Dashboard() {
    const { user } = useAuth();

    if (isManagement(user.role)) return <ManagementDashboard user={user} />;
    if (user.role === ROLES.QMS) return <QmsDashboard user={user} />;
    if (user.role === ROLES.AUDITOR) return <AuditorDashboard user={user} />;

    return (
        <>
            <PageHeader title={`Welcome, ${user.first_name || user.username}`} subtitle={ROLE_LABELS[user.role]} />
            <div className="card">
                <EmptyState title="Nothing to do yet" text="Team member screens (evidence upload, corrective actions) arrive with the next backend release." />
            </div>
        </>
    );
}
