import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
import withNavigation from "../withNavigation";
import api from "../api";
import "../styles/add-project.css";

class AddProject extends Component {
    constructor(props) {
        super(props);

        this.state = {
            name: "",
            description: "",
            department: "",
            status: "Active",
            poc: "",
            framework: "",

            departments: [],
            frameworks: [],

            error: "",
            success: "",
            loading: false,
            loadingDepartments: true,
            loadingFrameworks: true,
        };
    }

    // =========================================
    // LOAD DATA WHEN PAGE OPENS
    // =========================================

    componentDidMount() {
        this.loadDepartments();
        this.loadFrameworks();
    }

    // =========================================
    // GET DEPARTMENTS
    // =========================================

    loadDepartments = async () => {
        try {
            const response = await api.get("/departments/");

            console.log(
                "Departments API response:",
                response.data
            );

            this.setState({
                departments: response.data,
                loadingDepartments: false,
            });
        } catch (error) {
            console.error(
                "Failed to load departments:",
                error.response?.data || error.message
            );

            this.setState({
                loadingDepartments: false,
                error: "Failed to load departments.",
            });
        }
    };

    // =========================================
    // GET FRAMEWORKS
    // =========================================

    loadFrameworks = async () => {
        try {
            const response = await api.get("/frameworks/");

            console.log(
                "Frameworks API response:",
                response.data
            );

            this.setState({
                frameworks: response.data,
                loadingFrameworks: false,
            });
        } catch (error) {
            console.error(
                "Failed to load frameworks:",
                error.response?.data || error.message
            );

            this.setState({
                loadingFrameworks: false,
                error: "Failed to load compliance frameworks.",
            });
        }
    };

    // =========================================
    // HANDLE INPUT CHANGE
    // =========================================

    handleChange = (event) => {
        const { name, value } = event.target;

        this.setState({
            [name]: value,
            error: "",
        });
    };

    // =========================================
    // CREATE PROJECT
    // =========================================

    handleSubmit = async (event) => {
        event.preventDefault();

        const {
            name,
            description,
            department,
            status,
            poc,
            framework,
        } = this.state;

        // =========================================
        // VALIDATION
        // =========================================

        if (
            !name.trim() ||
            !description.trim() ||
            !department ||
            !poc ||
            !framework
        ) {
            this.setState({
                error: "Please fill all required fields.",
                success: "",
            });

            return;
        }

        // =========================================
        // PROJECT DATA
        // =========================================

        const projectData = {
            name: name.trim(),
            description: description.trim(),
            department: department,
            status: status,
            poc: poc,
            framework: framework,
        };

        console.log("Project Data:", projectData);

        this.setState({
            loading: true,
            error: "",
            success: "",
        });

        // =========================================
        // POST PROJECT
        // =========================================

        try {
            const response = await api.post(
                "/projects/",
                projectData
            );

            console.log(
                "Project created successfully:",
                response.data
            );

            this.setState({
                loading: false,
                success: "Project created successfully!",
            });

            setTimeout(() => {
                this.props.navigate("/projects");
            }, 800);

        } catch (error) {
            console.error(
                "Create project error:",
                error.response?.data || error.message
            );

            let errorMessage =
                "Failed to create project.";

            if (error.response?.data) {
                const backendError =
                    error.response.data;

                if (backendError.detail) {
                    errorMessage =
                        backendError.detail;
                } else if (
                    typeof backendError === "object"
                ) {
                    errorMessage =
                        Object.entries(backendError)
                            .map(([field, messages]) => {
                                const message =
                                    Array.isArray(messages)
                                        ? messages.join(", ")
                                        : messages;

                                return `${field}: ${message}`;
                            })
                            .join(" | ");
                }
            }

            this.setState({
                loading: false,
                error: errorMessage,
                success: "",
            });
        }
    };

    // =========================================
    // CANCEL
    // =========================================

    handleCancel = () => {
        this.props.navigate("/projects");
    };

    // =========================================
    // RENDER
    // =========================================

