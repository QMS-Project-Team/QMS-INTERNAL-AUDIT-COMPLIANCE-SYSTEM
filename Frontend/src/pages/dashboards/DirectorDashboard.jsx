import { Link } from "react-router-dom";
import { auditsApi, checklistsApi, frameworksApi, projectMembersApi, projectsApi } from "../../api/endpoints";
import useLoad from "../../hooks/useLoad";
import { Badge, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { ChecklistCoverage, Stat, TaskList } from "../../components/dashboard";
import { formatDate } from "../../utils/format";
import { AUDIT_STATUS_LABELS, ROLE_LABELS, departmentLabel } from "../../constants";
import { auditStage, pocReadiness, stageMeta } from "../../workflow";
import NotificationPanel from "../../components/NotificationPanel";

export default function DirectorDashboard({ user }) {
    const { data, loading, error, reload } = useLoad(async () => {
        const [projects, audits, checklists, frameworks] = await Promise.all([
            projectsApi.list(),
            auditsApi.list(),
            checklistsApi.list(),
            frameworksApi.list(),
        ]);
        const members = await Promise.all(projects.map((p) => projectMembersApi(p.id).list()));
        return {
            projects: projects.map((p, i) => ({ ...p, members: members[i], readiness: pocReadiness(members[i]) })),
            audits,
            checklists,
            frameworks,
        };
    });

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { projects, audits, checklists, frameworks } = data;
    const active = projects.filter((p) => p.status === "ACTIVE");
    const ready = active.filter((p) => p.readiness.ready);
    const openAudits = audits.filter((a) => a.status !== "CLOSED");
    const openNcs = audits.reduce((n, a) => n + ((a.progress?.ncs?.total || 0) - (a.progress?.ncs?.accepted || 0)), 0);

    const todo = active
        .filter((p) => !p.readiness.ready)
        .map((p) => {
            const missing = [!p.readiness.primary && "Primary", !p.readiness.secondary && "Secondary"].filter(Boolean);
            return {
                key: p.id,
                to: `/projects/${p.id}`,
                code: p.project_code,
                text: p.name,
                meta: p.members.length ? `Mark ${missing.join(" & ")} POC` : "Add members & POCs",
            };
        });

    const auditRows = [...openAudits]
        .sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1))
        .slice(0, 8)
        .map((a) => {
            const stage = auditStage(a);
            return {
                key: a.id,
                to: `/audits/${a.id}`,
                code: a.audit_code,
                text: `${a.project_name} · ${a.framework_name}`,
                meta: (
                    <>
                        <span className="audit-date">{formatDate(a.planned_start_date)}</span>{" "}
                        <span className={`stage-pill stage-${stage.key}`}>{stageMeta(stage.key).label}</span>
                    </>
                ),
            };
        });

    return (
        <>
            <PageHeader
                title={`Welcome back, ${user.first_name || user.username}`}
                subtitle={`${ROLE_LABELS[user.role]} dashboard · ${departmentLabel(user.department)}`}
                actions={
                    <>
                        <Link to="/checklists" className="btn btn-ghost">Checklists</Link>
                        <Link to="/projects" className="btn btn-primary">Manage projects</Link>
                    </>
                }
            />
            <NotificationPanel />
            {todo.length > 0 && (
                <div className="banner banner-warn">
                    <span>
                        <strong>{todo.length}</strong> active project{todo.length === 1 ? "" : "s"} can't be audited yet: each needs one Primary and one Secondary POC.
                    </span>
                </div>
            )}

            <div className="stats">
                <Stat label="My projects" value={projects.length} sub={`${active.length} active`} to="/projects" />
                <Stat label="Ready for audit" value={`${ready.length}/${active.length}`} sub="Primary + Secondary POC set" to="/projects" />
                <Stat label="Open audits" value={openAudits.length} sub={`${audits.length - openAudits.length} closed`} to="/audits" />
                <Stat label="Open NCs" value={openNcs} sub="On your projects" to="/audits" />
                <Stat label="Active checklists" value={checklists.filter((c) => c.is_active).length}
                    sub={frameworks.filter((f) => f.is_active).map((f) => f.code).join(" · ") || "No frameworks"} to="/checklists" />
            </div>

            <div className="grid-2">
                <TaskList title="Needs your action" items={todo} viewAll={false}
                    empty="Every active project has its Primary and Secondary POC." />
                <TaskList title="Audits on your projects" items={auditRows}
                    empty="QMS hasn't created audits for your projects yet." />
            </div>

            <div className="card">
                <div className="card-head">
                    <div className="section-heading"><h2>Project readiness</h2></div>
                    <Link to="/projects" className="link section-action">All projects →</Link>
                </div>
                {projects.length === 0 ? (
                    <p className="muted">Create a project, add its employees and mark one Primary and one Secondary POC.</p>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Project</th><th>Department</th><th className="num">Members</th><th>Primary POC</th><th>Secondary POC</th><th className="num">Additional</th><th>Latest audit</th></tr>
                            </thead>
                            <tbody>
                                {projects.map((p) => {
                                    const poc = (type) => p.members.find((m) => m.poc_type === type)?.employee_name;
                                    const latest = audits.filter((a) => a.project === p.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
                                    return (
                                        <tr key={p.id}>
                                            <td><Link to={`/projects/${p.id}`} className="link"><strong>{p.name}</strong></Link> <span className="muted mono">{p.project_code}</span></td>
                                            <td>{departmentLabel(p.department)}</td>
                                            <td className="num">{p.members.length}</td>
                                            <td>{poc("PRIMARY") || <span className="danger-text">Not set</span>}</td>
                                            <td>{poc("SECONDARY") || <span className="danger-text">Not set</span>}</td>
                                            <td className="num">{p.members.filter((m) => m.poc_type === "ADDITIONAL").length}</td>
                                            <td>{latest ? <Badge value={latest.status} label={`${latest.audit_code} · ${AUDIT_STATUS_LABELS[latest.status]}`} /> : <span className="muted">—</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
                
            <ChecklistCoverage frameworks={frameworks} checklists={checklists} />
        </>
    );
}
