import { ROLES } from "./constants";

// UI-only gating; the backend enforces the real permissions.

// Projects and their members/POCs: Director.
export const canManageProjects = (role) => role === ROLES.DIRECTOR;

// Master checklists and their items: Director or QMS.
export const canEditChecklists = (role) => role === ROLES.DIRECTOR || role === ROLES.QMS;

// Frameworks, audits, assignments, schedules, confirmations, NC verification, closure: QMS.
export const isQms = (role) => role === ROLES.QMS;
