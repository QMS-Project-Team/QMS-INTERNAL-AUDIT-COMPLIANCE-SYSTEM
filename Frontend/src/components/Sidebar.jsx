import React, { Component } from "react";
import { Link } from "react-router-dom";

class Sidebar extends Component {

    render() {

        const role = JSON.parse(localStorage.getItem("user")).role ;  
        return (
            <div className="sidebar">

                <h2>QMS</h2>

                <Link to="/dashboard">
                    Dashboard
                </Link>

                {/* Admin only */}
                {(role === "Admin" || role === "admin") && (
                    <>
                        <Link to="/employees">
                            Employees
                        </Link>

                        
                    </>
                )}

                {/* Admin + Auditor */}
                {(role === "Admin" || role === "Auditor") && (
                    <>
                        <Link to="/audits">
                            Audits
                        </Link>

                        <Link to="/reports">
                            Reports
                        </Link>
                    </>
                )}

                {/* Employee */}
                {role === "Employee" && (
                    <Link to="/my-audits">
                        My Audits
                    </Link>
                )}
                {role === "Software Engineer" && (
                    <Link to="/projects">
                        My Project
                    </Link>
                )}
                {role === "Manager" && (
                    <Link to="/team">
                        My Team
                    </Link>
                )}
                {role === "Developer" && (
                    <Link to="/developer">
                        My AI Project
                    </Link>
                )}

            </div>
        );
    }
}

export default Sidebar;