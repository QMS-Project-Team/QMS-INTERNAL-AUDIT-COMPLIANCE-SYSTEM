import { useMemo, useState } from "react";
import { checklistsApi, frameworksApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import useLoad from "../hooks/useLoad";
import { useToast } from "../components/Toast";
import {
    Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, SearchInput,
} from "../components/ui";
import { formatDate } from "../utils/format";
import { ROLES } from "../constants";

function FrameworkForm({ framework, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: framework?.name ?? "",
        code: framework?.code ?? "",
        description: framework?.description ?? "",
        is_active: framework?.is_active ?? true,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) =>
        setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const saved = framework ? await frameworksApi.update(framework.id, form) : await frameworksApi.create(form);
            onSaved(saved, Boolean(framework));
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal
            title={framework ? `Edit ${framework.name}` : "New framework"}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="framework-form" disabled={busy}>
                        {busy ? "Saving…" : "Save"}
                    </button>
                </>
            }
        >
            <form id="framework-form" className="form-grid" onSubmit={submit}>
                <Field label="Name">
                    <input className="input" value={form.name} onChange={set("name")} required maxLength={100} autoFocus />
                </Field>
                <Field label="Code">
                    <input className="input" value={form.code} onChange={set("code")} required maxLength={50} />
                </Field>
                <Field label="Description" full>
                    <textarea className="input" rows={3} value={form.description} onChange={set("description")} />
                </Field>
                <label className="check field-full">
                    <input type="checkbox" checked={form.is_active} onChange={set("is_active")} /> Active
                </label>
            </form>
            <ErrorBox message={error} />
        </Modal>
    );
}

export default function FrameworksPage() {
    const { user } = useAuth();
    const notify = useToast();
    // Backend: frameworks are readable by everyone, writable by QMS only.
    const canEdit = user.role === ROLES.QMS;
    const [search, setSearch] = useState("");
    const [dialog, setDialog] = useState(null);

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [frameworks, checklists] = await Promise.all([frameworksApi.list(), checklistsApi.list()]);
        return { frameworks, checklists };
    });

    const counts = useMemo(() => {
        const map = {};
        (data?.checklists || []).forEach((c) => {
            map[c.framework] = map[c.framework] || { total: 0, active: 0 };
            map[c.framework].total += 1;
            if (c.is_active) map[c.framework].active += 1;
        });
        return map;
    }, [data]);

    const frameworks = (data?.frameworks || []).filter((f) =>
        [f.name, f.code, f.description].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
    );

    const onSaved = (saved, isEdit) => {
        setData((d) => ({
            ...d,
            frameworks: isEdit ? d.frameworks.map((f) => (f.id === saved.id ? saved : f)) : [...d.frameworks, saved],
        }));
        notify(isEdit ? "Framework updated." : "Framework created.");
        setDialog(null);
    };

    const remove = async (framework) => {
        await frameworksApi.remove(framework.id);
        setData((d) => ({ ...d, frameworks: d.frameworks.filter((f) => f.id !== framework.id) }));
        notify("Framework deleted.");
    };

    return (
        <>
            <PageHeader
                title="Compliance frameworks"
                subtitle={canEdit ? "Standards audits are run against." : "Standards audits are run against. Frameworks are managed by QMS."}
                actions={canEdit && (
                    <button className="btn btn-primary" onClick={() => setDialog({ type: "form" })}>+ New framework</button>
                )}
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search frameworks…" />
                </div>
                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : frameworks.length === 0 ? (
                    <EmptyState title="No frameworks found" />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Framework</th>
                                    <th className="num">Checklists</th>
                                    <th>Status</th>
                                    <th>Updated</th>
                                    {canEdit && <th className="right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {frameworks.map((f) => (
                                    <tr key={f.id}>
                                        <td className="mono">{f.code}</td>
                                        <td>
                                            <strong>{f.name}</strong>
                                            {f.description && <div className="muted">{f.description}</div>}
                                        </td>
                                        <td className="num">
                                            {counts[f.id]?.active || 0}
                                            <span className="muted"> / {counts[f.id]?.total || 0}</span>
                                        </td>
                                        <td><Badge value={f.is_active ? "ACTIVE" : "INACTIVE"} /></td>
                                        <td>{formatDate(f.updated_at)}</td>
                                        {canEdit && (
                                            <td className="right nowrap">
                                                <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ type: "form", framework: f })}>Edit</button>
                                                <button className="btn btn-sm btn-ghost danger" onClick={() => setDialog({ type: "delete", framework: f })}>Delete</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="table-note muted">Checklists column: active / total.</p>
                    </div>
                )}
            </div>

            {dialog?.type === "form" && (
                <FrameworkForm framework={dialog.framework} onClose={() => setDialog(null)} onSaved={onSaved} />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete framework"
                    message={`Delete ${dialog.framework.name}? Frameworks with checklists or audits cannot be deleted.`}
                    onConfirm={() => remove(dialog.framework)}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
