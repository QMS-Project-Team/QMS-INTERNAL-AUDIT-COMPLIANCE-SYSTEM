import React, { Component } from "react";

class Dashboard extends Component {

    render() {
    return (
        <div className="dashboard-layout">

            {/* <Sidebar onEmployeesClick={this.showEmployees} /> */}

            <main className="main-content">

                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Welcome back, Harjot 👋</p>
                    </div>

                    <div className="user-profile">
                        <span>Harjot</span>
                    </div>
                </div>

                <div className="stats-container">

                    <div className="stat-card">
                        <h3>Total Audits</h3>
                        <p>24</p>
                    </div>

                    <div className="stat-card">
                        <h3>Completed</h3>
                        <p>18</p>
                    </div>

                    <div className="stat-card">
                        <h3>Pending</h3>
                        <p>4</p>
                    </div>

                    <div className="stat-card">
                        <h3>Non-Conformities</h3>
                        <p>2</p>
                    </div>

                </div>

                <div className="recent-audits">

                    <h2>Recent Audits</h2>

                    <table>
                        <thead>
                            <tr>
                                <th>Audit</th>
                                <th>Department</th>
                                <th>Auditor</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>ISO 9001 Audit</td>
                                <td>Production</td>
                                <td>John</td>
                                <td>Completed</td>
                            </tr>

                            <tr>
                                <td>Internal Process Audit</td>
                                <td>HR</td>
                                <td>Sarah</td>
                                <td>Pending</td>
                            </tr>

                            <tr>
                                <td>Quality Compliance</td>
                                <td>Quality</td>
                                <td>Mike</td>
                                <td>Completed</td>
                            </tr>
                        </tbody>
                    </table>

                </div>

            </main>

        </div>
    );
    }
}

export default Dashboard;