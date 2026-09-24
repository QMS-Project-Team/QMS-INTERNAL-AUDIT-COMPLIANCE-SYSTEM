import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import withNavigation from "../withNavigation";
import "../styles/projects.css";

class Projects extends Component {

    constructor(props) {
        super(props);

        this.state = {
            projects: [],
            loading: true,
            error: ""
        };
    }

    // Runs after the component is mounted
    async componentDidMount() {
        try {

            const response = await api.get("/projects/");

            console.log("Projects:", response.data);

            this.setState({
                projects: response.data,
                loading: false
            });

        } catch (error) {

            console.log(
                "Failed to fetch projects:",
                error.response?.data
            );

            this.setState({
                error: "Failed to load projects",
                loading: false
            });
        }
    }

    render() {

        const {
            projects,
            loading,
            error
        } = this.state;

        return (
            <>
                <Sidebar />


                <div className="projects-page">

                    <div className="page-header">

                        <div>
                            <h1>Projects</h1>

                            <p>
                                Manage and view all projects
                            </p>
                        </div>

                        <button
                            className="add-project-btn"
                            onClick={() => this.props.navigate("/projects/add")}
                        >
                            + Add Project
                        </button>

                    </div>


                    <div className="project-card">

                        <div className="table-header">

                            <h2>Project List</h2>

                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="search-input"
                            />

                        </div>


                        {loading && (
                            <p>Loading projects...</p>
                        )}


                        {error && (
                            <p className="error-message">
                                {error}
                            </p>
                        )}


                        {!loading && !error && (

                            <table className="project-table">

                                <thead>

                                    <tr>
                                        <th>ID</th>
                                        <th>Project</th>
                                        <th>Description</th>
                                        <th>Department</th>
                                        <th>Manager</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>

                                </thead>


                                <tbody>

                                    {projects.map((project) => (

                                        <tr key={project.id}>

                                            {/* ID */}
                                            <td>
                                                {project.id}
                                            </td>


                                            {/* Project Name */}
                                            <td>

                                                <div className="project-name">

                                                    <div className="project-avatar">

                                                        {project.name
                                                            ?.charAt(0)
                                                            .toUpperCase()}

                                                    </div>

                                                    {project.name}

                                                </div>

                                            </td>


                                            {/* Description */}
                                            <td>
                                                {project.description}
                                            </td>


                                            {/* Department */}
                                            <td>
                                                {project.department}
                                            </td>


                                            {/* Manager */}
                                            <td>
                                                {project.project_owner_name}
                                            </td>


                                            {/* Status */}
                                            <td>

                                                <span
                                                    className={
                                                        (project.status === "Active" || project.status === "ACTIVE")
                                                            ? "status active-status"
                                                            : "status inactive-status"
                                                    }
                                                >
                                                    {project.status}
                                                </span>

                                            </td>


                                            {/* Actions */}
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

                        )}

                    </div>

                </div>


            </>
        );
    }
}

export default withNavigation(Projects);