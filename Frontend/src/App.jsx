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
import ProtectedRoute from "./ProtectedRoute";

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
                {/* Unknown URL
                <Route
                    path="*"
                    element={<Navigate to="/login" />}
                /> */}

            </Routes>

        </BrowserRouter>
    );
}

export default App;