import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Loading } from "../components/ui";

/**
 * Role checks here only decide which screens are shown.
 * The backend remains the authority on what each user may do.
 */
export default function RequireAuth({ roles, children }) {
    const { user, restoring } = useAuth();
    const location = useLocation();

    if (restoring) return <Loading label="Restoring session…" />;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

    return children;
}
