import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { auditsApi, authApi, pocsApi, projectMembersApi, projectsApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import { Badge, ConfirmDialog, EmptyState, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { formatDate } from "../../utils/format";
import { AUDIT_STATUS_LABELS, POC_TYPES, ROLES, departmentLabel, pocLabel } from "../../constants";
import { canManageProjects } from "../../permissions";
import { pocReadiness } from "../../workflow";
import { ProjectForm, ReadinessBadge } from "./ProjectsPage";

const fullName = (u) => (u?.first_name ? `${u.first_name} ${u.last_name}` : u?.username || "—");

function MembersSection({ project, members, users, onChanged }) {
    const notify = useToast();
    const [employee, setEmployee] = useState("");
    const [busy, setBusy] = useState("");
    const [removing, setRemoving] = useState(null);
    const api = projectMembersApi(project.id);
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const memberIds = new Set(members.map((m) => m.employee));
    const candidates = users.filter((u) => u.role === ROLES.EMPLOYEE && !memberIds.has(u.id));

    const run = async (key, fn, message) => {
        setBusy(key);
        try {
            await fn();
            if (message) notify(message);
            await onChanged();
            return true;
        } catch (err) {
            notify(errorMessage(err), "error");
            await onChanged();
            return false;
        } finally {
            setBusy("");
        }
    };

    const add = async (e) => {
        e.preventDefault();
        const ok = await run("add", () => api.create({ employee: Number(employee) }), "Member added.");
        if (ok) setEmployee("");
    };

    // Only one Primary and one Secondary POC per project: moving the role to a
    // new member first makes the current holder an Additional POC.
    const changePoc = (member, pocType) =>
        run(`poc-${member.id}`, async () => {
            if (pocType === "PRIMARY" || pocType === "SECONDARY") {
                const holder = members.find((m) => m.poc_type === pocType && m.id !== member.id);
                if (holder) {
                    await api.patch(holder.id, { poc_type: "ADDITIONAL" });
                    notify(`${fullName(byId[holder.employee])} is now an Additional POC.`);
                }
            }
            await api.patch(member.id, { poc_type: pocType });
        }, `${fullName(byId[member.employee])} is now ${pocLabel(pocType) === "Member" ? "a member" : `the ${pocLabel(pocType)}`}.`);

    return (
        <>
            {members.length === 0 ? (
                <EmptyState title="No members yet" text="Add employees, then mark one Primary and one Secondary POC." />
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>POC role</th><th>Added</th><th /></tr>
                        </thead>
                        <tbody>
                            {members.map((m) => (
                                <tr key={m.id}>
                                    <td><strong>{fullName(byId[m.employee])}</strong> <span className="muted">{m.employee_name}</span></td>
                                    <td className="mono">{byId[m.employee]?.employee_id || "—"}</td>
                                    <td>{departmentLabel(byId[m.employee]?.department)}</td>
                                    <td>
                                        <select className="input input-narrow" value={m.poc_type}
                                            disabled={Boolean(busy)} aria-label={`POC role for ${m.employee_name}`}
                                            onChange={(e) => changePoc(m, e.target.value)}>
                                            {POC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </td>
                                    <td>{formatDate(m.created_at)}</td>
                                    <td className="right">
                                        <button className="btn btn-sm btn-ghost danger" onClick={() => setRemoving(m)}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <form className="inline-form" onSubmit={add}>
                <select className="input" value={employee} onChange={(e) => setEmployee(e.target.value)} required>
                    <option value="">{candidates.length ? "Select an employee…" : "No employees left to add"}</option>
                    {candidates.map((u) => (
                        <option key={u.id} value={u.id}>{fullName(u)} ({u.username}) · {departmentLabel(u.department)}</option>
                    ))}
                </select>
                <button className="btn btn-primary" disabled={!employee || busy === "add"}>
                    {busy === "add" ? "Adding…" : "Add member"}
                </button>
                <span className="field-hint">
                    An employee can belong to only one project. Primary, Secondary and Additional POCs can be picked as auditors for other projects.
                </span>
            </form>

            {removing && (
                <ConfirmDialog
                    title="Remove member"
                    message={`Remove ${fullName(byId[removing.employee])} from ${project.name}?`}
                    confirmLabel="Remove"
                    onConfirm={async () => {
                        await api.remove(removing.id);
                        notify("Member removed.");
                        await onChanged();
                    }}
                    onClose={() => setRemoving(null)}
                />
            )}
        </>
    );
}

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useToast();
    const canEdit = canManageProjects(user.role);
    const [dialog, setDialog] = useState(null);

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [project, audits, users] = await Promise.all([projectsApi.get(id), auditsApi.list(), authApi.users()]);
        // Directors manage the full member list; QMS can see the project's POCs.
        const members = canEdit
            ? await projectMembersApi(id).list()
            : (await pocsApi.list()).filter((m) => m.project === Number(id));
        return { project, members, users, audits: audits.filter((a) => a.project === Number(id)) };
    }, [id]);

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { project, members, users, audits } = data;
    const readiness = pocReadiness(members);
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const pocName = (type) => {
        const m = members.find((x) => x.poc_type === type);
        return m ? fullName(byId[m.employee]) : null;
    };

    return (
        <>
            <Link to="/projects" className="back-link">← All projects</Link>
            <PageHeader
                title={project.name}
                subtitle={`${project.project_code} · ${departmentLabel(project.department)} · owned by ${project.project_owner_name}`}
                actions={
                    <>
                        <Badge value={project.status} />
                        {canEdit && (
                            <>
                                <button className="btn btn-ghost" onClick={() => setDialog("edit")}>Edit</button>
                                <button className="btn btn-ghost danger" onClick={() => setDialog("delete")}>Delete</button>
                            </>
                        )}
                    </>
                }
            />

            <div className="card summary-card">
                <dl className="summary">
                    <div><dt>Primary POC</dt><dd>{pocName("PRIMARY") || <span className="danger-text">Not set</span>}</dd></div>
                    <div><dt>Secondary POC</dt><dd>{pocName("SECONDARY") || <span className="danger-text">Not set</span>}</dd></div>
                    <div><dt>{canEdit ? "Members" : "POCs"}</dt><dd>{members.length}</dd></div>
                    <div><dt>Audit readiness</dt><dd><ReadinessBadge readiness={readiness} status={project.status} /></dd></div>
                </dl>
                {project.description && <p className="muted pre">{project.description}</p>}
            </div>

            <section className="card">
                <div className="card-head">
                    <div className="section-heading">
                        <h2>{canEdit ? "Members & POCs" : "Points of contact"}</h2>
                    </div>
                </div>
                {canEdit ? (
                    <MembersSection project={project} members={members} users={users} onChanged={reload} />
                ) : members.length === 0 ? (
                    <p className="muted">The Director has not marked any POCs on this project yet.</p>
                ) : (
                    <ul className="plain-list">
                        {members.map((m) => (
                            <li key={m.id}>
                                <span>{fullName(byId[m.employee])} <span className="muted">{m.employee_name}</span></span>
                                <Badge value={m.poc_type} label={pocLabel(m.poc_type)} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="card">
                <div className="card-head">
                    <div className="section-heading"><h2>Audits</h2></div>
                </div>
                {audits.length === 0 ? (
                    <p className="muted">
                        {readiness.ready
                            ? "No audits yet. QMS can now create an audit for this project."
                            : "No audits yet. QMS can create one once the project has a Primary and a Secondary POC."}
                    </p>
                ) : (
                    <ul className="plain-list">
                        {audits.map((a) => (
                            <li key={a.id}>
                                <Link to={`/audits/${a.id}`} className="link mono">{a.audit_code}</Link>
                                <span>
                                    <span className="muted">{a.framework_name} · {formatDate(a.planned_start_date)} </span>
                                    <Badge value={a.status} label={AUDIT_STATUS_LABELS[a.status]} />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {dialog === "edit" && (
                <ProjectForm
                    project={project}
                    onClose={() => setDialog(null)}
                    onSaved={(saved) => {
                        setData((d) => ({ ...d, project: saved }));
                        notify("Project updated.");
                        setDialog(null);
                    }}
                />
            )}
            {dialog === "delete" && (
                <ConfirmDialog
                    title="Delete project"
                    message={`Delete ${project.project_code} – ${project.name}? Projects that already have audits cannot be deleted; set them to Inactive instead.`}
                    onConfirm={async () => {
                        await projectsApi.remove(project.id);
                        notify("Project deleted.");
                        navigate("/projects");
                    }}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
