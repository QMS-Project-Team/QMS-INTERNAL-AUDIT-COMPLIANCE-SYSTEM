import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";

function App() {

    return (
        <BrowserRouter>

            <Routes>

                {/* Login */}
                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/login"
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
                    element={<Employees />}
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