import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pocsApi, projectMembersApi, projectsApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import {
    Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, SearchInput,
} from "../../components/ui";
import { formatDate } from "../../utils/format";
import { PROJECT_STATUSES, ROLES, departmentLabel, getDepartments } from "../../constants";
import { canManageProjects } from "../../permissions";
import { pocReadiness } from "../../workflow";

const EMPTY = { project_code: "", name: "", department: "", description: "", status: "ACTIVE" };

export function ReadinessBadge({ readiness, status }) {
    if (status && status !== "ACTIVE") return <Badge value="INACTIVE" label="Inactive" />;
    if (readiness.ready) return <Badge value="ACTIVE" label="Ready for audit" />;
    const missing = [!readiness.primary && "Primary", !readiness.secondary && "Secondary"].filter(Boolean);
    return <Badge tone="amber" label={`Needs ${missing.join(" & ")} POC`} />;
}

export function ProjectForm({ project, onClose, onSaved }) {
    const departments = getDepartments();
    const [form, setForm] = useState(
        project ? { ...EMPTY, ...project } : { ...EMPTY, department: departments[0]?.id ?? "" }
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const body = {
            project_code: form.project_code.trim(),
            name: form.name.trim(),
            department: Number(form.department),
            description: form.description,
            status: form.status,
        };
        try {
            const saved = project ? await projectsApi.update(project.id, body) : await projectsApi.create(body);
            onSaved(saved, Boolean(project));
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal
            title={project ? `Edit ${project.project_code}` : "New project"}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="project-form" disabled={busy}>
                        {busy ? "Saving…" : project ? "Save changes" : "Create project"}
                    </button>
                </>
            }
        >
            <form id="project-form" className="form-grid" onSubmit={submit}>
                <Field label="Project code">
                    <input className="input" value={form.project_code} onChange={set("project_code")}
                        placeholder="e.g. PRJ-001" required maxLength={50} autoFocus />
                </Field>
                <Field label="Name">
                    <input className="input" value={form.name} onChange={set("name")} required maxLength={150} />
                </Field>
                <Field label="Department">
                    <select className="input" value={form.department} onChange={set("department")} required>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </Field>
                <Field label="Status">
                    <select className="input" value={form.status} onChange={set("status")}>
                        {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </Field>
                <Field label="Description" full>
                    <textarea className="input" rows={3} value={form.description} onChange={set("description")} />
                </Field>
                {!project && (
                    <p className="field-hint field-full">You will be recorded as the project owner.</p>
                )}
            </form>
            <ErrorBox message={error} />
        </Modal>
    );
}

export default function ProjectsPage() {
    const { user } = useAuth();
    const notify = useToast();
    const canEdit = canManageProjects(user.role);
    const { data: loaded, loading, error, reload, setData: setLoaded } = useLoad(async () => {
        const projects = await projectsApi.list();
        // Directors read their own members; QMS reads the cross-project POC list.
        const members = user.role === ROLES.QMS
            ? await pocsApi.list()
            : (await Promise.all(projects.map((p) => projectMembersApi(p.id).list()))).flat();
        return { projects, members };
    });
    const data = loaded?.projects;
    const setData = (fn) => setLoaded((d) => ({ ...d, projects: fn(d.projects) }));
    const readinessOf = (projectId) =>
        pocReadiness((loaded?.members || []).filter((m) => m.project === projectId));

    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [status, setStatus] = useState("");
    const [dialog, setDialog] = useState(null); // {type: "form"|"view"|"delete", project}

    const projects = useMemo(() => {
        const q = search.toLowerCase();
        return (data || []).filter(
            (p) =>
                (!department || String(p.department) === department) &&
                (!status || p.status === status) &&
                [p.project_code, p.name, p.description, p.project_owner_name].some((v) => v?.toLowerCase().includes(q))
        );
    }, [data, search, department, status]);

    const onSaved = (saved, isEdit) => {
        setData((list) => (isEdit ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list]));
        notify(isEdit ? "Project updated." : "Project created.");
        setDialog(null);
    };

    const remove = async (project) => {
        await projectsApi.remove(project.id);
        setData((list) => list.filter((p) => p.id !== project.id));
        notify("Project deleted.");
    };

    return (
        <>
            <PageHeader
                title="Projects"
                subtitle={canEdit
                    ? "Your projects. Add members and mark one Primary and one Secondary POC before QMS can audit a project."
                    : "All projects. An audit can be created once a project has one Primary and one Secondary POC."}
                actions={canEdit && (
                    <button className="btn btn-primary" onClick={() => setDialog({ type: "form" })}>+ New project</button>
                )}
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search code, name, owner…" />
                    <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                        <option value="">All departments</option>
                        {getDepartments().map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : projects.length === 0 ? (
                    <EmptyState
                        title={data?.length ? "No projects match your filters" : "No projects yet"}
                        text={canEdit && !data?.length ? "Create the first project to start planning audits." : null}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Project</th>
                                    <th>Department</th>
                                    <th>Owner</th>
                                    <th>Status</th>
                                    <th>Audit readiness</th>
                                    <th>Updated</th>
                                    <th className="right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((p) => (
                                    <tr key={p.id}>
                                        <td className="mono">{p.project_code}</td>
                                        <td>
                                            <Link to={`/projects/${p.id}`} className="link"><strong>{p.name}</strong></Link>
                                            {p.description && <div className="muted clamp">{p.description}</div>}
                                        </td>
                                        <td>{departmentLabel(p.department)}</td>
                                        <td>{p.project_owner_name}</td>
                                        <td><Badge value={p.status} /></td>
                                        <td><ReadinessBadge readiness={readinessOf(p.id)} status={p.status} /></td>
                                        <td>{formatDate(p.updated_at)}</td>
                                        <td className="right nowrap">
                                            <Link className="btn btn-sm btn-ghost" to={`/projects/${p.id}`}>{canEdit ? "Members" : "View"}</Link>
                                            {canEdit && (
                                                <>
                                                    <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ type: "form", project: p })}>Edit</button>
                                                    <button className="btn btn-sm btn-ghost danger" onClick={() => setDialog({ type: "delete", project: p })}>Delete</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {dialog?.type === "form" && (
                <ProjectForm project={dialog.project} onClose={() => setDialog(null)} onSaved={onSaved} />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete project"
                    message={`Delete ${dialog.project.project_code} – ${dialog.project.name}? Projects that already have audits cannot be deleted; set them to Inactive instead.`}
                    onConfirm={() => remove(dialog.project)}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
