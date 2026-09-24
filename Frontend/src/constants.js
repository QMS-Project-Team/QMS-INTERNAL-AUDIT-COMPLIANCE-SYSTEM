// Mirrors the TextChoices on the Django models.

export const ROLES = {
    DIRECTOR: "DIRECTOR",
    MANAGER: "MANAGER",
    QMS: "QMS",
    AUDITOR: "AUDITOR",
    TEAM_MEMBER: "TEAM_MEMBER",
};

export const ROLE_LABELS = {
    DIRECTOR: "Director",
    MANAGER: "Manager",
    QMS: "QMS",
    AUDITOR: "Auditor",
    TEAM_MEMBER: "Team Member",
};

// Audit/project/checklist department is a fixed choice field (User.Department).
export const DEPARTMENTS = [
    { value: "QA", label: "QA" },
    { value: "DEV", label: "Development" },
    { value: "HR", label: "HR" },
    { value: "ADMIN", label: "Administration" },
];

export const departmentLabel = (value) =>
    DEPARTMENTS.find((d) => d.value === value)?.label || value || "—";

export const PROJECT_STATUSES = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
];

export const AUDIT_STATUS_LABELS = {
    DRAFT: "Draft",
    PENDING_ASSIGNMENT: "Pending Assignment",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    PENDING_CLOSURE: "Pending Closure",
    CLOSED: "Closed",
};

export const isManagement = (role) => role === ROLES.DIRECTOR || role === ROLES.MANAGER;
