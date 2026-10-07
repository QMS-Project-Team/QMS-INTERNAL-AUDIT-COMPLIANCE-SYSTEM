import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, checklistsApi, frameworksApi, pocsApi, projectsApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import { Badge, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, SearchInput } from "../../components/ui";
import { formatDate } from "../../utils/format";
import { AUDIT_STATUS_LABELS, ROLES, departmentLabel } from "../../constants";
import { isQms } from "../../permissions";
import { auditStage, myAuditRole, pocReadiness, stageMeta } from "../../workflow";

async function loadAuditLookups() {
    const [projects, frameworks, checklists, pocs] = await Promise.all([
        projectsApi.list(),
        frameworksApi.list(),
        checklistsApi.list(),
        pocsApi.list(),
    ]);
    return { projects, frameworks, checklists, pocs };
}

/** QMS creates an audit from a project + framework; the backend derives the department and copies the checklist. */
function AuditForm({ lookups, onClose, onSaved }) {
    const { projects, frameworks, checklists, pocs } = lookups;
    const activeProjects = projects.filter((p) => p.status === "ACTIVE");
    const activeFrameworks = frameworks.filter((f) => f.is_active);
    const readiness = (projectId) => pocReadiness(pocs.filter((m) => m.project === Number(projectId)));
    const firstReady = activeProjects.find((p) => readiness(p.id).ready) || activeProjects[0];

    const [form, setForm] = useState({
        audit_code: "",
        project: firstReady?.id ?? "",
        framework: activeFrameworks[0]?.id ?? "",
        planned_start_date: "",
        planned_end_date: "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const project = projects.find((p) => p.id === Number(form.project));
    const ready = project ? readiness(project.id) : null;
    const checklist = project && checklists.find(
        (c) => c.is_active && c.framework === Number(form.framework) && c.department === project.department
    );
    const blockers = [
        project && !ready.primary && "the project has no Primary POC",
        project && !ready.secondary && "the project has no Secondary POC",
        project && !checklist && `there is no active checklist for this framework and ${departmentLabel(project.department)}`,
    ].filter(Boolean);

    const submit = async (e) => {
        e.preventDefault();
        if (form.planned_end_date <= form.planned_start_date) {
            setError("Planned end date must be after the start date.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const saved = await auditsApi.create({
                ...form,
                audit_code: form.audit_code.trim(),
                project: Number(form.project),
                framework: Number(form.framework),
            });
            onSaved(saved);
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    const missing = !activeProjects.length ? "There are no active projects yet." : !activeFrameworks.length ? "There are no active frameworks yet." : "";

    return (
        <Modal
            title="Create audit"
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="audit-form" disabled={busy || Boolean(missing) || blockers.length > 0}>
                        {busy ? "Creating…" : "Create audit"}
                    </button>
                </>
            }
        >
            {missing ? (
                <div className="alert alert-warn">{missing}</div>
            ) : (
                <form id="audit-form" className="form-grid" onSubmit={submit}>
                    <Field label="Audit code">
                        <input className="input" value={form.audit_code} onChange={set("audit_code")}
                            placeholder="e.g. AUD-2026-H2-QA" required maxLength={50} autoFocus />
                    </Field>
                    <Field label="Project" hint={project ? `Department: ${departmentLabel(project.department)} (set from the project)` : null}>
                        <select className="input" value={form.project} onChange={set("project")} required>
                            {activeProjects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.project_code} – {p.name}{readiness(p.id).ready ? "" : " (POCs missing)"}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Compliance framework">
                        <select className="input" value={form.framework} onChange={set("framework")} required>
                            {activeFrameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </Field>
                    <div />
                    <Field label="Planned start">
                        <input className="input" type="date" value={form.planned_start_date} onChange={set("planned_start_date")} required />
                    </Field>
                    <Field label="Planned end">
                        <input className="input" type="date" value={form.planned_end_date} min={form.planned_start_date}
                            onChange={set("planned_end_date")} required />
                    </Field>
                    <div className="field-full">
                        {blockers.length > 0 ? (
                            <div className="alert alert-warn">Can't create this audit yet: {blockers.join("; ")}.</div>
                        ) : checklist ? (
                            <div className="alert alert-info">
                                The audit will get a copy of <strong>{checklist.name}</strong> ({checklist.items.filter((i) => i.is_active).length} active items).
                            </div>
                        ) : null}
                    </div>
                </form>
            )}
            <ErrorBox message={error} />
        </Modal>
    );
}

export default function AuditsPage() {
    const { user } = useAuth();
    const notify = useToast();
    const canCreate = isQms(user.role);
    const isEmployee = user.role === ROLES.EMPLOYEE;

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [audits, lookups] = await Promise.all([auditsApi.list(), canCreate ? loadAuditLookups() : null]);
        return { audits, lookups };
    });

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [creating, setCreating] = useState(false);

    const audits = useMemo(() => {
        const q = search.toLowerCase();
        return (data?.audits || [])
            .filter(
                (a) =>
                    (!status || a.status === status) &&
                    [a.audit_code, a.project_name, a.framework_name, departmentLabel(a.department)]
                        .some((v) => v?.toLowerCase().includes(q))
            )
            .sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1));
    }, [data, search, status]);

    const subtitle = canCreate
        ? "All audits. Create one per project and framework; the checklist is copied in automatically."
        : isEmployee
            ? "Audits you are assigned to as an auditor, and audits of your own project."
            : "Audits of the projects you own.";

    return (
        <>
            <PageHeader
                title={isEmployee ? "My audits" : "Audits"}
                subtitle={subtitle}
                actions={canCreate && (
                    <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!data}>+ New audit</button>
                )}
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search code, project, framework…" />
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {Object.entries(AUDIT_STATUS_LABELS)
                            .filter(([value]) => !["DRAFT", "PENDING_CLOSURE"].includes(value))
                            .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>

                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : audits.length === 0 ? (
                    <EmptyState title={data?.audits.length ? "No audits match your filters" : "No audits yet"} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Audit</th>
                                    <th>Project</th>
                                    <th>Framework</th>
                                    <th>Planned</th>
                                    <th>Stage</th>
                                    <th>Status</th>
                                    {isEmployee && <th>Your role</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {audits.map((a) => {
                                    const stage = auditStage(a);
                                    return (
                                        <tr key={a.id}>
                                            <td>
                                                <Link to={`/audits/${a.id}`} className="link mono"><strong>{a.audit_code}</strong></Link>
                                                <div className="muted">{departmentLabel(a.department)}</div>
                                            </td>
                                            <td>{a.project_name}</td>
                                            <td>{a.framework_name}</td>
                                            <td className="nowrap">{formatDate(a.planned_start_date)} → {formatDate(a.planned_end_date)}</td>
                                            <td>
                                                <span className={`stage-pill stage-${stage.key}`}>{stageMeta(stage.key).label}</span>
                                                <div className="muted small">{stage.next}</div>
                                            </td>
                                            <td><Badge value={a.status} label={AUDIT_STATUS_LABELS[a.status]} /></td>
                                            {isEmployee && <td className="nowrap">{myAuditRole(a)}</td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {creating && (
                <AuditForm
                    lookups={data.lookups}
                    onClose={() => setCreating(false)}
                    onSaved={(saved) => {
                        setData((d) => ({ ...d, audits: [saved, ...d.audits] }));
                        notify(`${saved.audit_code} created with its checklist. Next: assign auditors.`);
                        setCreating(false);
                    }}
                />
            )}
        </>
    );
}
