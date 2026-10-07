import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { checklistItemsApi, checklistsApi, frameworksApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import { Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader } from "../../components/ui";
import { departmentLabel } from "../../constants";
import { canEditChecklists } from "../../permissions";
import { ChecklistForm } from "./ChecklistsPage";

function ItemForm({ checklistId, item, nextOrder, onClose, onSaved }) {
    const [form, setForm] = useState({
        item_code: item?.item_code ?? "",
        question: item?.question ?? "",
        order: item?.order ?? nextOrder,
        is_active: item?.is_active ?? true,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (key) => (e) =>
        setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const api = checklistItemsApi(checklistId);
        const body = { ...form, item_code: form.item_code.trim(), order: Number(form.order) };
        try {
            const saved = item ? await api.update(item.id, body) : await api.create(body);
            onSaved(saved, Boolean(item));
        } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
        }
    };

    return (
        <Modal
            title={item ? `Edit ${item.item_code}` : "Add checklist item"}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" form="item-form" disabled={busy}>
                        {busy ? "Saving…" : item ? "Save changes" : "Add item"}
                    </button>
                </>
            }
        >
            <form id="item-form" className="form-grid" onSubmit={submit}>
                <Field label="Item code">
                    <input className="input" value={form.item_code} onChange={set("item_code")}
                        placeholder="e.g. 7.5.1" required maxLength={50} autoFocus />
                </Field>
                <Field label="Order">
                    <input className="input" type="number" min={1} value={form.order} onChange={set("order")} required />
                </Field>
                <Field label="Question / requirement" full>
                    <textarea className="input" rows={4} value={form.question} onChange={set("question")} required />
                </Field>
                <label className="check field-full">
                    <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
                    Active. Only active items are copied into an audit's checklist.
                </label>
            </form>
            <ErrorBox message={error} />
        </Modal>
    );
}

export default function ChecklistDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useToast();
    const canEdit = canEditChecklists(user.role);
    const [dialog, setDialog] = useState(null);

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const [checklist, frameworks] = await Promise.all([checklistsApi.get(id), frameworksApi.list()]);
        return { checklist, frameworks };
    }, [id]);

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { checklist } = data;
    const items = [...checklist.items].sort((a, b) => a.order - b.order);
    const nextOrder = items.reduce((max, i) => Math.max(max, i.order), 0) + 1;

    const setItems = (fn) => setData((d) => ({ ...d, checklist: { ...d.checklist, items: fn(d.checklist.items) } }));

    const onItemSaved = (saved, isEdit) => {
        setItems((list) => (isEdit ? list.map((i) => (i.id === saved.id ? saved : i)) : [...list, saved]));
        notify(isEdit ? "Item updated." : "Item added.");
        setDialog(null);
    };

    const removeItem = async (item) => {
        await checklistItemsApi(checklist.id).remove(item.id);
        setItems((list) => list.filter((i) => i.id !== item.id));
        notify("Item deleted.");
    };

    const removeChecklist = async () => {
        await checklistsApi.remove(checklist.id);
        notify("Checklist deleted.");
        navigate("/checklists");
    };

    return (
        <>
            <Link to="/checklists" className="back-link">← All checklists</Link>
            <PageHeader
                title={checklist.name}
                subtitle={`${checklist.framework_name} · ${departmentLabel(checklist.department)}`}
                actions={canEdit && (
                    <>
                        <button className="btn btn-ghost" onClick={() => setDialog({ type: "edit" })}>Edit details</button>
                        <button className="btn btn-ghost danger" onClick={() => setDialog({ type: "delete" })}>Delete</button>
                        <button className="btn btn-primary" onClick={() => setDialog({ type: "item" })}>+ Add item</button>
                    </>
                )}
            />

            <div className="card">
                <div className="card-head">
                    <h2>Items <span className="muted">({items.length})</span></h2>
                    <Badge value={checklist.is_active ? "ACTIVE" : "INACTIVE"} />
                </div>
                {checklist.description && <p className="muted pre">{checklist.description}</p>}
                <ErrorBox message={error} onRetry={reload} />

                {items.length === 0 ? (
                    <EmptyState
                        title="No items yet"
                        text="Audits created with this checklist copy its active items, so add the requirements before QMS creates an audit."
                        action={canEdit && (
                            <button className="btn btn-primary" onClick={() => setDialog({ type: "item" })}>+ Add first item</button>
                        )}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="num">#</th>
                                    <th>Code</th>
                                    <th>Question</th>
                                    <th>Status</th>
                                    {canEdit && <th className="right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className={item.is_active ? "" : "row-muted"}>
                                        <td className="num">{item.order}</td>
                                        <td className="mono nowrap">{item.item_code}</td>
                                        <td className="pre">{item.question}</td>
                                        <td><Badge value={item.is_active ? "ACTIVE" : "INACTIVE"} /></td>
                                        {canEdit && (
                                            <td className="right nowrap">
                                                <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ type: "item", item })}>Edit</button>
                                                <button className="btn btn-sm btn-ghost danger" onClick={() => setDialog({ type: "deleteItem", item })}>Delete</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {dialog?.type === "item" && (
                <ItemForm checklistId={checklist.id} item={dialog.item} nextOrder={nextOrder}
                    onClose={() => setDialog(null)} onSaved={onItemSaved} />
            )}
            {dialog?.type === "deleteItem" && (
                <ConfirmDialog
                    title="Delete item"
                    message={`Delete item ${dialog.item.item_code}? Items already copied into an audit cannot be deleted; deactivate them instead.`}
                    onConfirm={() => removeItem(dialog.item)}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.type === "edit" && (
                <ChecklistForm
                    checklist={checklist}
                    frameworks={data.frameworks}
                    onClose={() => setDialog(null)}
                    onSaved={(saved) => {
                        setData((d) => ({ ...d, checklist: saved }));
                        notify("Checklist updated.");
                        setDialog(null);
                    }}
                />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete checklist"
                    message={`Delete "${checklist.name}" and all of its items?`}
                    onConfirm={removeChecklist}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
