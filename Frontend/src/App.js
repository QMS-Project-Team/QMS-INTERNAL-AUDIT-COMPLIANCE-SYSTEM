import React, { Component } from "react";

import Sidebar from "./components/Sidebar";
import Employees from "./pages/Employees";

class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            currentPage: "dashboard"
        };
    }

    showEmployees = () => {
        this.setState({
            currentPage: "employees"
        });
    };

    renderPage() {

        if (this.state.currentPage === "employees") {
            return <Employees />;
        }

        return (
            <div className="dashboard-page">
                <h1>Dashboard</h1>
                <p>Welcome to QMS Internal Audit System</p>
            </div>
        );
    }

    render() {
        return (
            <div className="app">

                <Sidebar onEmployeesClick={this.showEmployees}
                />

                <main className="main-content">
                    {this.renderPage()}
                </main>

            </div>
        );
    }
}

export default App;