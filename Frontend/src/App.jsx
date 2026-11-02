import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import DepartmentsProvider from "./auth/DepartmentsProvider";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import { ThemeProvider } from "./theme/ThemeContext";

import { ROLES } from "./constants";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import AuditorPoolPage from "./pages/AuditorPoolPage";
import AuditsPage from "./pages/audits/AuditsPage";
import AuditDetailPage from "./pages/audits/AuditDetailPage";
import ChecklistsPage from "./pages/checklists/ChecklistsPage";
import ChecklistDetailPage from "./pages/checklists/ChecklistDetailPage";
import FrameworksPage from "./pages/FrameworksPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import OrientationsPage from "./pages/OrientationsPage";
import AnnualAuditPlanPage from "./pages/AnnualAuditPlanPage";

const { DIRECTOR, QMS, EMPLOYEE } = ROLES;

const STAFF = [DIRECTOR, QMS];
const EVERYONE = [DIRECTOR, QMS, EMPLOYEE];

const guarded = (element, roles) => (
    <RequireAuth roles={roles}>{element}</RequireAuth>
);

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <Routes>
                            <Route path="/login" element={<Login />} />

                            <Route
                                element={guarded(
                                    <DepartmentsProvider>
                                        <Layout />
                                    </DepartmentsProvider>
                                )}
                            >
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/projects" element={guarded(<ProjectsPage />, STAFF)} />
                                <Route path="/projects/:id" element={guarded(<ProjectDetailPage />, STAFF)} />
                                <Route path="/auditor-pool" element={guarded(<AuditorPoolPage />, [QMS])} />
                                <Route path="/audits" element={guarded(<AuditsPage />, EVERYONE)} />
                                <Route path="/audits/:id" element={guarded(<AuditDetailPage />, EVERYONE)} />
                                <Route path="/checklists" element={guarded(<ChecklistsPage />, STAFF)} />
                                <Route path="/checklists/:id" element={guarded(<ChecklistDetailPage />, STAFF)} />
                                <Route path="/frameworks" element={guarded(<FrameworksPage />, STAFF)} />
                                <Route path="/departments" element={guarded(<DepartmentsPage />, STAFF)} />
                                <Route path="/orientations" element={guarded(<OrientationsPage />, [QMS, EMPLOYEE])} />
                                <Route path="/qms/annual-audit-plan" element={<AnnualAuditPlanPage />} />
                            </Route>

                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </ToastProvider>
                </ThemeProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
