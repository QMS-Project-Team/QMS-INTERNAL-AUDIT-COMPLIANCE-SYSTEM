import React, { Component } from "react";
import  withNavigation  from "../withNavigation";
import Sidebar from "../components/Sidebar";
// import api from "../api";
import "../styles/add-audit.css";

class AddAudit extends Component {
    constructor(props) {
        super(props);

        this.state = {
            project: "",
            auditType: "Internal Audit",
            auditDate: "",
            primaryAuditor: "",
            secondaryAuditor: "",

            projects: [],
            auditors: [],

            checklist: null,

            loading: true,
            findingChecklist: false,
            saving: false,
            error: ""
        };
    }

    componentDidMount() {
        this.loadFormData();
    }

    loadFormData = async () => {
        try {
            const [projectResponse, auditorResponse] =
                await Promise.all([
                    api.get("/projects/"),
                    api.get("/auditors/")
                ]);

            this.setState({
                projects: projectResponse.data,
                auditors: auditorResponse.data,
                loading: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                loading: false,
                error: "Unable to load audit form."
            });
        }
    };

    handleProjectChange = async (event) => {
        const projectId = event.target.value;

        this.setState({
            project: projectId,
            checklist: null,
            findingChecklist: false,
            error: ""
        });

        if (!projectId) {
            return;
        }

        this.setState({
            findingChecklist: true
        });

        try {
            /*
             * Backend should find:
             *
             * Project Department
             * +
             * Project Framework
             *
             * and return the matching active checklist.
             */

            const response = await api.get(
                `/projects/${projectId}/matching-checklist/`
            );

            this.setState({
                checklist: response.data,
                findingChecklist: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                checklist: null,
                findingChecklist: false,
                error:
                    error.response?.data?.detail ||
                    "No matching checklist was found for this project."
            });
        }
    };

    handleChange = (event) => {
        const { name, value } = event.target;

        this.setState({
            [name]: value,
            error: ""
        });
    };

    handleSubmit = async (event) => {
        event.preventDefault();

        const {
            project,
            auditType,
            auditDate,
            primaryAuditor,
            secondaryAuditor,
            checklist
        } = this.state;

        if (
            !project ||
            !auditDate ||
            !primaryAuditor ||
            !secondaryAuditor
        ) {
            this.setState({
                error: "Please fill all required fields."
            });

            return;
        }

        if (!checklist) {
            this.setState({
                error:
                    "A matching checklist is required before creating the audit."
            });

            return;
        }

        this.setState({
            saving: true,
            error: ""
        });

        try {
            await api.post("/audits/", {
                project,
                audit_type: auditType,
                audit_date: auditDate,
                primary_auditor: primaryAuditor,
                secondary_auditor: secondaryAuditor,
                checklist: checklist.id
            });

            this.props.navigate("/audits");

        } catch (error) {
            console.error(error);

            this.setState({
                saving: false,
                error:
                    error.response?.data?.detail ||
                    "Failed to create audit."
            });
        }
    };

