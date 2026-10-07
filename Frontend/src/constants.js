// Mirrors the TextChoices on the Django models.

export const ROLES = {
    DIRECTOR: "DIRECTOR",
    QMS: "QMS",
    EMPLOYEE: "EMPLOYEE",
};

export const ROLE_LABELS = {
    DIRECTOR: "Director",
    QMS: "QMS",
    EMPLOYEE: "Employee",
};

export const PROJECT_STATUSES = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
];

export const POC_TYPES = [
    { value: "NONE", label: "Member" },
    { value: "PRIMARY", label: "Primary POC" },
    { value: "SECONDARY", label: "Secondary POC" },
    { value: "ADDITIONAL", label: "Additional POC" },
];

export const pocLabel = (value) => POC_TYPES.find((p) => p.value === value)?.label || value;

export const AUDIT_STATUS_LABELS = {
    DRAFT: "Draft",
    PENDING_ASSIGNMENT: "Pending Assignment",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    PENDING_CLOSURE: "Pending Closure",
    CLOSED: "Closed",
};

export const NC_STATUS_LABELS = {
    OPEN: "Open",
    SUBMITTED: "Submitted",
    REWORK_REQUIRED: "Rework required",
    ACCEPTED: "Accepted",
};

// Departments are database rows referenced by id (GET /api/auth/departments/).
// DepartmentsProvider loads them once per session and fills this cache, so any
// component can turn an id into a name synchronously.
let departmentCache = [];

export const setDepartments = (list) => {
    departmentCache = list;
};

export const getDepartments = () => departmentCache;

export const departmentLabel = (id) =>
    departmentCache.find((d) => d.id === id)?.name ?? (id ? `#${id}` : "—");
