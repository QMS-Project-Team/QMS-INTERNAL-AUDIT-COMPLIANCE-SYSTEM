import client from "./client";

// Every backend call lives here, mirroring QMS_Backend_API_Reference.
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
    users: (params) => data(client.get("/auth/users/", { params })),
};

export const projectsApi = crud("/projects");
export const frameworksApi = crud("/frameworks");
export const checklistsApi = crud("/checklists");
export const departmentsApi = crud("/auth/departments");
export const checklistItemsApi = (checklistId) => crud(`/checklists/${checklistId}/items`);

export const auditsApi = {
    ...crud("/audits"),
    completeAssignment: (id) => data(client.post(`/audits/${id}/complete-assignment/`, {})),
    completeOrientation: (id) => data(client.post(`/audits/${id}/complete-orientation/`, {})),
    // Auditor actions (already implemented on the backend).
    start: (id) => data(client.post(`/audits/${id}/start/`, {})),
    checklist: (id) => data(client.get(`/audits/${id}/checklist/`)),
};

export const nominationsApi = (auditId) => crud(`/audits/${auditId}/nominations`);
export const assignmentsApi = (auditId) => crud(`/audits/${auditId}/assignments`);

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

export const orientationsApi = {
    list: () => data(client.get("/orientations/")),
    get: (id) => data(client.get(`/orientations/${id}/`)),
    complete: (id) => data(client.post(`/orientations/${id}/complete/`, {})),
};

// Dropdown data for the audit form.
export async function loadAuditLookups() {
    const [projects, frameworks, checklists] = await Promise.all([
        projectsApi.list(),
        frameworksApi.list(),
        checklistsApi.list(),
    ]);
    return { projects, frameworks, checklists };
}
