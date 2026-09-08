import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
class Dashboard extends Component {

    constructor(props) {
        super(props)

        const user = JSON.parse(
            localStorage.getItem('user')
        )

        this.state = {
            user: user
        }
    }
    render() {
        const { user } = this.state
    return (
        <>
        < Sidebar />
        <div className="dashboard-layout">

            {/* <Sidebar onEmployeesClick={this.showEmployees} /> */}

            <main className="main-content">

                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Welcome back, {user?.username} 👋</p>
                    </div>

                    <div className="user-profile">
                        <span>
                            <p>
                            Role: {user?.role}
                            </p>
                        </span>
                    </div>
                </div>

 

            </main>

        </div>
        </>
    );
    }
}

export default Dashboard;