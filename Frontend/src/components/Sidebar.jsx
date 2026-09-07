    import React, { Component } from "react";

    class Sidebar extends Component {
        render() { 
            return  (
                <aside className="sidebar">

                    <div className="logo">
                        <h2>QMS</h2>
                        <p>Internal Audit</p>
                    </div>

                    <nav className="sidebar-menu">

                        <a href="#" onClick={(e) => {
                                e.preventDefault();
                                this.props.onDashboardClick();
                            }}>
                            🏠 Dashboard
                        </a>

                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                this.props.onEmployeesClick();
                            }}
                        >
                            📋 Employees
                        </a>

                        <a href="#">
                            📋 Audits
                        </a>

                        <a href="#">
                            📊 Reports
                        </a>

                        <a href="#">
                            ⚠️ Findings
                        </a>

                        <a href="#">
                            👥 Auditors
                        </a>

                        <a href="#">
                            ⚙️ Settings
                        </a>

                    </nav>

                    <div className="sidebar-bottom">
                        <button className="logout-btn">
                            🚪 Logout
                        </button>
                    </div>

                </aside>
            );
        }
    }

    export default Sidebar;