import { Link } from "react-router-dom";
import { auditsApi, checklistsApi, departmentsApi, frameworksApi, projectsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import useLoad from "../hooks/useLoad";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { ChecklistCoverage, Stat, TaskList } from "../components/dashboard";
import { formatDate } from "../utils/format";
import { AUDIT_STATUS_LABELS, ROLES, ROLE_LABELS, departmentLabel, isManagement } from "../constants";
import QmsDashboard from "./dashboards/QmsDashboard";
import AuditorDashboard from "./dashboards/AuditorDashboard";

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
