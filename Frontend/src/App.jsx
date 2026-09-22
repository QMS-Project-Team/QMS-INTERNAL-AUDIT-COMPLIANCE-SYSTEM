import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import AddProject from "./pages/AddProject";
import ProtectedRoute from "./ProtectedRoute";
import ChecklistManagement from "./pages/ChecklistManagement";
import AddChecklist from "./pages/AddChecklist";
import ChecklistItems from "./pages/ChecklistItems";
import AddAudit from "./pages/AddAudit";

function App() {

    return (
        <BrowserRouter>

            <Routes>

                {/* Login */}
                <Route
                    path="/"
                    element={<Login />}
                /> 
                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                {/* Employee */}
                <Route
                    path="/employees"
                    element={<ProtectedRoute allowedRoles={["Director"]}>
                            <Employees />
                        </ProtectedRoute>}
                />
                {/* Employee */}
                <Route
                    path="/projects"
                    element={<ProtectedRoute allowedRoles={["Director"]}>
                            <Projects />
                        </ProtectedRoute>}
                />

                <Route
                    path="/projects/add"
                    element={<ProtectedRoute allowedRoles={["Director"]}>
                            <AddProject />
                        </ProtectedRoute>}
                /> 

                <Route
                    path="/checklists"
                    element={
                        <ProtectedRoute allowedRoles={["Director"]}>
                            <ChecklistManagement />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/checklists/add"
                    element={
                        <ProtectedRoute allowedRoles={["Director"]}>
                            <AddChecklist />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/checklists/:id/items"
                    element={
                        <ProtectedRoute allowedRoles={["Director"]}>
                            <ChecklistItems />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/audits/add"
                    element={
                        <ProtectedRoute allowedRoles={["Director"]}>
                            <AddAudit />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;