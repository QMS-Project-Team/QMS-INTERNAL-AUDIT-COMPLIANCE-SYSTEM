import { useAuth } from "../auth/AuthContext";
import { ROLES } from "../constants";
import DirectorDashboard from "./dashboards/DirectorDashboard";
import QmsDashboard from "./dashboards/QmsDashboard";
import EmployeeDashboard from "./dashboards/EmployeeDashboard";

export default function Dashboard() {
    const { user } = useAuth();

    if (user.role === ROLES.DIRECTOR) return <DirectorDashboard user={user} />;
    if (user.role === ROLES.QMS) return <QmsDashboard user={user} />;
    return <EmployeeDashboard user={user} />;
}
