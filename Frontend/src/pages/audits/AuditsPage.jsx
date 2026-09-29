import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, loadAuditLookups } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import {
    Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, SearchInput,
} from "../../components/ui";
import { formatDate } from "../../utils/format";
import { AUDIT_STATUS_LABELS, DEPARTMENTS, departmentLabel, isManagement } from "../../constants";
import { isEditableAudit } from "../../permissions";

export function AuditForm({ audit, lookups, onClose, onSaved }) {
    const { projects, frameworks, checklists } = lookups;
    const activeFrameworks = frameworks.filter((f) => f.is_active || f.id === audit?.framework);
    const firstProject = projects.find((p) => p.status === "ACTIVE") || projects[0];

    const [form, setForm] = useState({
        audit_code: audit?.audit_code ?? "",
        project: audit?.project ?? firstProject?.id ?? "",
        department: audit?.department ?? firstProject?.department ?? "QA",
        framework: audit?.framework ?? activeFrameworks[0]?.id ?? "",
        planned_start_date: audit?.planned_start_date ?? "",
        planned_end_date: audit?.planned_end_date ?? "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    // Picking a project defaults the audited department to the project's department.
    const setProject = (e) => {
        const project = projects.find((p) => String(p.id) === e.target.value);
        setForm({ ...form, project: e.target.value, department: project?.department ?? form.department });
    };

    const matchingChecklist = checklists.find(
        (c) => c.is_active && String(c.framework) === String(form.framework) && c.department === form.department
    );

    const submit = async (e) => {
        e.preventDefault();
        if (form.planned_end_date < form.planned_start_date) {
            setError("Planned end date must be on or after the start date.");
            return;
        }
        setBusy(true);
        setError("");
        const body = {
            ...form,
            audit_code: form.audit_code.trim(),
            project: Number(form.project),
            framework: Number(form.framework),
        };
        try {
            const saved = audit ? await auditsApi.update(audit.id, body) : await auditsApi.create(body);
            onSaved(saved, Boolean(audit));
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    const missing = !projects.length ? "Create a project first." : !activeFrameworks.length ? "No active framework exists yet." : "";

    return (
        <Modal
            title={audit ? `Edit ${audit.audit_code}` : "Plan a new audit"}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="audit-form" disabled={busy || Boolean(missing)}>
                        {busy ? "Saving…" : audit ? "Save changes" : "Create audit"}
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
                    <Field label="Project">
                        <select className="input" value={form.project} onChange={setProject} required>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.project_code} – {p.name}{p.status === "ACTIVE" ? "" : " (inactive)"}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Audited department">
                        <select className="input" value={form.department} onChange={set("department")}>
                            {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Compliance framework">
                        <select className="input" value={form.framework} onChange={set("framework")} required>
                            {activeFrameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Planned start">
                        <input className="input" type="date" value={form.planned_start_date} onChange={set("planned_start_date")} required />
                    </Field>
                    <Field label="Planned end">
                        <input className="input" type="date" value={form.planned_end_date} min={form.planned_start_date}
                            onChange={set("planned_end_date")} required />
                    </Field>
                    <div className="field-full">
                        {matchingChecklist ? (
                            <div className="alert alert-info">
                                Checklist that will be used: <strong>{matchingChecklist.name}</strong> ({matchingChecklist.items.length} items)
                            </div>
                        ) : (
                            <div className="alert alert-warn">
                                No active checklist exists for this framework and department. QMS won't be able to complete
                                auditor assignment until one is created.
                            </div>
                        )}
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
    const canCreate = isManagement(user.role);

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [audits, lookups] = await Promise.all([auditsApi.list(), canCreate ? loadAuditLookups() : null]);
        return { audits, lookups };
    });

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [dialog, setDialog] = useState(null);

    const audits = useMemo(() => {
        const q = search.toLowerCase();
        return (data?.audits || [])
            .filter(
                (a) =>
                    (!status || a.status === status) &&
                    [a.audit_code, a.project_name, a.framework_name, a.created_by_name, departmentLabel(a.department)]
                        .some((v) => v?.toLowerCase().includes(q))
            )
            .sort((a, b) => (a.planned_start_date < b.planned_start_date ? -1 : 1));
    }, [data, search, status]);

    const onSaved = (saved, isEdit) => {
        setData((d) => ({ ...d, audits: isEdit ? d.audits.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...d.audits] }));
        notify(isEdit ? "Audit updated." : "Audit created. Next: nominate auditors.");
        setDialog(null);
    };

    const remove = async (audit) => {
        await auditsApi.remove(audit.id);
        setData((d) => ({ ...d, audits: d.audits.filter((a) => a.id !== audit.id) }));
        notify("Audit deleted.");
    };

    return (
        <>
            <PageHeader
                title="Audits"
                subtitle={canCreate ? "Audits you have planned." : user.role === "AUDITOR" ? "Audits you are assigned to." : "All audits across departments."}
                actions={canCreate && (
                    <button className="btn btn-primary" onClick={() => setDialog({ type: "form" })} disabled={!data}>+ New audit</button>
                )}
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search code, project, framework…" />
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
                                    <th>Department</th>
                                    <th>Framework</th>
                                    <th>Planned</th>
                                    <th>Status</th>
                                    <th className="right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {audits.map((a) => (
                                    <tr key={a.id}>
                                        <td>
                                            <Link to={`/audits/${a.id}`} className="link mono"><strong>{a.audit_code}</strong></Link>
                                            <div className="muted">by {a.created_by_name}</div>
                                        </td>
                                        <td>{a.project_name}</td>
                                        <td>{departmentLabel(a.department)}</td>
                                        <td>{a.framework_name}</td>
                                        <td className="nowrap">{formatDate(a.planned_start_date)} → {formatDate(a.planned_end_date)}</td>
                                        <td><Badge value={a.status} label={AUDIT_STATUS_LABELS[a.status]} /></td>
                                        <td className="right nowrap">
                                            <Link className="btn btn-sm btn-ghost" to={`/audits/${a.id}`}>Open</Link>
                                            {canCreate && isEditableAudit(a) && (
                                                <>
                                                    <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ type: "form", audit: a })}>Edit</button>
                                                    <button className="btn btn-sm btn-ghost danger" onClick={() => setDialog({ type: "delete", audit: a })}>Delete</button>
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
                <AuditForm audit={dialog.audit} lookups={data.lookups} onClose={() => setDialog(null)} onSaved={onSaved} />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete audit"
                    message={`Delete ${dialog.audit.audit_code}? Its nominations are deleted with it.`}
                    onConfirm={() => remove(dialog.audit)}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
