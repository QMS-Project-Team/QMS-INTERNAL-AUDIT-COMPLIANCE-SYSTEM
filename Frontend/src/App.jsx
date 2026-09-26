import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import { ROLES } from "./constants";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/projects/ProjectsPage";
import AuditsPage from "./pages/audits/AuditsPage";
import AuditDetailPage from "./pages/audits/AuditDetailPage";
import ChecklistsPage from "./pages/checklists/ChecklistsPage";
import ChecklistDetailPage from "./pages/checklists/ChecklistDetailPage";
import FrameworksPage from "./pages/FrameworksPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import OrientationsPage from "./pages/OrientationsPage";

const { DIRECTOR, MANAGER, QMS, AUDITOR } = ROLES;
const STAFF = [DIRECTOR, MANAGER, QMS];

const guarded = (element, roles) => <RequireAuth roles={roles}>{element}</RequireAuth>;

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route element={guarded(<Layout />)}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/projects" element={guarded(<ProjectsPage />, STAFF)} />
                            <Route path="/audits" element={guarded(<AuditsPage />, [...STAFF, AUDITOR])} />
                            <Route path="/audits/:id" element={guarded(<AuditDetailPage />, [...STAFF, AUDITOR])} />
                            <Route path="/checklists" element={guarded(<ChecklistsPage />, STAFF)} />
                            <Route path="/checklists/:id" element={guarded(<ChecklistDetailPage />, STAFF)} />
                            <Route path="/frameworks" element={guarded(<FrameworksPage />, STAFF)} />
                            <Route path="/departments" element={guarded(<DepartmentsPage />, STAFF)} />
                            <Route path="/orientations" element={guarded(<OrientationsPage />, [QMS, AUDITOR])} />
                        </Route>

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