    render() {
        const {
            name,
            description,
            department,
            status,
            error,
            success,
            poc,
            framework,
            loading,
            departments,
            project_code,
            frameworks,
            loadingDepartments,
            loadingFrameworks,
        } = this.state;

        return (
            <>
                <Sidebar />

                <div className="add-project-page">

                    {/* PAGE HEADER */}

                    <div className="add-project-header">
                        <div>
                            <h1>
                                Add Project
                            </h1>

                            <p>
                                Create a new project in the QMS system
                            </p>
                        </div>
                    </div>

                    {/* FORM CARD */}

                    <div className="add-project-card">

                        <div className="form-title">
                            <h2>
                                Project Information
                            </h2>

                            <p>
                                Enter the details of the new project.
                            </p>
                        </div>

                        {/* ERROR */}

                        {error && (
                            <div className="form-error">
                                {error}
                            </div>
                        )}

                        {/* SUCCESS */}

                        {success && (
                            <div className="form-success">
                                {success}
                            </div>
                        )}

                        <form
                            onSubmit={this.handleSubmit}
                        >

                            {/* PROJECT NAME */}
<div className="form-row">
                            <div className="form-group">

                                <label>
                                    Project Name
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={name}
                                    onChange={this.handleChange}
                                    placeholder="Enter project name"
                                    disabled={loading}
                                />

                            </div>
                            <div className="form-group">
    <label>
        Project Code
        <span>*</span>
    </label>

    <input
        type="text"
        name="project_code"
        value={project_code}
        onChange={this.handleChange}
        placeholder="Enter project code"
        disabled={loading}
    />
</div>
</div>
                            {/* DESCRIPTION */}

                            <div className="form-group">

                                <label>
                                    Description
                                    <span>*</span>
                                </label>

                                <textarea
                                    name="description"
                                    value={description}
                                    onChange={this.handleChange}
                                    placeholder="Enter project description"
                                    rows="4"
                                    disabled={loading}
                                />

                            </div>

                            {/* DEPARTMENT + POC */}

                            <div className="form-row">

                                {/* DEPARTMENT */}

                                <div className="form-group">

                                    <label>
                                        Department
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="department"
                                        value={department}
                                        onChange={this.handleChange}
                                        disabled={
                                            loading ||
                                            loadingDepartments
                                        }
                                    >

                                        <option value="">
                                            {loadingDepartments
                                                ? "Loading Departments..."
                                                : "Select Department"}
                                        </option>

                                        {departments.map(
                                            (dept) => (
                                               <option key={dept.id} value={dept.name}>
    {dept.name}
</option>
                                            )
                                        )}

                                    </select>

                                </div>

                                {/* POC */}

                                <div className="form-group">

                                    <label>
                                        Point of Contact
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="poc"
                                        value={poc}
                                        onChange={this.handleChange}
                                        disabled={loading}
                                    >

                                        <option value="">
                                            Select POC
                                        </option>

                                        <option value="Harjot Kaur">
                                            Harjot Kaur
                                        </option>

                                    </select>

                                </div>

                            </div>

                            {/* FRAMEWORK + STATUS */}

                            <div className="form-row">

                                {/* FRAMEWORK */}

                                <div className="form-group">

                                    <label>
                                        Compliance Framework
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="framework"
                                        value={framework}
                                        onChange={this.handleChange}
                                        disabled={
                                            loading ||
                                            loadingFrameworks
                                        }
                                    >

                                        <option value="">
                                            {loadingFrameworks
                                                ? "Loading Frameworks..."
                                                : "Select Framework"}
                                        </option>

                                        {frameworks.map(
                                            (item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                                {/* STATUS */}

                                <div className="form-group">

                                    <label>
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={status}
                                        onChange={this.handleChange}
                                        disabled={loading}
                                    >

                                        <option value="Active">
                                            Active
                                        </option>

                                        <option value="Inactive">
                                            Inactive
                                        </option>

                                    </select>

                                </div>

                            </div>

                            {/* BUTTONS */}

                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={this.handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-project-btn"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Creating..."
                                        : "Create Project"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            </>
        );
    }
}

export default withNavigation(AddProject);