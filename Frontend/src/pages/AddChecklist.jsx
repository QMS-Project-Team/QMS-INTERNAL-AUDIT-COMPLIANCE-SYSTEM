import React, { Component } from "react";
import  withNavigation  from "../withNavigation";
import Sidebar from "../components/Sidebar";
// import api from "../api";
import "../styles/add-checklist.css";

class AddChecklist extends Component {
    constructor(props) {
        super(props);

        this.state = {
            name: "",
            framework: "",
            department: "",
            version: "1.0",
            description: "",
            effective_from: "",
            status: "Draft",

            frameworks: [],
            departments: [],

            loading: true,
            saving: false,
            error: ""
        };
    }

    componentDidMount() {
        this.loadFormData();
    }

    loadFormData = async () => {
        try {
            const [frameworkResponse, departmentResponse] =
                await Promise.all([
                    api.get("/frameworks/"),
                    api.get("/departments/")
                ]);

            this.setState({
                frameworks: frameworkResponse.data,
                departments: departmentResponse.data,
                loading: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                loading: false,
                error: "Unable to load checklist form."
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
            name,
            framework,
            department,
            version,
            description,
            effective_from,
            status
        } = this.state;

        if (
            !name.trim() ||
            !framework ||
            !department ||
            !version ||
            !effective_from
        ) {
            this.setState({
                error: "Please fill all required fields."
            });

            return;
        }

        this.setState({
            saving: true,
            error: ""
        });

        try {
            const response = await api.post("/checklists/", {
                name,
                framework,
                department,
                version,
                description,
                effective_from,
                status
            });

            const checklistId = response.data.id;

            /*
             * After creating the checklist,
             * go to the checklist item page.
             */
            this.props.navigate(
                `/checklists/${checklistId}/items`
            );

        } catch (error) {
            console.error(error);

            this.setState({
                saving: false,
                error:
                    error.response?.data?.detail ||
                    "Failed to create checklist."
            });
        }
    };

    handleCancel = () => {
        this.props.navigate("/checklists");
    };

    render() {
        const {
            name,
            framework,
            department,
            version,
            description,
            effective_from,
            status,
            frameworks,
            departments,
            loading,
            saving,
            error
        } = this.state;

        return (
            <div className="qms-layout">

                <Sidebar />

                <main className="main-content">

                    <div className="page-header">
                        <h1>Create Checklist</h1>

                        <p>
                            Create a compliance checklist for a
                            specific framework and department.
                        </p>
                    </div>


                    <div className="checklist-form-card">

                        <div className="form-card-title">
                            <h2>Checklist Information</h2>

                            <p>
                                The checklist will be matched to audits
                                using the selected framework and department.
                            </p>
                        </div>


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

                                {/* Name */}
                                <div className="form-group">

                                    <label>
                                        Checklist Name
                                        <span className="required">*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="name"
                                        value={name}
                                        onChange={this.handleChange}
                                        placeholder="e.g. ISO 9001 - Development Checklist"
                                    />

                                </div>


                                {/* Framework + Department */}
                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Compliance Framework
                                            <span className="required">*</span>
                                        </label>

                                        <select
                                            name="framework"
                                            value={framework}
                                            onChange={this.handleChange}
                                        >

                                            <option value="">
                                                Select Framework
                                            </option>

                                            {frameworks.map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>
                                            ))}

                                        </select>

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Department
                                            <span className="required">*</span>
                                        </label>

                                        <select
                                            name="department"
                                            value={department}
                                            onChange={this.handleChange}
                                        >

                                            <option value="">
                                                Select Department
                                            </option>

                                            {departments.map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>
                                            ))}

                                        </select>

                                    </div>

                                </div>


                                {/* Version */}
                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Version
                                            <span className="required">*</span>
                                        </label>

                                        <input
                                            type="text"
                                            name="version"
                                            value={version}
                                            onChange={this.handleChange}
                                            placeholder="1.0"
                                        />

                                    </div>


                                    <div className="form-group">

                                        <label>
                                            Effective From
                                            <span className="required">*</span>
                                        </label>

                                        <input
                                            type="date"
                                            name="effective_from"
                                            value={effective_from}
                                            onChange={this.handleChange}
                                        />

                                    </div>

                                </div>


                                {/* Description */}
                                <div className="form-group">

                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        name="description"
                                        value={description}
                                        onChange={this.handleChange}
                                        rows="5"
                                        placeholder="Enter checklist description"
                                    />

                                </div>


                                {/* Status */}
                                <div className="form-group">

                                    <label>
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={status}
                                        onChange={this.handleChange}
                                    >

                                        <option value="Draft">
                                            Draft
                                        </option>

                                        <option value="Active">
                                            Active
                                        </option>

                                        <option value="Inactive">
                                            Inactive
                                        </option>

                                    </select>

                                </div>


                                <div className="form-actions">

                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={this.handleCancel}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="primary-btn"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Creating..."
                                            : "Next: Add Checklist Items"}
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

export default withNavigation(AddChecklist);