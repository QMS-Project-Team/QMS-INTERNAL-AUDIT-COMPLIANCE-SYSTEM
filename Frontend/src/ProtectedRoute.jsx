 
import React from "react";
import { Navigate } from "react-router-dom";

class ProtectedRoute extends React.Component {
    render() {
        const user = JSON.parse(localStorage.getItem("user"));

        const { allowedRoles, children } = this.props;

        // No logged-in user
        if (!user) {
            return <Navigate to="/" replace />;
        }

        // Check user's role
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/dashboard" replace />;
        } 
        // children is the url where u want to navigate . if every thing is right then go to the page.
        return children;
    }
}

export default ProtectedRoute;
 
 