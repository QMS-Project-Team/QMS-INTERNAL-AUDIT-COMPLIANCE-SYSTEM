import React, { Component } from "react";
import  withNavigation  from "../withNavigation";
import Sidebar from "../components/Sidebar";
// import api from "../api";
import "../styles/checklist-management.css";

class ChecklistManagement extends Component {
    constructor(props) {
        super(props);

        this.state = {
           checklists: [
            {
                id: 1,
                name: "Software Development Audit",
                department_name: "IT",
                framework_name: "ISO 9001",
                project: "QMS Internal Audit System",
                version: "1.0",
                status: "Active",
                assignedBy: "Director",
                assignedDate: "2026-09-20",
                totalItems: 10
            },
            {
                id: 2,
                name: "HR Compliance Checklist",
                department_name: "HR",
                framework_name: "ISO 9001",
                project: "Employee Management System",
                version: "1.0",
                status: "Active",
                assignedBy: "Director",
                assignedDate: "2026-09-19",
                totalItems: 8
            },
            {
                id: 3,
                name: "Finance & Accounts Audit",
                department_name: "Finance",
                framework_name: "ISO 9001",
                project: "Financial Reporting System",
                version: "2.0",
                status: "Active",
                assignedBy: "Director",
                assignedDate: "2026-09-18",
                totalItems: 12
            },
            {
                id: 4,
                name: "Quality Management Checklist",
                department_name: "Quality",
                framework_name: "ISO 9001",
                project: "QMS Compliance Project",
                version: "1.1",
                status: "Draft",
                assignedBy: "Director",
                assignedDate: "2026-09-17",
                totalItems: 15
            },
            {
                id: 5,
                name: "Security & Access Control",
                department_name: "IT",
                framework_name: "ISO 8002",
                project: "Cloud Migration Project",
                version: "1.0",
                status: "Active",
                assignedBy: "Director",
                assignedDate: "2026-09-16",
                totalItems: 9
            }
        ],
            loading: false,
            error: ""
        };
    }

    componentDidMount() {
        // this.loadChecklists();
    }

    loadChecklists = async () => {
        try {
            const response = await api.get("/checklists/");

            this.setState({
                checklists: response.data,
                loading: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                loading: false,
                error: "Unable to load checklists."
            });
        }
    };

    handleCreate = () => {
        this.props.navigate("/checklists/add");
    };

    handleView = (id) => {
        this.props.navigate(`/checklists/${id}`);
    };

    handleEdit = (id) => {
        this.props.navigate(`/checklists/${id}/edit`);
    };

    render() {
        const {
            checklists,
            loading,
            error
        } = this.state;

        return (
            <div className="qms-layout">

                <Sidebar />

                <main className="main-content">

                    <div className="page-header checklist-header">

                        <div>
                            <h1>Checklists</h1>

                            <p>
                                Manage department-specific compliance
                                checklists.
                            </p>
                        </div>

                        <button
                            className="create-checklist-btn"
                            onClick={this.handleCreate}
                        >
                             Create Checklist
                        </button>

                    </div>


                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}


                    <div className="checklist-card">

                        {loading ? (
                            <div className="loading">
                                Loading checklists...
                            </div>
                        ) : checklists.length === 0 ? (

                            <div className="empty-state">
                                <h3>No Checklists Found</h3>

                                <p>
                                    Create your first department checklist.
                                </p>

                                <button
                                    className="primary-btn"
                                    onClick={this.handleCreate}
                                >
                                    + Create Checklist
                                </button>
                            </div>

                        ) : (

                            <div className="table-wrapper">

                                <table className="checklist-table">

                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Framework</th>
                                            <th>Department</th>
                                            <th>Version</th>
                                            <th>Status</th>
                                            <th>Items</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {checklists.map((checklist) => (

                                            <tr key={checklist.id}>

                                                <td>
                                                    <strong>
                                                        {checklist.name}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {checklist.framework_name}
                                                </td>

                                                <td>
                                                    {checklist.department_name}
                                                </td>

                                                <td>
                                                    {checklist.version}
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            checklist.status ===
                                                            "Active"
                                                                ? "status-active"
                                                                : "status-inactive"
                                                        }
                                                    >
                                                        {checklist.status}
                                                    </span>
                                                </td>

                                                <td>
                                                    {checklist.item_count || 0}
                                                </td>

                                                <td>

                                                    <button
                                                        className="view-checklist-btn"
                                                        onClick={() =>
                                                            this.handleView(
                                                                checklist.id
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        className="edit-checklist-btn"
                                                        onClick={() =>
                                                            this.handleEdit(
                                                                checklist.id
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </main>
            </div>
        );
    }
}

export default withNavigation(ChecklistManagement);