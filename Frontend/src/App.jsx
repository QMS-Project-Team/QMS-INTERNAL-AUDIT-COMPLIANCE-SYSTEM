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

            </Routes>

        </BrowserRouter>
    );
}

export default App;