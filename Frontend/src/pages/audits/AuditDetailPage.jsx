import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    assignmentsApi, auditsApi, confirmationsApi, ncsApi, orientationsApi, pocsApi, scheduleApi,
} from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import useLoad from "../../hooks/useLoad";
import { useToast } from "../../components/Toast";
import ChecklistExecution from "../../components/ChecklistExecution";
import NcCard from "../../components/NcCard";
import { Badge, EmptyState, ErrorBox, Field, Loading, PageHeader } from "../../components/ui";
import { formatDate, formatDateTime } from "../../utils/format";
import { AUDIT_STATUS_LABELS, ROLES, departmentLabel, pocLabel } from "../../constants";
import { auditStage, daysUntil, relativeDays, stageMeta, startBlocker } from "../../workflow";

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => new Date(value).toISOString();

/** Runs an async action with a busy flag, reports the outcome as a toast and reloads. */
function useAction(reload) {
    const notify = useToast();
    const [busy, setBusy] = useState("");
    const run = async (key, fn, success) => {
        setBusy(key);
        try {
            const result = await fn();
            if (success) notify(typeof success === "function" ? success(result) : success);
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

function Section({ id, step, title, owner, state, children, aside }) {
    return (
        <section id={id} className={`card step-card step-${state}`}>
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

function AssignmentSection({ audit, eligible, isQMS, run, busy }) {
    const auditors = audit.progress?.auditors || [];
    const taken = new Set(auditors.map((a) => a.assignment_type));
    const missingTypes = ["PRIMARY", "SECONDARY"].filter((t) => !taken.has(t));
    const [type, setType] = useState(missingTypes[0] || "PRIMARY");
    const [employee, setEmployee] = useState("");
    const canAssign = isQMS && audit.status === "PENDING_ASSIGNMENT";

    const assign = async (e) => {
        e.preventDefault();
        const ok = await run(
            "assign",
            () => assignmentsApi(audit.id).create({ auditor: Number(employee), assignment_type: type }),
            "Auditor assigned. An orientation was created for them."
        );
        if (ok) {
            setEmployee("");
            setType(missingTypes.find((t) => t !== type) || type);
        }
    };

    return (
        <>
            {auditors.length === 0 ? (
                <p className="muted">{isQMS ? "Assign a Primary and a Secondary auditor from the eligible POCs below." : "Waiting for QMS to assign auditors."}</p>
            ) : (
                <ul className="plain-list">
                    {auditors.map((a) => (
                        <li key={a.assignment_id}>
                            <strong>{a.auditor_name}</strong>
                            <Badge value={a.assignment_type} label={`${a.assignment_type.toLowerCase()} auditor`} />
                        </li>
                    ))}
                </ul>
            )}

            {canAssign && (
                <>
                    <form className="inline-form" onSubmit={assign}>
                        <select className="input" value={employee} onChange={(e) => setEmployee(e.target.value)} required>
                            <option value="">{eligible.length ? "Select an eligible POC…" : "No eligible POCs available"}</option>
                            {eligible.map((p) => (
                                <option key={p.id} value={p.employee}>
                                    {p.employee_name} · {pocLabel(p.poc_type)} of {p.project_code} ({p.department})
                                </option>
                            ))}
                        </select>
                        <select className="input input-narrow" value={type} onChange={(e) => setType(e.target.value)}>
                            {missingTypes.map((t) => <option key={t} value={t}>{t === "PRIMARY" ? "Primary" : "Secondary"}</option>)}
                        </select>
                        <button className="btn btn-primary" disabled={!employee || busy === "assign"}>
                            {busy === "assign" ? "Assigning…" : "Assign"}
                        </button>
                        <span className="field-hint">
                            Eligible: POCs of other projects who aren't on another active audit. The audit becomes Assigned once both roles are filled.
                        </span>
                    </form>
                </>
            )}
        </>
    );
}

function OrientationSection({ audit, run, busy }) {
    const auditors = audit.progress?.auditors || [];
    const done = auditors.filter((a) => a.orientation_status === "COMPLETED").length;
    const mine = audit.my_assignment;

    if (!auditors.length) return <p className="muted">Each assigned auditor gets an orientation to complete.</p>;

    return (
        <>
            <div className="progress-line">
                <div className="progress"><span style={{ width: `${(done / auditors.length) * 100}%` }} /></div>
                <span>{done} of {auditors.length} auditors completed</span>
            </div>
            <ul className="plain-list">
                {auditors.map((a) => (
                    <li key={a.assignment_id}>
                        <span>{a.auditor_name} <span className="muted">· {a.assignment_type.toLowerCase()}</span></span>
                        <Badge value={a.orientation_status || "PENDING"} />
                    </li>
                ))}
            </ul>
            {mine?.orientation_status === "PENDING" && (
                <button className="btn btn-primary" disabled={busy === "orientation"}
                    onClick={() => run("orientation", () => orientationsApi.complete(mine.orientation_id), "Orientation completed.")}>
                    {busy === "orientation" ? "Saving…" : "Mark my orientation complete"}
                </button>
            )}
        </>
    );
}

function ScheduleSection({ audit, schedule, isQMS, run, busy }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(() => ({
        start: schedule ? toLocalInput(schedule.scheduled_start) : `${audit.planned_start_date}T09:00`,
        end: schedule ? toLocalInput(schedule.scheduled_end) : `${audit.planned_end_date}T17:00`,
    }));
    const canCreate = isQMS && !schedule && audit.status === "ASSIGNED";
    const canEdit = isQMS && schedule && schedule.status !== "CONFIRMED";

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
                    <dt>T-15</dt><dd>{formatDate(schedule.t15_date)} <span className="muted">· combined confirmation</span></dd>
                    <dt>T-7</dt><dd>{formatDate(schedule.t7_date)} <span className="muted">· individual confirmation</span></dd>
                    <dt>Status</dt><dd><Badge value={schedule.status} /></dd>
                    <dt>Scheduled by</dt><dd>{schedule.scheduled_by_name}</dd>
                </dl>
                {canEdit && <button className="btn btn-ghost" onClick={() => setEditing(true)}>Reschedule</button>}
            </div>
        );
    }

    if (!schedule && !canCreate) {
        return (
            <p className="muted">
                {audit.status === "PENDING_ASSIGNMENT"
                    ? "Available once both auditors are assigned."
                    : audit.progress?.schedule
                        ? `Scheduled for ${formatDateTime(audit.progress.schedule.scheduled_start)}.`
                        : "Waiting for QMS to schedule the audit."}
            </p>
        );
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
            <p className="field-hint field-full">
                T-15 and T-7 dates are worked out from the start. The schedule can't be changed once both confirmations are recorded.
            </p>
        </form>
    );
}

const CONFIRMATION_TYPES = [
    { type: "COMBINED", label: "Combined confirmation", hint: "Across all departments, when the schedule is published (T-15).", dueKey: "t15_date" },
    { type: "INDIVIDUAL", label: "Individual confirmation", hint: "To the audited department about a week before (T-7).", dueKey: "t7_date" },
];

function ConfirmationsSection({ audit, schedule, confirmations, isQMS, run, busy }) {
    const recorded = audit.progress?.confirmations || [];
    if (!schedule && !audit.progress?.schedule) return <p className="muted">Available once the audit is scheduled.</p>;

    return (
        <div className="confirm-grid">
            {CONFIRMATION_TYPES.map(({ type, label, hint, dueKey }) => {
                const record = confirmations.find((c) => c.confirmation_type === type);
                const done = record || recorded.includes(type);
                return (
                    <div key={type} className={`confirm-tile ${done ? "is-done" : ""}`}>
                        <strong>{label}</strong>
                        <span className="muted">{hint}</span>
                        {schedule && !done && <span className="muted small">Due {formatDate(schedule[dueKey])}</span>}
                        {record ? (
                            <span className="ok">✓ Recorded by {record.confirmed_by_name} · {formatDateTime(record.confirmed_at)}</span>
                        ) : done ? (
                            <span className="ok">✓ Recorded</span>
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

function ResultCounts({ checklist }) {
    if (!checklist) return null;
    const { item_count: total, compliant, non_compliant: nonCompliant, pending } = checklist;
    const pct = (n) => `${total ? (n / total) * 100 : 0}%`;
    return (
        <div className="result-counts">
            <div className="segbar" aria-hidden="true">
                <span className="seg-ok" style={{ width: pct(compliant) }} />
                <span className="seg-nc" style={{ width: pct(nonCompliant) }} />
            </div>
            <span className="ok">{compliant} compliant</span>
            <span className="danger-text">{nonCompliant} non-compliant</span>
            <span className="muted">{pending} pending</span>
        </div>
    );
}

function ExecutionSection({ audit, ncs, isAuditor, run, busy, reload }) {
    const blocker = startBlocker(audit);

    if (audit.status === "ASSIGNED") {
        return isAuditor ? (
            <div className="auditor-actions">
                <button className="btn btn-success" disabled={Boolean(blocker) || busy === "start"} title={blocker || ""}
                    onClick={() => run("start", () => auditsApi.start(audit.id), `${audit.audit_code} started. Evaluate the checklist below.`)}>
                    {busy === "start" ? "Starting…" : "Start audit"}
                </button>
                {blocker && <span className="field-hint">{blocker}</span>}
            </div>
        ) : (
            <p className="muted">An assigned auditor starts the audit once orientation is done and the schedule is confirmed.</p>
        );
    }

    if (audit.status === "PENDING_ASSIGNMENT") return <p className="muted">Available once auditors are assigned and the schedule is confirmed.</p>;

    return (
        <>
            <ResultCounts checklist={audit.progress?.checklist} />
            {isAuditor && audit.status === "IN_PROGRESS" && (
                <ChecklistExecution audit={audit} ncs={ncs || []} onChanged={reload} />
            )}
        </>
    );
}

function NcSection({ audit, ncs, ncRole, reload }) {
    const counts = audit.progress?.ncs || {};
    if (!counts.total) {
        return <p className="muted">{audit.status === "IN_PROGRESS" ? "No non-conformities so far." : "Non-conformities appear here when an item is marked non-compliant."}</p>;
    }
    if (!ncs) {
        return (
            <p className="muted">
                {counts.total} NC{counts.total === 1 ? "" : "s"}: {counts.accepted} accepted, {counts.awaiting_verification} awaiting verification,{" "}
                {counts.awaiting_action + counts.rework_required} awaiting team action.
            </p>
        );
    }
    return (
        <>
            <p className="field-hint">
                The auditor logs the finding and risk action within 2 days. The audited team then fills the correction, corrective and preventive actions, and QMS verifies. An NC should close within 10 days.
            </p>
            <div className="nc-list">
                {ncs.map((nc) => (
                    <NcCard key={`${nc.id}-${nc.updated_at}`} auditId={audit.id} nc={nc} role={ncRole} onChanged={reload} />
                ))}
            </div>
        </>
    );
}

function CloseSection({ audit, isQMS, run, busy }) {
    const checklist = audit.progress?.checklist || {};
    const ncs = audit.progress?.ncs || {};
    const conditions = [
        { ok: audit.status === "IN_PROGRESS" || audit.status === "CLOSED", label: "Audit is in progress" },
        { ok: checklist.item_count > 0 && checklist.compliant === checklist.item_count, label: `All checklist items compliant (${checklist.compliant || 0}/${checklist.item_count || 0})` },
        { ok: (ncs.total || 0) === (ncs.accepted || 0), label: `All NCs accepted (${ncs.accepted || 0}/${ncs.total || 0})` },
    ];
    const ready = conditions.every((c) => c.ok);

    if (audit.status === "CLOSED") return <p className="ok">✓ Audit closed.</p>;

    return (
        <div className="action-row">
            <div className="checks checks-col">
                {conditions.map((c) => (
                    <span key={c.label} className={c.ok ? "ok" : "todo"}>{c.ok ? "✓" : "○"} {c.label}</span>
                ))}
            </div>
            {isQMS ? (
                <button className="btn btn-success" disabled={!ready || busy === "close"}
                    onClick={() => run("close", () => auditsApi.close(audit.id), `${audit.audit_code} closed.`)}>
                    {busy === "close" ? "Closing…" : "Close audit"}
                </button>
            ) : (
                <span className="muted">QMS closes the audit.</span>
            )}
        </div>
    );
}

export default function AuditDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const isQMS = user.role === ROLES.QMS;

    const { data, loading, error, reload } = useLoad(async () => {
        const audit = await auditsApi.get(id);
        const isAuditor = Boolean(audit.my_assignment);
        const isTeam = user.role === ROLES.EMPLOYEE && !isAuditor;
        const executing = ["IN_PROGRESS", "PENDING_CLOSURE", "CLOSED"].includes(audit.status);
        const [schedule, confirmations, eligible, ncs] = await Promise.all([
            scheduleApi(id).get(),
            confirmationsApi(id).list(),
            isQMS && audit.status === "PENDING_ASSIGNMENT" ? pocsApi.eligibleAuditors(audit.project) : [],
            // QMS, the assigned auditors and the audited team can read NCs.
            executing && (isQMS || isAuditor || isTeam) ? ncsApi(id).list() : null,
        ]);
        return { audit, schedule, confirmations, eligible, ncs };
    }, [id]);

    const [busy, run] = useAction(reload);

    if (loading && !data) return <Loading />;
    if (!data) return <ErrorBox message={error} onRetry={reload} />;

    const { audit, schedule, confirmations, eligible, ncs } = data;
    const p = audit.progress || {};
    const isAuditor = Boolean(audit.my_assignment);
    const ncRole = isQMS ? "qms" : isAuditor ? "auditor" : user.role === ROLES.EMPLOYEE ? "team" : "viewer";
    const stage = auditStage(audit);

    const status = audit.status;
    const assigned = status !== "PENDING_ASSIGNMENT";
    const oriented = assigned && (p.auditors || []).every((a) => a.orientation_status === "COMPLETED");
    const confirmed = p.schedule?.status === "CONFIRMED";
    const started = ["IN_PROGRESS", "PENDING_CLOSURE", "CLOSED"].includes(status);
    const evaluated = started && p.checklist && p.checklist.pending === 0;
    const ncsDone = started && (p.ncs?.total || 0) === (p.ncs?.accepted || 0);
    const closed = status === "CLOSED";
    const state = (done, current) => (done ? "done" : current ? "current" : "upcoming");

    const steps = [
        { label: "Created", state: "done" },
        { label: "Assign", state: state(assigned, !assigned) },
        { label: "Orientation", state: state(oriented, assigned && !oriented) },
        { label: "Schedule", state: state(Boolean(p.schedule), oriented && !p.schedule) },
        { label: "Confirm", state: state(confirmed, Boolean(p.schedule) && !confirmed) },
        { label: "Execute", state: state(evaluated, (confirmed && !started) || (started && !evaluated)) },
        { label: "NCs", state: state(evaluated && ncsDone, started && !ncsDone) },
        { label: "Close", state: state(closed, evaluated && ncsDone && !closed) },
    ];
    const days = daysUntil(audit.planned_start_date);

    return (
        <>
            <Link to="/audits" className="back-link">← {user.role === ROLES.EMPLOYEE ? "My audits" : "All audits"}</Link>
            <PageHeader
                title={audit.audit_code}
                subtitle={`${audit.project_name} · ${departmentLabel(audit.department)} · ${audit.framework_name}`}
                actions={<Badge value={audit.status} label={AUDIT_STATUS_LABELS[audit.status]} />}
            />

            <div className="card summary-card">
                <dl className="summary">
                    <div>
                        <dt>Planned</dt>
                        <dd>
                            {formatDate(audit.planned_start_date)} → {formatDate(audit.planned_end_date)}
                            {days !== null && days >= 0 && <span className="muted"> · {relativeDays(days)}</span>}
                        </dd>
                    </div>
                    <div><dt>Checklist</dt><dd>{p.checklist ? `${p.checklist.name} · ${p.checklist.item_count} items` : "—"}</dd></div>
                    <div><dt>Created by</dt><dd>{audit.created_by_name}</dd></div>
                    <div>
                        <dt>Next step</dt>
                        <dd>{stage.key === "closed" ? "—" : <>{stage.next} <span className="muted">· {stageMeta(stage.key).owner}</span></>}</dd>
                    </div>
                </dl>
                <Stepper steps={steps} />
            </div>

            <ErrorBox message={error} onRetry={reload} />

            <Section step={1} title="Assign auditors" owner="QMS" state={steps[1].state}>
                <AssignmentSection key={p.auditors?.length} audit={audit} eligible={eligible} isQMS={isQMS} run={run} busy={busy} />
            </Section>

            <Section step={2} title="Auditor orientation" owner="Auditors" state={steps[2].state}>
                {assigned ? <OrientationSection audit={audit} run={run} busy={busy} /> : <p className="muted">Assigned auditors complete an orientation (PPT) before auditing.</p>}
            </Section>

            <Section step={3} title="Schedule" owner="QMS" state={steps[3].state}>
                <ScheduleSection key={schedule?.updated_at || "new"} audit={audit} schedule={schedule} isQMS={isQMS} run={run} busy={busy} />
            </Section>

            <Section step={4} title="Confirmations" owner="QMS" state={steps[4].state}>
                <ConfirmationsSection audit={audit} schedule={schedule} confirmations={confirmations} isQMS={isQMS} run={run} busy={busy} />
            </Section>

            <Section id="execute" step={5} title="Conduct audit & evaluate checklist" owner="Auditors" state={steps[5].state}>
                <ExecutionSection audit={audit} ncs={ncs} isAuditor={isAuditor} run={run} busy={busy} reload={reload} />
            </Section>

            <Section id="ncs" step={6} title="Non-conformities" owner="Auditor · Audited team · QMS" state={steps[6].state}>
                <NcSection audit={audit} ncs={ncs} ncRole={ncRole} reload={reload} />
            </Section>

            <Section step={7} title="Close audit" owner="QMS" state={steps[7].state}>
                {started ? <CloseSection audit={audit} isQMS={isQMS} run={run} busy={busy} /> : (
                    <EmptyState title="Not started yet" text="An audit can be closed once every item is compliant and every NC is accepted." />
                )}
            </Section>
        </>
    );
}
