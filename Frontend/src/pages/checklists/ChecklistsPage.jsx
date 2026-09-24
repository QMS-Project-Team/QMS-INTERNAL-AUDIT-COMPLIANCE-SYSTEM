import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { checklistsApi, frameworksApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import {
    Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, SearchInput,
} from "../../components/ui";
import { formatDate } from "../../utils/format";
import { DEPARTMENTS, departmentLabel } from "../../constants";
import { canEditChecklists } from "../../permissions";

export function ChecklistForm({ checklist, frameworks, onClose, onSaved }) {
    const [form, setForm] = useState({
        framework: checklist?.framework ?? frameworks[0]?.id ?? "",
        department: checklist?.department ?? "QA",
        name: checklist?.name ?? "",
        description: checklist?.description ?? "",
        is_active: checklist?.is_active ?? true,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) =>
        setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const body = { ...form, framework: Number(form.framework), name: form.name.trim() };
        try {
            const saved = checklist ? await checklistsApi.update(checklist.id, body) : await checklistsApi.create(body);
            onSaved(saved, Boolean(checklist));
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal
            title={checklist ? "Edit checklist" : "New master checklist"}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="checklist-form" disabled={busy || !frameworks.length}>
                        {busy ? "Saving…" : checklist ? "Save changes" : "Create checklist"}
                    </button>
                </>
            }
        >
            <form id="checklist-form" className="form-grid" onSubmit={submit}>
                <Field label="Framework">
                    <select className="input" value={form.framework} onChange={set("framework")} required>
                        {frameworks.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}{f.is_active ? "" : " (inactive)"}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Department">
                    <select className="input" value={form.department} onChange={set("department")}>
                        {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </Field>
                <Field label="Name" full>
                    <input className="input" value={form.name} onChange={set("name")} required maxLength={150} autoFocus />
                </Field>
                <Field label="Description" full>
                    <textarea className="input" rows={3} value={form.description} onChange={set("description")} />
                </Field>
                <label className="check field-full">
                    <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
                    Active. When an audit's assignment is completed, the active checklist matching its framework and department is used.
                </label>
            </form>
            <ErrorBox message={error} />
        </Modal>
    );
}

export default function ChecklistsPage() {
    const { user } = useAuth();
    const notify = useToast();
    const canEdit = canEditChecklists(user.role);
    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [checklists, frameworks] = await Promise.all([checklistsApi.list(), frameworksApi.list()]);
        return { checklists, frameworks };
    });

    const [search, setSearch] = useState("");
    const [framework, setFramework] = useState("");
    const [department, setDepartment] = useState("");
    const [dialog, setDialog] = useState(null);

    const checklists = useMemo(() => {
        const q = search.toLowerCase();
        return (data?.checklists || []).filter(
            (c) =>
                (!framework || String(c.framework) === framework) &&
                (!department || c.department === department) &&
                [c.name, c.description, c.framework_name].some((v) => v?.toLowerCase().includes(q))
        );
    }, [data, search, framework, department]);

    // Flag framework+department pairs with more than one active checklist: the backend picks the first.
    const duplicates = useMemo(() => {
        const counts = {};
        (data?.checklists || []).filter((c) => c.is_active).forEach((c) => {
            const key = `${c.framework}-${c.department}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [data]);

    const onSaved = (saved, isEdit) => {
        setData((d) => ({
            ...d,
            checklists: isEdit ? d.checklists.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...d.checklists],
        }));
        notify(isEdit ? "Checklist updated." : "Checklist created. Add its items next.");
        setDialog(null);
    };

    const remove = async (checklist) => {
        await checklistsApi.remove(checklist.id);
        setData((d) => ({ ...d, checklists: d.checklists.filter((c) => c.id !== checklist.id) }));
        notify("Checklist deleted.");
    };

    return (
        <>
            <PageHeader
                title="Master checklists"
                subtitle="One checklist per framework and department. Audits pick theirs automatically."
                actions={canEdit && (
                    <button className="btn btn-primary" onClick={() => setDialog({ type: "form" })} disabled={!data?.frameworks.length}>
                        + New checklist
                    </button>
                )}
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search checklists…" />
                    <select className="input" value={framework} onChange={(e) => setFramework(e.target.value)}>
                        <option value="">All frameworks</option>
                        {data?.frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                        <option value="">All departments</option>
                        {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>

                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : checklists.length === 0 ? (
                    <EmptyState title={data?.checklists.length ? "No checklists match your filters" : "No checklists yet"} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Checklist</th>
                                    <th>Framework</th>
                                    <th>Department</th>
                                    <th className="num">Items</th>
                                    <th>Status</th>
                                    <th>Updated</th>
                                    <th className="right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {checklists.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <Link to={`/checklists/${c.id}`} className="link"><strong>{c.name}</strong></Link>
                                            {c.is_active && duplicates[`${c.framework}-${c.department}`] > 1 && (
                                                <div className="warn-text">Another active checklist has the same framework and department</div>
                                            )}
                                        </td>
                                        <td>{c.framework_name}</td>
                                        <td>{departmentLabel(c.department)}</td>
                                        <td className="num">{c.items.length}</td>
                                        <td><Badge value={c.is_active ? "ACTIVE" : "INACTIVE"} /></td>
                                        <td>{formatDate(c.updated_at)}</td>
                                        <td className="right nowrap">
                                            <Link className="btn btn-sm btn-ghost" to={`/checklists/${c.id}`}>
                                                {canEdit ? "Items" : "View"}
                                            </Link>
                                            {canEdit && (
                                                <>
                                                    <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ type: "form", checklist: c })}>Edit</button>
                                                    <button className="btn btn-sm btn-ghost danger" onClick={() => setDialog({ type: "delete", checklist: c })}>Delete</button>
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
                <ChecklistForm checklist={dialog.checklist} frameworks={data.frameworks}
                    onClose={() => setDialog(null)} onSaved={onSaved} />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete checklist"
                    message={`Delete "${dialog.checklist.name}" and its ${dialog.checklist.items.length} items? Checklists already used by an audit cannot be deleted; deactivate them instead.`}
                    onConfirm={() => remove(dialog.checklist)}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
