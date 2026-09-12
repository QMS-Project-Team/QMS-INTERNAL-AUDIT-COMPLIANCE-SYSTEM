import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

class Employees extends Component {

    constructor(props) {
        super(props);

        this.state = {
            employees: [],
            loading: true,
            error: ""
        };
    }

    // Runs after the component is mounted
    async componentDidMount() {
        try {

            const response = await api.get("/employees/");

            console.log("Employees:", response.data);

            this.setState({
                employees: response.data,
                loading: false
            });

        } catch (error) {

            console.log(
                "Failed to fetch employees:",
                error.response?.data
            );

            this.setState({
                error: "Failed to load employees",
                loading: false
            });
        }
    }

    render() {

        const {
            employees,
            loading,
            error
        } = this.state;

        return (
            <>
                <Sidebar />

                <div className="employees-page">

                    <div className="page-header">
                        <div>
                            <h1>Employees</h1>
                            <p>
                                Manage and view all employees
                            </p>
                        </div>

                        <button className="add-employee-btn">
                            + Add Employee
                        </button>
                    </div>

                    <div className="employee-card">

                        <div className="table-header">

                            <h2>Employee List</h2>

                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="search-input"
                            />

                        </div>

                        {loading && (
                            <p>Loading employees...</p>
                        )}

                        {error && (
                            <p className="error-message">
                                {error}
                            </p>
                        )}

                        {!loading && !error && (

                            <table className="employee-table">

                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Employee</th>
                                        <th>Email</th>
                                        <th>Department</th>
                                        <th>Designation</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {employees.map((employee) => (

                                        <tr key={employee.id}>

                                            <td>
                                                {employee.id}
                                            </td>

                                            <td>
                                                <div className="employee-name">

                                                    <div className="employee-avatar">
                                                        {employee.name
                                                            ?.charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    {employee.name}

                                                </div>
                                            </td>

                                            <td>
                                                {employee.email}
                                            </td>

                                            <td>
                                                {employee.department}
                                            </td>

                                            <td>
                                                {employee.designation}
                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        employee.status === "Active"
                                                            ? "status active-status"
                                                            : "status inactive-status"
                                                    }
                                                >
                                                    {employee.status}
                                                </span>

                                            </td>

                                            <td className="action-buttons">
                                                <button
                                                    className="view-btn"
                                                    onClick={() => this.handleView(employee.id)}
                                                >
                                                    View
                                                </button>

                                                <button
                                                    className="edit-btn"
                                                    onClick={() => this.handleEdit(employee.id)}
                                                >
                                                    Edit
                                                </button>
                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        )}

                    </div>

                </div>
            </>
        );
    }
}

export default Employees;