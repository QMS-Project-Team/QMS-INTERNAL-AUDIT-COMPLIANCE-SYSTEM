// Where an audit is in the process, who acts next, and by when.
// Stages follow the backend flow: QMS creates the audit (checklist snapshot) →
// assigns Primary + Secondary → auditors complete orientation → QMS schedules
// (T-15) and records Combined (T-15) + Individual (T-7) confirmations →
// auditor starts and evaluates the checklist → NCs: auditor finding/risk action,
// audited team corrective actions, QMS verification → QMS closes.

export const STAGES = [
    { key: "assign", label: "Awaiting assignment", owner: "QMS" },
    { key: "orientation", label: "Orientation pending", owner: "Auditors" },
    { key: "schedule", label: "To schedule", owner: "QMS" },
    { key: "confirm", label: "Awaiting confirmation", owner: "QMS" },
    { key: "ready", label: "Ready to start", owner: "Auditors" },
    { key: "evaluating", label: "Evaluating checklist", owner: "Auditors" },
    { key: "nc_team", label: "NC action due", owner: "Audited team" },
    { key: "nc_verify", label: "NC verification", owner: "QMS" },
    { key: "nc_recheck", label: "Re-check items", owner: "Auditors" },
    { key: "close", label: "Ready to close", owner: "QMS" },
    { key: "closed", label: "Closed", owner: "" },
];

export const QMS_STAGES = ["assign", "schedule", "confirm", "nc_verify", "close"];

export const stageMeta = (key) => STAGES.find((s) => s.key === key);

const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const parseDate = (value) => new Date(`${value}T00:00:00`);

export function daysUntil(dateValue) {
    if (!dateValue) return null;
    const date = typeof dateValue === "string" && dateValue.length === 10 ? parseDate(dateValue) : new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    return Math.round((date - startOfToday()) / DAY);
}

const minusDays = (dateValue, days) => {
    const d = typeof dateValue === "string" && dateValue.length === 10 ? parseDate(dateValue) : new Date(dateValue);
    d.setDate(d.getDate() - days);
    return d;
};

const plusDays = (dateValue, days) => minusDays(dateValue, -days);

export function relativeDays(days) {
    if (days === null || days === undefined) return "";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Stage + next action for an audit, from its status and `progress` summary. */
export function auditStage(audit) {
    const p = audit.progress || {};
    const auditors = p.auditors || [];
    const items = p.checklist || {};
    const ncs = p.ncs || {};
    // T-15 / T-7 are measured from the confirmed schedule when there is one.
    const anchor = p.schedule?.scheduled_start || audit.planned_start_date;

    if (audit.status === "CLOSED") return { key: "closed", next: "Closed", due: null, dueLabel: "" };

    if (audit.status === "PENDING_ASSIGNMENT") {
        const hasPrimary = auditors.some((a) => a.assignment_type === "PRIMARY");
        const hasSecondary = auditors.some((a) => a.assignment_type === "SECONDARY");
        const missing = [!hasPrimary && "primary", !hasSecondary && "secondary"].filter(Boolean);
        return {
            key: "assign",
            next: `Assign ${missing.join(" & ")} auditor`,
            due: minusDays(anchor, 15),
            dueLabel: "T-15",
        };
    }

    if (audit.status === "ASSIGNED") {
        const pending = auditors.filter((a) => a.orientation_status !== "COMPLETED");
        if (pending.length) {
            return {
                key: "orientation",
                next: `Waiting on ${pending.map((a) => a.auditor_name).join(", ")}`,
                due: minusDays(anchor, 15),
                dueLabel: "T-15",
            };
        }
        if (!p.schedule) {
            return { key: "schedule", next: "Schedule the audit", due: minusDays(anchor, 15), dueLabel: "T-15" };
        }
        if (p.schedule.status !== "CONFIRMED") {
            return p.confirmations?.includes("COMBINED")
                ? { key: "confirm", next: "Record individual confirmation", due: minusDays(anchor, 7), dueLabel: "T-7" }
                : { key: "confirm", next: "Record combined confirmation", due: minusDays(anchor, 15), dueLabel: "T-15" };
        }
        return { key: "ready", next: "Auditor can start the audit", due: new Date(anchor), dueLabel: "Audit day" };
    }

    // IN_PROGRESS (and PENDING_CLOSURE, which the backend does not use yet).
    // Closure SLA from the audit plan: a full audit closes within 15 days of its start.
    const closeBy = plusDays(anchor, 15);

    if (ncs.awaiting_action || ncs.rework_required) {
        const n = ncs.awaiting_action + ncs.rework_required;
        return { key: "nc_team", next: `${n} NC${n === 1 ? "" : "s"} need corrective action`, due: closeBy, dueLabel: "Close by" };
    }
    if (ncs.awaiting_verification) {
        const n = ncs.awaiting_verification;
        return { key: "nc_verify", next: `Verify ${n} NC${n === 1 ? "" : "s"}`, due: closeBy, dueLabel: "Close by" };
    }
    if (items.pending) {
        return { key: "evaluating", next: `${items.pending} of ${items.item_count} items to evaluate`, due: closeBy, dueLabel: "Close by" };
    }
    if (items.non_compliant) {
        return { key: "nc_recheck", next: `Mark ${items.non_compliant} accepted NC item${items.non_compliant === 1 ? "" : "s"} compliant`, due: closeBy, dueLabel: "Close by" };
    }
    return { key: "close", next: "Close the audit", due: closeBy, dueLabel: "Close by" };
}

/** Deadline status for a due date: overdue / soon / later. */
export function dueState(due) {
    if (!due) return null;
    const days = daysUntil(due);
    if (days < 0) return { tone: "overdue", days, text: `Overdue ${-days}d` };
    if (days === 0) return { tone: "soon", days, text: "Due today" };
    if (days <= 3) return { tone: "soon", days, text: `Due in ${days}d` };
    return { tone: "later", days, text: `Due in ${days}d` };
}

/** Why the logged-in auditor can't start this audit yet (null when they can). */
export function startBlocker(audit) {
    const mine = audit.my_assignment;
    const p = audit.progress || {};
    if (!mine) return "You are not assigned to this audit.";
    if (audit.status !== "ASSIGNED") return null;
    if (mine.orientation_status !== "COMPLETED") return "Complete your orientation first.";
    if (!p.schedule) return "Waiting for QMS to schedule the audit.";
    if (p.schedule.status !== "CONFIRMED") return "Waiting for QMS to record both confirmations.";
    if (!p.checklist) return "No checklist is attached to this audit.";
    return null;
}

/** NC status from the audited team's / QMS's point of view. */
export function ncState(nc) {
    if (nc.status === "ACCEPTED") return { key: "accepted", label: "Accepted", tone: "green" };
    if (nc.status === "REWORK_REQUIRED") return { key: "rework", label: "Rework required", tone: "red" };
    if (nc.correction?.trim() || nc.corrective_action?.trim()) {
        return { key: "verify", label: "Awaiting verification", tone: "blue" };
    }
    return { key: "action", label: "Awaiting team action", tone: "amber" };
}

/** POC readiness for audit creation: exactly one Primary and one Secondary POC. */
export function pocReadiness(members) {
    const primary = members.filter((m) => m.poc_type === "PRIMARY").length === 1;
    const secondary = members.filter((m) => m.poc_type === "SECONDARY").length === 1;
    return { primary, secondary, ready: primary && secondary };
}

/** The logged-in employee's relationship to an audit. */
export function myAuditRole(audit) {
    if (audit.my_assignment) return `${audit.my_assignment.assignment_type.toLowerCase()} auditor`;
    return "audited team";
}
