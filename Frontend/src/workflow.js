// Where an audit is in the process, who acts next, and by when.
// Deadlines follow the audit-flow document: nominations by T-20 (escalation),
// assignment/orientation/scheduling + combined confirmation by T-15,
// individual confirmation by T-7.

export const STAGES = [
    { key: "draft", label: "With Director", owner: "Director / Manager" },
    { key: "assign", label: "Awaiting assignment", owner: "QMS" },
    { key: "orientation", label: "Orientation pending", owner: "Auditors" },
    { key: "schedule", label: "To schedule", owner: "QMS" },
    { key: "confirm", label: "Awaiting confirmation", owner: "QMS" },
    { key: "ready", label: "Ready to start", owner: "Auditors" },
    { key: "in_progress", label: "In progress", owner: "Auditors" },
    { key: "closing", label: "Closure", owner: "Auditors" },
];

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

const minusDays = (dateString, days) => {
    const d = parseDate(dateString);
    d.setDate(d.getDate() - days);
    return d;
};

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
    const start = audit.planned_start_date;

    if (audit.status === "DRAFT") {
        const n = p.nomination_count || 0;
        return {
            key: "draft",
            next: n < 2 ? `Nominate auditors (${n} of 2+)` : "Submit to QMS",
            due: minusDays(start, 20),
            dueLabel: "T-20",
        };
    }

    if (audit.status === "PENDING_ASSIGNMENT") {
        const hasPrimary = auditors.some((a) => a.assignment_type === "PRIMARY");
        const hasSecondary = auditors.some((a) => a.assignment_type === "SECONDARY");
        const missing = [!hasPrimary && "primary", !hasSecondary && "secondary"].filter(Boolean);
        return {
            key: "assign",
            next: missing.length ? `Assign ${missing.join(" & ")} auditor` : "Complete assignment",
            due: minusDays(start, 15),
            dueLabel: "T-15",
        };
    }

    if (audit.status === "ASSIGNED") {
        const pending = auditors.filter((a) => a.orientation_status !== "COMPLETED");
        if (pending.length) {
            return {
                key: "orientation",
                next: `Waiting on ${pending.map((a) => a.auditor_name).join(", ")}`,
                due: minusDays(start, 15),
                dueLabel: "T-15",
            };
        }
        if (!p.schedule) {
            return { key: "schedule", next: "Schedule the audit", due: minusDays(start, 15), dueLabel: "T-15" };
        }
        if (p.schedule.status !== "CONFIRMED") {
            const combined = p.confirmations?.includes("COMBINED");
            return combined
                ? { key: "confirm", next: "Record individual confirmation", due: minusDays(start, 7), dueLabel: "T-7" }
                : { key: "confirm", next: "Record combined confirmation", due: minusDays(start, 15), dueLabel: "T-15" };
        }
        return { key: "ready", next: "Auditors can start the audit", due: parseDate(start), dueLabel: "Audit day" };
    }

    if (audit.status === "IN_PROGRESS") {
        return { key: "in_progress", next: "Audit being conducted", due: null, dueLabel: "" };
    }

    return { key: "closing", next: audit.status === "CLOSED" ? "Closed" : "Awaiting closure", due: null, dueLabel: "" };
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
