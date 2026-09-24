import { ROLES } from "./constants";

// UI-only gating; the backend enforces the real permissions.

// Checklist writes: Director or QMS.
export const canEditChecklists = (role) => role === ROLES.DIRECTOR || role === ROLES.QMS;

// Audits can be edited or deleted until QMS completes auditor assignment.
export const isEditableAudit = (audit) => ["DRAFT", "PENDING_ASSIGNMENT"].includes(audit.status);
