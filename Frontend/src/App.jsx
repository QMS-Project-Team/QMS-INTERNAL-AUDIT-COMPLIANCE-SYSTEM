import React, { Component } from "react";
import Sidebar from "./components/Sidebar";
import Employees from "./pages/Employees";
import Dashboard from "./pages/Dashboard";

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
    showDashboard = () => {
        this.setState({
            currentPage: "dashboard"
        });
    };
    renderPage() {
        switch (this.state.currentPage) {

            case "employees":
                return <Employees />;
            case "dashboard":
                return <Dashboard />;

            default:
                return (
                    <>
                    {/* <div>
                        <h1>Dashboard</h1>
                        <p>Welcome to QMS Internal Audit System</p>
                    </div> */}
                    <Dashboard />
                    </>
                );
        }
    }

    render() {
        return (
            <div className="app">
                
                <Sidebar onEmployeesClick={this.showEmployees} onDashboardClick={this.showDashboard}
                />

                <main className="main-content">
                    {this.renderPage()}
                </main>

            </div>
        );
    }
}

export default App;