import React, { Component } from "react";
import withNavigation  from "../withNavigation";
import Sidebar from "../components/Sidebar";
// import api from "../api";
import "../styles/checklist-items.css";

class ChecklistItems extends Component {
    constructor(props) {
        super(props);

        this.state = {
            checklist: null,
            items: [],

            itemNumber: 1,
            requirement: "",
            description: "",
            clauseReference: "",
            evidenceRequired: "",
            responseType: "Yes/No/N/A",
            mandatory: true,

            loading: true,
            saving: false,
            error: ""
        };
    }

    componentDidMount() {
        this.loadChecklist();
    }

    loadChecklist = async () => {
        const { id } = this.props.params;

        try {
            const response = await api.get(
                `/checklists/${id}/`
            );

            this.setState({
                checklist: response.data,
                items: response.data.items || [],
                loading: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                loading: false,
                error: "Unable to load checklist."
            });
        }
    };

    handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        this.setState({
            [name]: type === "checkbox" ? checked : value,
            error: ""
        });
    };

    addItem = async (event) => {
        event.preventDefault();

        const {
            requirement,
            description,
            clauseReference,
            evidenceRequired,
            responseType,
            mandatory,
            items
        } = this.state;

        if (!requirement.trim()) {
            this.setState({
                error: "Requirement is required."
            });

            return;
        }

        this.setState({
            saving: true,
            error: ""
        });

        try {
            const { id } = this.props.params;

            const response = await api.post(
                `/checklists/${id}/items/`,
                {
                    item_number: items.length + 1,
                    requirement,
                    description,
                    clause_reference: clauseReference,
                    evidence_required: evidenceRequired,
                    response_type: responseType,
                    is_mandatory: mandatory
                }
            );

            this.setState({
                items: [...items, response.data],

                itemNumber: items.length + 2,
                requirement: "",
                description: "",
                clauseReference: "",
                evidenceRequired: "",
                responseType: "Yes/No/N/A",
                mandatory: true,

                saving: false
            });

        } catch (error) {
            console.error(error);

            this.setState({
                saving: false,
                error: "Unable to add checklist item."
            });
        }
    };

    finishChecklist = () => {
        this.props.navigate("/checklists");
    };

    render() {
        const {
            checklist,
            items,
            requirement,
            description,
            clauseReference,
            evidenceRequired,
            responseType,
            mandatory,
            loading,
            saving,
            error
        } = this.state;

        if (loading) {
            return (
                <div className="qms-layout">
                    <Sidebar />

                    <main className="main-content">
                        <div className="loading">
                            Loading checklist...
                        </div>
                    </main>
                </div>
            );
        }

        return (
            <div className="qms-layout">

                <Sidebar />

                <main className="main-content">

                    <div className="page-header">

                        <h1>Checklist Items</h1>

                        {checklist && (
                            <p>
                                {checklist.name}
                            </p>
                        )}

                    </div>


                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}


                    {/* Existing Items */}

                    <div className="items-card">

                        <h2>Checklist Items</h2>

                        {items.length === 0 ? (

                            <div className="empty-items">
                                No checklist items added yet.
                            </div>

                        ) : (

                            items.map((item) => (

                                <div
                                    className="checklist-item"
                                    key={item.id}
                                >

                                    <div className="item-number">
                                        {item.item_number}
                                    </div>

                                    <div className="item-content">

                                        <h3>
                                            {item.requirement}
                                        </h3>

                                        {item.description && (
                                            <p>
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="item-meta">

                                            {item.clause_reference && (
                                                <span>
                                                    Clause:{" "}
                                                    {item.clause_reference}
                                                </span>
                                            )}

                                            <span>
                                                Response:{" "}
                                                {item.response_type}
                                            </span>

                                            {item.is_mandatory && (
                                                <span>
                                                    Mandatory
                                                </span>
                                            )}

                                        </div>

                                    </div>

                                </div>

                            ))

                        )}

                    </div>


                    {/* Add Item */}

                    <div className="items-card">

                        <h2>Add Checklist Item</h2>

                        <form onSubmit={this.addItem}>

                            <div className="form-group">

                                <label>
                                    Requirement / Question
                                    <span className="required">*</span>
                                </label>

                                <textarea
                                    name="requirement"
                                    value={requirement}
                                    onChange={this.handleChange}
                                    rows="3"
                                    placeholder="Enter the audit requirement or question"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Description / Guidance
                                </label>

                                <textarea
                                    name="description"
                                    value={description}
                                    onChange={this.handleChange}
                                    rows="3"
                                    placeholder="Additional guidance for the auditor"
                                />

                            </div>


                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Clause / Standard Reference
                                    </label>

                                    <input
                                        type="text"
                                        name="clauseReference"
                                        value={clauseReference}
                                        onChange={this.handleChange}
                                        placeholder="e.g. ISO 9001 - 7.5"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Response Type
                                    </label>

                                    <select
                                        name="responseType"
                                        value={responseType}
                                        onChange={this.handleChange}
                                    >

                                        <option value="Yes/No/N/A">
                                            Yes / No / N/A
                                        </option>

                                        <option value="Pass/Fail">
                                            Pass / Fail
                                        </option>

                                        <option value="Text">
                                            Text
                                        </option>

                                    </select>

                                </div>

                            </div>


                            <div className="form-group">

                                <label>
                                    Evidence Required
                                </label>

                                <input
                                    type="text"
                                    name="evidenceRequired"
                                    value={evidenceRequired}
                                    onChange={this.handleChange}
                                    placeholder="e.g. Training records"
                                />

                            </div>


                            <div className="checkbox-field">

                                <input
                                    type="checkbox"
                                    name="mandatory"
                                    checked={mandatory}
                                    onChange={this.handleChange}
                                    id="mandatory"
                                />

                                <label htmlFor="mandatory">
                                    Mandatory checklist item
                                </label>

                            </div>


                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={saving}
                            >
                                {saving
                                    ? "Adding..."
                                    : "+ Add Item"}
                            </button>

                        </form>

                    </div>


                    <div className="finish-actions">

                        <button
                            className="cancel-btn"
                            onClick={() =>
                                this.props.navigate("/checklists")
                            }
                        >
                            Save as Draft
                        </button>

                        <button
                            className="primary-btn"
                            onClick={this.finishChecklist}
                        >
                            Finish Checklist
                        </button>

                    </div>

                </main>
            </div>
        );
    }
}

export default withNavigation(ChecklistItems);