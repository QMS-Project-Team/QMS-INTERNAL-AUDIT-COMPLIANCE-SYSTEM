import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    assignmentsApi, auditsApi, authApi, confirmationsApi, loadAuditLookups, nominationsApi, orientationsApi, scheduleApi,
} from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import {
    Badge, ConfirmDialog, EmptyState, ErrorBox, Field, Loading, PageHeader,
} from "../../components/ui";
import { formatDate, formatDateTime } from "../../utils/format";
import { AUDIT_STATUS_LABELS, ROLES, departmentLabel, isManagement } from "../../constants";
import { isEditableAudit } from "../../permissions";
import { AuditForm } from "./AuditsPage";
import AuditorActions from "../../components/AuditorActions";

const STATUS_ORDER = ["DRAFT", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "PENDING_CLOSURE", "CLOSED"];
const reached = (audit, status) => STATUS_ORDER.indexOf(audit.status) >= STATUS_ORDER.indexOf(status);

const fullName = (u) => (u ? (u.first_name ? `${u.first_name} ${u.last_name} (${u.username})` : u.username) : "—");

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => new Date(value).toISOString();

/** Runs an async action with a busy flag and routes its outcome to a toast. */
function useAction(reload) {
    const notify = useToast();
    const [busy, setBusy] = useState("");
    const run = async (key, fn, success) => {
        setBusy(key);
        try {
            const result = await fn();
            notify(typeof success === "function" ? success(result) : success);
            await reload();
            return true;
        } catch (err) {
            notify(errorMessage(err), "error");
            return false;
        } finally {
            setBusy("");
        }
    };
    return [busy, run];
}

