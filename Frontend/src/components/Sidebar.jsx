import React, { Component } from "react";
import { Link } from "react-router-dom";
import "../styles/sidebar.css";

class Sidebar extends Component {

    render() {

        const role = JSON.parse(localStorage.getItem("user")).role ;  
        return (
            <div className="sidebar">

                <h2>QMS</h2>

                <Link to="/dashboard">
                    Dashboard
                </Link>

                {/* Director only */}
                {(role === "Director") && (
                    <>
                        <Link to="/employees">
                            Employees
                        </Link>
                        <Link to="/projects">
                            Projects
                        </Link>

                        
                    </>
                )}

                {/* Auditor only */}
                { (role === "Auditor") && (
                    <>
                        <Link to="/audits">
                            Audits
                        </Link>

                        <Link to="/reports">
                            Reports
                        </Link>
                    </>
                )}

                {/* QMS only */}
                {role === "QMS" && (
                    <Link to="/team">
                        My Team
                    </Link>
                )} 

                {/* Teams only */}
                { (role === "Auditor") && (
                    <>
                         
                        <Link to="/reports">
                            Reports
                        </Link>
                    </>
                )}

            </div>
        );
    }
}

export default Sidebar;