    render() {
        const {
            project,
            auditType,
            auditDate,
            primaryAuditor,
            secondaryAuditor,
            projects,
            auditors,
            checklist,
            loading,
            findingChecklist,
            saving,
            error
        } = this.state;

        return (
            <div className="qms-layout">

                <Sidebar />

                <main className="main-content">

                    <div className="page-header">

                        <h1>Create Audit</h1>

                        <p>
                            Create an audit and assign the appropriate
                            department checklist.
                        </p>

                    </div>


                    <div className="audit-form-card">

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}


                        {loading ? (
                            <div className="loading">
                                Loading...
                            </div>
                        ) : (

                            <form onSubmit={this.handleSubmit}>

                                {/* Project */}

                                <div className="form-group">

                                    <label>
                                        Project
                                        <span className="required">*</span>
                                    </label>

                                    <select
                                        value={project}
                                        onChange={this.handleProjectChange}
                                    >

                                        <option value="">
                                            Select Project
                                        </option>

                                        {projects.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}

                                    </select>

                                </div>


                                {/* Project information */}

                                {project && (
                                    <div className="project-summary">

                                        <div>
                                            <strong>
                                                Department
                                            </strong>

                                            <span>
                                                {
                                                    projects.find(
                                                        (p) =>
                                                            p.id ==
                                                            project
                                                    )?.department_name
                                                }
                                            </span>
                                        </div>


                                        <div>
                                            <strong>
                                                Framework
                                            </strong>

                                            <span>
                                                {
                                                    projects.find(
                                                        (p) =>
                                                            p.id ==
                                                            project
                                                    )?.framework_name
                                                }
                                            </span>
                                        </div>

                                    </div>
                                )}


                                {/* Checklist */}

                                <div className="checklist-assignment">

                                    <label>
                                        Checklist
                                    </label>

                                    {findingChecklist ? (

                                        <div className="finding-checklist">
                                            Finding matching checklist...
                                        </div>

                                    ) : checklist ? (

                                        <div className="matched-checklist">

                                            <div className="check-icon">
                                                ✓
                                            </div>

                                            <div>

                                                <strong>
                                                    {checklist.name}
                                                </strong>

                                                <p>
                                                    Framework:{" "}
                                                    {
                                                        checklist.framework_name
                                                    }
                                                    {" | "}
                                                    Department:{" "}
                                                    {
                                                        checklist.department_name
                                                    }
                                                </p>

                                                <small>
                                                    Version:{" "}
                                                    {checklist.version}
                                                    {" | "}
                                                    Items:{" "}
                                                    {
                                                        checklist.item_count
                                                    }
                                                </small>

                                            </div>

                                        </div>

                                    ) : (

                                        <div className="no-checklist">
                                            Select a project to find the
                                            matching checklist.
                                        </div>

                                    )}

                                </div>


                                {/* Audit Type */}

                                <div className="form-group">

                                    <label>
                                        Audit Type
                                    </label>

                                    <select
                                        name="auditType"
                                        value={auditType}
                                        onChange={this.handleChange}
                                    >

                                        <option value="Internal Audit">
                                            Internal Audit
                                        </option>

                                    </select>

                                </div>


                                {/* Audit Date */}

                                <div className="form-group">

                                    <label>
                                        Audit Date
                                        <span className="required">*</span>
                                    </label>

                                    <input
                                        type="date"
                                        name="auditDate"
                                        value={auditDate}
                                        onChange={this.handleChange}
                                    />

                                </div>


                                {/* Auditors */}

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Primary Auditor
                                            <span className="required">*</span>
                                        </label>

                                        <select
                                            name="primaryAuditor"
                                            value={primaryAuditor}
                                            onChange={this.handleChange}
                                        >

                                            <option value="">
                                                Select Auditor
                                            </option>

                                            {auditors.map((auditor) => (
                                                <option
                                                    key={auditor.id}
                                                    value={auditor.id}
                                                >
                                                    {auditor.name}
                                                </option>
                                            ))}

                                        </select>

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Secondary Auditor
                                            <span className="required">*</span>
                                        </label>

                                        <select
                                            name="secondaryAuditor"
                                            value={secondaryAuditor}
                                            onChange={this.handleChange}
                                        >

                                            <option value="">
                                                Select Auditor
                                            </option>

                                            {auditors.map((auditor) => (
                                                <option
                                                    key={auditor.id}
                                                    value={auditor.id}
                                                >
                                                    {auditor.name}
                                                </option>
                                            ))}

                                        </select>

                                    </div>

                                </div>


                                <div className="form-actions">

                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() =>
                                            this.props.navigate("/audits")
                                        }
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="primary-btn"
                                        disabled={
                                            saving ||
                                            !checklist
                                        }
                                    >
                                        {saving
                                            ? "Creating..."
                                            : "Create Audit"}
                                    </button>

                                </div>

                            </form>

                        )}

                    </div>

                </main>
            </div>
        );
    }
}

export default withNavigation(AddAudit);