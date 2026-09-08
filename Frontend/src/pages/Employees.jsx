import React, { Component } from "react";
import Sidebar from "../components/Sidebar";

class Employees extends Component {
    constructor(props) {
        super(props);

        this.state = {
            employees: [
                {
                    id: 1,
                    name: "Harjot Kaur",
                    email: "harjot@example.com",
                    department: "IT",
                    designation: "Software Developer",
                    status: "Active"
                },
                {
                    id: 2,
                    name: "Aman Sharma",
                    email: "aman@example.com",
                    department: "HR",
                    designation: "HR Executive",
                    status: "Active"
                },
                {
                    id: 3,
                    name: "Simran Kaur",
                    email: "simran@example.com",
                    department: "Finance",
                    designation: "Accountant",
                    status: "Inactive"
                }
            ]
        };
    }

    render() {
        return (
            <>
            <Sidebar />
            <div className="employees-page">

                <div className="page-header">
                    <div>
                        <h1>Employees</h1>
                        <p>Manage and view all employees</p>
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
                            {this.state.employees.map((employee) => (
                                <tr key={employee.id}>

                                    <td>{employee.id}</td>

                                    <td>
                                        <div className="employee-name">
                                            <div className="employee-avatar">
                                                {employee.name.charAt(0)}
                                            </div>

                                            {employee.name}
                                        </div>
                                    </td>

                                    <td>{employee.email}</td>

                                    <td>{employee.department}</td>

                                    <td>{employee.designation}</td>

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

                                    <td>
                                        <button className="action-btn">
                                            View
                                        </button>

                                        <button className="action-btn">
                                            Edit
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>

                    </table>

                </div>

            </div>
            </>

        );
    }
}

export default Employees;