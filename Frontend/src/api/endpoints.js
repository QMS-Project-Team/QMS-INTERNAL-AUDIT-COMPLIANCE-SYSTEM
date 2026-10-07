import client from "./client";

// Every backend call lives here, mirroring the QMS backend API documentation.
const data = (promise) => promise.then((response) => response.data);

function crud(base) {
    return {
        list: (params) => data(client.get(`${base}/`, { params })),
        get: (id) => data(client.get(`${base}/${id}/`)),
        create: (body) => data(client.post(`${base}/`, body)),
        update: (id, body) => data(client.put(`${base}/${id}/`, body)),
        patch: (id, body) => data(client.patch(`${base}/${id}/`, body)),
        remove: (id) => data(client.delete(`${base}/${id}/`)),
    };
}

export const authApi = {
    login: (username, password) =>
        data(client.post("/auth/login/", { username, password })),
    me: () => data(client.get("/auth/me/")),
    users: () => data(client.get("/auth/users/")),
};

export const departmentsApi = {
    list: () => data(client.get("/auth/departments/")),
};

export const projectsApi = crud("/projects");
export const projectMembersApi = (projectId) => crud(`/projects/${projectId}/members`);

export const pocsApi = {
    // QMS: every PRIMARY / SECONDARY / ADDITIONAL POC across projects.
    list: () => data(client.get("/pocs/")),
    // QMS: POCs from other projects who are not on an active audit.
    eligibleAuditors: (projectId) => data(client.get(`/projects/${projectId}/eligible-auditors/`)),
};

export const frameworksApi = crud("/frameworks");
export const checklistsApi = crud("/checklists");
export const checklistItemsApi = (checklistId) => crud(`/checklists/${checklistId}/items`);

export const auditsApi = {
    list: () => data(client.get("/audits/")),
    get: (id) => data(client.get(`/audits/${id}/`)),
    // QMS. Department is derived from the project; the checklist is snapshotted.
    create: (body) => data(client.post("/audits/", body)),
    // Assigned auditor.
    start: (id) => data(client.post(`/audits/${id}/start/`, {})),
    checklist: (id) => data(client.get(`/audits/${id}/checklist/`)),
    // QMS, once every item is COMPLIANT and every NC ACCEPTED.
    close: (id) => data(client.post(`/audits/${id}/close/`, {})),
};

export const assignmentsApi = (auditId) => ({
    list: () => data(client.get(`/audits/${auditId}/assignments/`)),
    create: (body) => data(client.post(`/audits/${auditId}/assignments/`, body)),
});

export const scheduleApi = (auditId) => ({
    // The backend returns a list; an audit has at most one schedule.
    get: () => data(client.get(`/audits/${auditId}/schedule/`)).then((list) => list[0] || null),
    create: (body) => data(client.post(`/audits/${auditId}/schedule/`, body)),
    update: (id, body) => data(client.patch(`/audits/${auditId}/schedule/${id}/`, body)),
});

export const confirmationsApi = (auditId) => ({
    list: () => data(client.get(`/audits/${auditId}/confirmations/`)),
    create: (confirmation_type) =>
        data(client.post(`/audits/${auditId}/confirmations/`, { confirmation_type })),
});

// Assigned auditor, while the audit is IN_PROGRESS: { result, remarks }.
export const auditItemsApi = (auditId) => ({
    update: (itemId, body) => data(client.patch(`/audits/${auditId}/checklist-items/${itemId}/`, body)),
});

// Fields editable depend on role: auditor (finding, risk_action),
// audited team (correction, corrective_action, preventive_action),
// QMS (status: ACCEPTED | REWORK_REQUIRED, verification_remarks).
export const ncsApi = (auditId) => ({
    list: () => data(client.get(`/audits/${auditId}/ncs/`)),
    update: (ncId, body) => data(client.patch(`/audits/${auditId}/ncs/${ncId}/`, body)),
});

export const orientationsApi = {
    list: () => data(client.get("/orientations/")),
    complete: (id) => data(client.post(`/orientations/${id}/complete/`, {})),
};