function Section({ step, title, owner, state, children, aside }) {
    return (
        <section className={`card step-card step-${state}`}>
            <div className="card-head">
                <div className="step-title">
                    <span className="step-num">{state === "done" ? "✓" : step}</span>
                    <h2>{title}</h2>
                    {owner && <span className="owner-tag">{owner}</span>}
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

function Stepper({ steps }) {
    return (
        <ol className="stepper">
            {steps.map((s, i) => (
                <li key={s.label} className={`stepper-item ${s.state}`}>
                    <span className="stepper-dot">{s.state === "done" ? "✓" : i + 1}</span>
                    <span className="stepper-label">{s.label}</span>
                </li>
            ))}
        </ol>
    );
}

function NominationsSection({ audit, nominations, auditors, canManage, run, busy }) {
    const [auditor, setAuditor] = useState("");
    const [removing, setRemoving] = useState(null);
    const nominatedIds = new Set(nominations.map((n) => n.auditor));
    const eligible = auditors.filter((a) => a.department !== audit.department && !nominatedIds.has(a.id));
    const byId = Object.fromEntries(auditors.map((a) => [a.id, a]));
    const editable = canManage && isEditableAudit(audit);

    const nominate = async (e) => {
        e.preventDefault();
        const ok = await run("nominate", () => nominationsApi(audit.id).create({ auditor: Number(auditor) }), "Auditor nominated.");
        if (ok) setAuditor("");
    };

    return (
        <>
            {nominations.length === 0 ? (
                <EmptyState title="No auditors nominated yet"
                    text={editable ? "Nominate at least two auditors so QMS can assign a primary and a secondary." : "Waiting for the Director / Manager."} />
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr><th>Auditor</th><th>Department</th><th>Nominated by</th><th>When</th>{editable && <th />}</tr>
                        </thead>
                        <tbody>
                            {nominations.map((n) => (
                                <tr key={n.id}>
                                    <td>{fullName(byId[n.auditor]) || n.auditor_name}</td>
                                    <td>{departmentLabel(byId[n.auditor]?.department)}</td>
                                    <td>{n.nominated_by_name}</td>
                                    <td>{formatDateTime(n.nominated_at)}</td>
                                    {editable && (
                                        <td className="right">
                                            <button className="btn btn-sm btn-ghost danger" onClick={() => setRemoving(n)}>Remove</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editable && (
                <form className="inline-form" onSubmit={nominate}>
                    <select className="input" value={auditor} onChange={(e) => setAuditor(e.target.value)} required>
                        <option value="">{eligible.length ? "Select an auditor…" : "No eligible auditors left"}</option>
                        {eligible.map((a) => (
                            <option key={a.id} value={a.id}>{fullName(a)} · {departmentLabel(a.department)}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" disabled={!auditor || busy === "nominate"}>
                        {busy === "nominate" ? "Nominating…" : "Nominate"}
                    </button>
                    <span className="field-hint">Auditors from {departmentLabel(audit.department)} are excluded: no one audits their own department.</span>
                </form>
            )}

            {removing && (
                <ConfirmDialog
                    title="Remove nomination"
                    message={`Remove ${removing.auditor_name} from the nominated auditors?`}
                    confirmLabel="Remove"
                    onConfirm={() => nominationsApi(audit.id).remove(removing.id).then(() => run("noop", async () => {}, "Nomination removed."))}
                    onClose={() => setRemoving(null)}
                />
            )}
        </>
    );
}

function AssignmentsSection({ audit, nominations, assignments, orientations, auditors, isQMS, run, busy }) {
    const [auditor, setAuditor] = useState("");
    // Default to whichever type is still missing so the common path is two clicks.
    const [type, setType] = useState(() =>
        assignments.some((a) => a.assignment_type === "PRIMARY") ? "SECONDARY" : "PRIMARY"
    );
    const [removing, setRemoving] = useState(null);
    const assignedIds = new Set(assignments.map((a) => a.auditor));
    const candidates = nominations.filter((n) => !assignedIds.has(n.auditor));
    const byId = Object.fromEntries(auditors.map((a) => [a.id, a]));
    const orientationFor = (assignmentId) => orientations?.find((o) => o.assignment === assignmentId);
    const pending = audit.status === "PENDING_ASSIGNMENT";
    const hasPrimary = assignments.some((a) => a.assignment_type === "PRIMARY");
    const hasSecondary = assignments.some((a) => a.assignment_type === "SECONDARY");

    const assign = async (e) => {
        e.preventDefault();
        const ok = await run(
            "assign",
            () => assignmentsApi(audit.id).create({ auditor: Number(auditor), assignment_type: type }),
            "Auditor assigned. An orientation record was created for them."
        );
        if (ok) {
            setAuditor("");
            if (type === "PRIMARY" && !hasSecondary) setType("SECONDARY");
        }
    };

    return (
        <>
            {assignments.length === 0 ? (
                <EmptyState title="No auditors assigned yet"
                    text={isQMS ? "Assign at least one PRIMARY and one SECONDARY auditor from the nominated list." : "Waiting for QMS."} />
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Auditor</th><th>Role in audit</th><th>Assigned by</th>
                                {orientations && <th>Orientation</th>}
                                {isQMS && pending && <th />}
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map((a) => (
                                <tr key={a.id}>
                                    <td>{fullName(byId[a.auditor]) || a.auditor_name}</td>
                                    <td><Badge value={a.assignment_type} /></td>
                                    <td>{a.assigned_by_name} <span className="muted">· {formatDate(a.assigned_at)}</span></td>
                                    {orientations && <td><Badge value={orientationFor(a.id)?.status || "PENDING"} /></td>}
                                    {isQMS && pending && (
                                        <td className="right">
                                            <button className="btn btn-sm btn-ghost danger" onClick={() => setRemoving(a)}>Remove</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isQMS && pending && (
                <>
                    <form className="inline-form" onSubmit={assign}>
                        <select className="input" value={auditor} onChange={(e) => setAuditor(e.target.value)} required>
                            <option value="">{candidates.length ? "Select a nominated auditor…" : "All nominees are assigned"}</option>
                            {candidates.map((n) => <option key={n.id} value={n.auditor}>{fullName(byId[n.auditor]) || n.auditor_name}</option>)}
                        </select>
                        <select className="input input-narrow" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="PRIMARY">Primary</option>
                            <option value="SECONDARY">Secondary</option>
                        </select>
                        <button className="btn btn-primary" disabled={!auditor || busy === "assign"}>
                            {busy === "assign" ? "Assigning…" : "Assign"}
                        </button>
                    </form>

                    <div className="action-row">
                        <div className="checks">
                            <span className={hasPrimary ? "ok" : "todo"}>{hasPrimary ? "✓" : "○"} Primary auditor</span>
                            <span className={hasSecondary ? "ok" : "todo"}>{hasSecondary ? "✓" : "○"} Secondary auditor</span>
                        </div>
                        <button
                            className="btn btn-success"
                            disabled={!hasPrimary || !hasSecondary || busy === "complete"}
                            onClick={() => run("complete", () => auditsApi.completeAssignment(audit.id),
                                (r) => `Assignment completed. Checklist "${r.checklist_name}" attached to the audit.`)}
                        >
                            {busy === "complete" ? "Completing…" : "Complete assignment"}
                        </button>
                    </div>
                    <p className="field-hint">
                        Completing assignment attaches the active checklist for this audit's framework and department, and sets the audit to Assigned.
                    </p>
                </>
            )}

            {removing && (
                <ConfirmDialog
                    title="Remove assignment"
                    message={`Remove ${removing.auditor_name} (${removing.assignment_type.toLowerCase()}) from this audit? Their orientation record is removed too.`}
                    confirmLabel="Remove"
                    onConfirm={() => assignmentsApi(audit.id).remove(removing.id).then(() => run("noop", async () => {}, "Assignment removed."))}
                    onClose={() => setRemoving(null)}
                />
            )}
        </>
    );
}

function OrientationSection({ audit, orientations: qmsOrientations, isQMS, run, busy, onChanged }) {
    // QMS gets full orientation records; everyone else uses the audit's progress summary.
    const orientations = qmsOrientations || (audit.progress?.auditors || []).map((a) => ({
        id: a.assignment_id,
        auditor_name: a.auditor_name,
        status: a.orientation_status || "PENDING",
        completed_at: null,
    }));
    const done = orientations.filter((o) => o.status === "COMPLETED").length;

    return (
        <>
            <div className="progress-line">
                <div className="progress"><span style={{ width: `${orientations.length ? (done / orientations.length) * 100 : 0}%` }} /></div>
                <span>{done} of {orientations.length} auditors completed</span>
            </div>
            <ul className="plain-list">
                {orientations.map((o) => (
                    <li key={o.id}>
                        <span>{o.auditor_name}</span>
                        <span>
                            <Badge value={o.status} />
                            {o.completed_at && <span className="muted"> {formatDateTime(o.completed_at)}</span>}
                        </span>
                    </li>
                ))}
            </ul>
            {audit.my_assignment?.orientation_status === "PENDING" && (
                <AuditorActions audit={audit} onChanged={onChanged} />
            )}
            {isQMS && audit.status === "ASSIGNED" && (
                <button className="btn btn-ghost" disabled={busy === "orientation"}
                    onClick={() => run("orientation", () => auditsApi.completeOrientation(audit.id), (r) => r.detail)}>
                    {busy === "orientation" ? "Checking…" : "Verify all orientations are complete"}
                </button>
            )}
        </>
    );
}

function ScheduleSection({ audit, schedule, confirmations, isQMS, run, busy }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(() => ({
        start: schedule ? toLocalInput(schedule.scheduled_start) : `${audit.planned_start_date}T09:00`,
        end: schedule ? toLocalInput(schedule.scheduled_end) : `${audit.planned_end_date}T17:00`,
    }));
    const canCreate = isQMS && !schedule && audit.status === "ASSIGNED";
    const canEdit = isQMS && schedule && confirmations.length === 0;

    const submit = async (e) => {
        e.preventDefault();
        const body = { scheduled_start: fromLocalInput(form.start), scheduled_end: fromLocalInput(form.end) };
        const ok = await run(
            "schedule",
            () => (schedule ? scheduleApi(audit.id).update(schedule.id, body) : scheduleApi(audit.id).create(body)),
            schedule ? "Schedule updated." : "Audit scheduled. Next: record the confirmations."
        );
        if (ok) setEditing(false);
    };

    if (schedule && !editing) {
        return (
            <div className="schedule-view">
                <dl className="details">
                    <dt>Starts</dt><dd>{formatDateTime(schedule.scheduled_start)}</dd>
                    <dt>Ends</dt><dd>{formatDateTime(schedule.scheduled_end)}</dd>
                    <dt>Status</dt><dd><Badge value={schedule.status} /></dd>
                    <dt>Scheduled by</dt><dd>{schedule.scheduled_by_name}</dd>
                </dl>
                {canEdit && <button className="btn btn-ghost" onClick={() => setEditing(true)}>Reschedule</button>}
            </div>
        );
    }

    if (!canCreate && !editing) {
        return <p className="muted">{audit.status === "ASSIGNED" ? "Waiting for QMS to schedule the audit." : "Available once auditor assignment is complete."}</p>;
    }

    return (
        <form className="form-grid" onSubmit={submit}>
            <Field label="Start">
                <input className="input" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            </Field>
            <Field label="End">
                <input className="input" type="datetime-local" value={form.end} min={form.start} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
            </Field>
            <div className="field-full form-actions">
                {editing && <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
                <button className="btn btn-primary" disabled={busy === "schedule" || form.end <= form.start}>
                    {busy === "schedule" ? "Saving…" : schedule ? "Save schedule" : "Schedule audit"}
                </button>
            </div>
            <p className="field-hint field-full">Per the audit plan, schedule at T-15 days; this is when the combined confirmation goes out.</p>
        </form>
    );
}

const CONFIRMATION_TYPES = [
    { type: "COMBINED", label: "Combined confirmation", hint: "Sent across all departments when scheduled (T-15)." },
    { type: "INDIVIDUAL", label: "Individual confirmation", hint: "Sent to the audited department about a week before (T-7)." },
];

function ConfirmationsSection({ audit, schedule, confirmations, isQMS, run, busy }) {
    if (!schedule) return <p className="muted">Available once the audit is scheduled.</p>;

    return (
        <div className="confirm-grid">
            {CONFIRMATION_TYPES.map(({ type, label, hint }) => {
                const record = confirmations.find((c) => c.confirmation_type === type);
                return (
                    <div key={type} className={`confirm-tile ${record ? "is-done" : ""}`}>
                        <strong>{label}</strong>
                        <span className="muted">{hint}</span>
                        {record ? (
                            <span className="ok">✓ Recorded by {record.confirmed_by_name} · {formatDateTime(record.confirmed_at)}</span>
                        ) : isQMS ? (
                            <button className="btn btn-primary btn-sm" disabled={busy === type}
                                onClick={() => run(type, () => confirmationsApi(audit.id).create(type), `${label} recorded.`)}>
                                {busy === type ? "Recording…" : "Record"}
                            </button>
                        ) : (
                            <span className="muted">Pending</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function AuditDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useToast();
    const isQMS = user.role === ROLES.QMS;
    const canManage = isManagement(user.role);
    const [dialog, setDialog] = useState(null);

    const { data, loading, error, reload, setData } = useLoad(async () => {
        const audit = await auditsApi.get(id);
        const [nominations, assignments, schedule, confirmations, auditors, orientations] = await Promise.all([
            nominationsApi(id).list(),
            assignmentsApi(id).list(),
            scheduleApi(id).get(),
            confirmationsApi(id).list(),
            authApi.users({ role: ROLES.AUDITOR }),
            // Only QMS can see every auditor's orientation.
            isQMS ? orientationsApi.list().then((all) => all.filter((o) => o.audit_code === audit.audit_code)) : null,
        ]);
        return { audit, nominations, assignments, schedule, confirmations, auditors, orientations };
    }, [id]);

    const [busy, run] = useAction(reload);

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { audit, nominations, assignments, schedule, confirmations, auditors, orientations } = data;
    const allOriented = orientations ? orientations.length > 0 && orientations.every((o) => o.status === "COMPLETED") : null;

    const stateOf = (done, active) => (done ? "done" : active ? "current" : "upcoming");
    const submitted = reached(audit, "PENDING_ASSIGNMENT");
    const assigned = reached(audit, "ASSIGNED");
    const steps = [
        { label: "Nominate", state: stateOf(submitted, !submitted) },
        { label: "Assign", state: stateOf(assigned, submitted && !assigned) },
        { label: "Orientation", state: stateOf(allOriented === true || (allOriented === null && Boolean(schedule)), assigned && !schedule) },
        { label: "Schedule", state: stateOf(Boolean(schedule), assigned && !schedule) },
        { label: "Confirm", state: stateOf(schedule?.status === "CONFIRMED", Boolean(schedule) && schedule.status !== "CONFIRMED") },
        { label: "Execute", state: audit.status === "IN_PROGRESS" ? "current" : reached(audit, "PENDING_CLOSURE") ? "done" : "upcoming" },
    ];

    return (
        <>
            <Link to="/audits" className="back-link">← All audits</Link>
            <PageHeader
                title={audit.audit_code}
                subtitle={`${audit.project_name} · ${departmentLabel(audit.department)} · ${audit.framework_name}`}
                actions={
                    <>
                        <Badge value={audit.status} label={AUDIT_STATUS_LABELS[audit.status]} />
                        {canManage && isEditableAudit(audit) && (
                            <>
                                <button className="btn btn-ghost" onClick={async () => setDialog({ type: "edit", lookups: await loadAuditLookups() })}>Edit</button>
                                <button className="btn btn-ghost danger" onClick={() => setDialog({ type: "delete" })}>Delete</button>
                            </>
                        )}
                    </>
                }
            />

            <div className="card summary-card">
                <dl className="summary">
                    <div><dt>Planned</dt><dd>{formatDate(audit.planned_start_date)} → {formatDate(audit.planned_end_date)}</dd></div>
                    <div><dt>Created by</dt><dd>{audit.created_by_name}</dd></div>
                    <div><dt>Nominated</dt><dd>{nominations.length}</dd></div>
                    <div><dt>Assigned</dt><dd>{assignments.length}</dd></div>
                </dl>
                <Stepper steps={steps} />
            </div>

            <ErrorBox message={error} onRetry={reload} />

            <Section step={1} title="Nominate auditors" owner="Director / Manager" state={steps[0].state}
                aside={canManage && audit.status === "DRAFT" && (
                    <button className="btn btn-success" disabled={nominations.length < 2 || busy === "submit"}
                        title={nominations.length < 2 ? "Nominate at least two auditors first" : ""}
                        onClick={() => run("submit", () => auditsApi.patch(audit.id, { status: "PENDING_ASSIGNMENT" }), "Sent to QMS for auditor assignment.")}>
                        {busy === "submit" ? "Submitting…" : "Submit to QMS"}
                    </button>
                )}>
                <NominationsSection audit={audit} nominations={nominations} auditors={auditors} canManage={canManage} run={run} busy={busy} />
            </Section>

            <Section step={2} title="Assign auditors & attach checklist" owner="QMS" state={steps[1].state}>
                {submitted ? (
                    <AssignmentsSection audit={audit} nominations={nominations} assignments={assignments}
                        orientations={orientations} auditors={auditors} isQMS={isQMS} run={run} busy={busy} />
                ) : (
                    <p className="muted">Available once the Director / Manager submits the audit to QMS.</p>
                )}
            </Section>

            <Section step={3} title="Auditor orientation" owner="Auditors" state={steps[2].state}>
                {assigned ? (
                    <OrientationSection audit={audit} orientations={orientations} isQMS={isQMS} run={run} busy={busy} onChanged={reload} />
                ) : (
                    <p className="muted">Assigned auditors complete orientation after assignment is completed.</p>
                )}
            </Section>

            <Section step={4} title="Schedule audit" owner="QMS" state={steps[3].state}>
                <ScheduleSection key={schedule?.updated_at || "new"} audit={audit} schedule={schedule}
                    confirmations={confirmations} isQMS={isQMS} run={run} busy={busy} />
            </Section>

            <Section step={5} title="Confirmations" owner="QMS" state={steps[4].state}>
                <ConfirmationsSection audit={audit} schedule={schedule} confirmations={confirmations} isQMS={isQMS} run={run} busy={busy} />
            </Section>

            <Section step={6} title="Conduct audit, evidence & findings" owner="Auditors" state={steps[5].state}>
                {audit.my_assignment && audit.my_assignment.orientation_status === "COMPLETED" && (
                    <AuditorActions audit={audit} onChanged={reload} />
                )}
                <p className="muted">
                    {audit.status === "IN_PROGRESS" && "The audit has started. "}
                    Audit execution, evidence review, NCs, corrective actions and reports are not yet available on the backend.
                </p>
            </Section>

            {dialog?.type === "edit" && (
                <AuditForm
                    audit={audit}
                    lookups={dialog.lookups}
                    onClose={() => setDialog(null)}
                    onSaved={(saved) => {
                        setData((d) => ({ ...d, audit: saved }));
                        notify("Audit updated.");
                        setDialog(null);
                    }}
                />
            )}
            {dialog?.type === "delete" && (
                <ConfirmDialog
                    title="Delete audit"
                    message={`Delete ${audit.audit_code}? Its nominations are deleted with it.`}
                    onConfirm={async () => {
                        await auditsApi.remove(audit.id);
                        notify("Audit deleted.");
                        navigate("/audits");
                    }}
                    onClose={() => setDialog(null)}
                />
            )}
        </>
    );
}
