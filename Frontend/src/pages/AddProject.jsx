import React, { Component } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/add-project.css";

class AddProject extends Component {

    constructor(props) {
        super(props);

        this.state = {
            name: "",
            description: "",
            department: "", 
            status: "Active",
            error: "",
            poc:"",
            framework:""
        };
    }

    handleChange = (event) => {
        const { name, value } = event.target;

        this.setState({
            [name]: value
        });
    };

    handleSubmit = (event) => {
        event.preventDefault();

        const {
            name,
            description,
            department,
            status,
            poc,
            framework
        } = this.state;

        if (!name || !description || !department || !poc || !framework) {
            this.setState({
                error: "Please fill all required fields."
            });

            return;
        }

        const projectData = {
            name,
            description,
            department, 
            status,
            framework,
            
        };

        console.log("Project Data:", projectData);

        // Later we will send this data to Django API
        // api.post("/projects/", projectData);

        alert("Project added successfully!");

        this.props.navigate("/projects")
    };

    handleCancel = () => {
        this.props.navigate("/projects")
    };

    render() {

        const {
            name,
            description,
            department, 
            status,
            error,
            poc,
            framework
        } = this.state;

        return (
            <>
                <Sidebar />

                <div className="add-project-page">

                    {/* Page Header */}

                    <div className="add-project-header">

                        <div>
                            <h1>Add Project</h1>

                            <p>
                                Create a new project in the QMS system
                            </p>
                        </div>

                    </div>


                    {/* Form Card */}

                    <div className="add-project-card">

                        <div className="form-title">

                            <h2>Project Information</h2>

                            <p>
                                Enter the details of the new project.
                            </p>

                        </div>


                        {error && (
                            <div className="form-error">
                                {error}
                            </div>
                        )}


                        <form onSubmit={this.handleSubmit}>

                            {/* Project Name */}

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
                                />

                            </div>


                            {/* Description */}

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
                                />

                            </div>


                            {/* Department + Manager */}

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Department
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="department"
                                        value={department}
                                        onChange={this.handleChange}
                                    >

                                        <option value="">
                                            Select Department
                                        </option>

                                        <option value="Quality Assurance">
                                            Quality Assurance
                                        </option>

                                        <option value="Human Resources">
                                            Human Resources
                                        </option>

                                        <option value="Audit">
                                            Audit
                                        </option>

                                        <option value="Operations">
                                            Operations
                                        </option>

                                        <option value="Risk Management">
                                            Risk Management
                                        </option>

                                        <option value="IT">
                                            IT
                                        </option>

                                    </select>

                                </div>


                                <div className="form-group">

                                    <label>
                                        Point of Contact
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="poc"
                                        value={poc}
                                        onChange={this.handleChange}
                                    >

                                        <option value="">
                                            Select POC
                                        </option>

                                        <option value="Quality Assurance">
                                            Harjot kaur
                                        </option>
 

                                    </select>

                                </div>

                            </div>
                            <div className="form-row">
                            <div className="form-group">

                                    <label>
                                        Compliance Framework
                                        <span>*</span>
                                    </label>

                                    <select
                                        name="framework"
                                        value={framework}
                                        onChange={this.handleChange}
                                    >

                                        <option value="">
                                            Select framework
                                        </option>

                                        <option value="Quality Assurance">
                                            ISO 9001 
                                        </option>
 

                                    </select>

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

                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>

                                </select>

                            </div>
                            </div>


                            {/* Buttons */}

                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={this.handleCancel}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-project-btn"
                                >
                                    Create Project
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            </>
        );
    }
}

export default AddProject;