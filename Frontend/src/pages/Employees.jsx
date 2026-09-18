import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import withNavigation from "../withNavigation";
import "../styles/employees.css";

class Employees extends Component {

    constructor(props) {
        super(props);

        this.state = {
            employees: [],
            search: "",
            loading: true,
            error: ""
        };
    }

    async componentDidMount() {
        try {
            const response = await api.get("/employees/");

            console.log("Employees:", response.data);

            this.setState({
                employees: response.data,
                loading: false
            });

        } catch (error) {

            console.error(
                "Failed to fetch employees:",
                error.response?.data || error.message
            );

            this.setState({
                error: "Failed to load employees",
                loading: false
            });
        }
    }

    handleSearch = (e) => {
        this.setState({
            search: e.target.value
        });
    };

    handleAddEmployee = () => {
        this.props.navigate("/employees/add");
    };

    handleView = (employee) => {
        console.log("View employee:", employee);
    };

    handleEdit = (employee) => {
        console.log("Edit employee:", employee);
    };

    render() {

        const {
            employees,
            search,
            loading,
            error
        } = this.state;

        const filteredEmployees = employees.filter((employee) => {

            const searchText = search.toLowerCase();

            return (
                employee.name?.toLowerCase().includes(searchText) ||
                employee.email?.toLowerCase().includes(searchText) ||
                employee.department?.toLowerCase().includes(searchText) ||
                employee.designation?.toLowerCase().includes(searchText)
            );
        });

        return (
            <>
                <Sidebar />

                <div className="employees-page">

                    {/* =========================
                        PAGE HEADER
                    ========================== */}

                    <div className="page-header">

                        <div>
                            <h1>Employees</h1>

                            <p>
                                Manage employees and their information
                            </p>
                        </div>

                        <button
                            className="add-employee-btn"
                            onClick={this.handleAddEmployee}
                        >
                            + Add Employee
                        </button>

                    </div>


                    {/* =========================
                        EMPLOYEE CARD
                    ========================== */}

                    <div className="employee-card">

                        <div className="table-header">

                            <h2>Employee List</h2>

                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="search-input"
                                value={search}
                                onChange={this.handleSearch}
                            />

                        </div>


                        {/* LOADING */}

                        {loading && (
                            <p className="loading-message">
                                Loading employees...
                            </p>
                        )}


                        {/* ERROR */}

                        {error && (
                            <p className="error-message">
                                {error}
                            </p>
                        )}


                        {/* TABLE */}

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

                                    {filteredEmployees.length > 0 ? (

                                        filteredEmployees.map((employee) => (

                                            <tr key={employee.id}>

                                                {/* ID */}

                                                <td>
                                                    {employee.id}
                                                </td>


                                                {/* EMPLOYEE */}

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


                                                {/* EMAIL */}

                                                <td>
                                                    {employee.email}
                                                </td>


                                                {/* DEPARTMENT */}

                                                <td>
                                                    {employee.department}
                                                </td>


                                                {/* DESIGNATION */}

                                                <td>
                                                    {employee.designation ||
                                                        employee.role}
                                                </td>


                                                {/* STATUS */}

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


                                                {/* ACTION */}

                                                <td>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() =>
                                                            this.handleView(employee)
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() =>
                                                            this.handleEdit(employee)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </td>

                                            </tr>

                                        ))

                                    ) : (

                                        <tr>

                                            <td
                                                colSpan="7"
                                                className="no-data"
                                            >
                                                No employees found
                                            </td>

                                        </tr>

                                    )}

                                </tbody>

                            </table>

                        )}

                    </div>

                </div>
            </>
        );
    }
}

export default withNavigation(Employees);