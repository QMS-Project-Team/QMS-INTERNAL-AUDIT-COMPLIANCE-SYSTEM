import { useState } from "react";
import { ncsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useToast } from "./Toast";
import { Badge } from "./ui";
import { formatDateTime } from "../utils/format";
import { ncState } from "../workflow";

const AUDITOR_FIELDS = [
    { key: "finding", label: "Finding", hint: "What does not conform, and the evidence." },
    { key: "risk_action", label: "Risk action", hint: "Filled by the auditor." },
];

const TEAM_FIELDS = [
    { key: "correction", label: "Correction", hint: "Immediate fix." },
    { key: "corrective_action", label: "Corrective action", hint: "Removes the root cause." },
    { key: "preventive_action", label: "Preventive action", hint: "Stops it happening elsewhere." },
];

/** One group of NC fields, editable only by its owner. */
function FieldGroup({ title, owner, fields, nc, editable, onSave }) {
    const [draft, setDraft] = useState(() => Object.fromEntries(fields.map((f) => [f.key, nc[f.key] || ""])));
    const [busy, setBusy] = useState(false);
    const dirty = fields.some((f) => draft[f.key] !== (nc[f.key] || ""));

    const save = async () => {
        setBusy(true);
        const ok = await onSave(draft);
        setBusy(false);
        return ok;
    };

    return (
        <div className="nc-group">
            <div className="nc-group-head">
                <strong>{title}</strong>
                <span className="owner-tag">{owner}</span>
            </div>
            {fields.map((f) => (
                <div key={f.key} className="nc-field">
                    <span className="field-label">{f.label}</span>
                    {editable ? (
                        <textarea
                            className="input"
                            rows={2}
                            value={draft[f.key]}
                            placeholder={f.hint}
                            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        />
                    ) : (
                        <p className="pre nc-value">{nc[f.key] || <span className="muted">Not provided yet</span>}</p>
                    )}
                </div>
            ))}
            {editable && (
                <div className="form-actions">
                    <button className="btn btn-sm btn-primary" disabled={!dirty || busy} onClick={save}>
                        {busy ? "Saving…" : "Save"}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * A non-conformity: auditor fills finding + risk action, the audited team fills
 * correction / corrective / preventive action, QMS accepts or asks for rework.
 * `role` is "auditor" | "team" | "qms" | "viewer".
 */
export default function NcCard({ auditId, nc, role, onChanged }) {
    const notify = useToast();
    const [remarks, setRemarks] = useState(nc.verification_remarks || "");
    const [busy, setBusy] = useState("");
    const state = ncState(nc);
    const locked = nc.status === "ACCEPTED";
    const hasActions = Boolean(nc.correction?.trim() || nc.corrective_action?.trim());

    const patch = async (body, message) => {
        try {
            await ncsApi(auditId).update(nc.id, body);
            notify(message);
            await onChanged();
            return true;
        } catch (err) {
            notify(errorMessage(err), "error");
            return false;
        }
    };

    const verify = async (status) => {
        setBusy(status);
        await patch(
            { status, verification_remarks: remarks },
            status === "ACCEPTED" ? "NC accepted. The auditor can now mark the item compliant." : "Sent back to the team for rework."
        );
        setBusy("");
    };

    return (
        <article className={`nc-card nc-${state.key}`}>
            <header className="nc-head">
                <div>
                    <span className="mono"><strong>{nc.item_code}</strong></span>
                    <p className="nc-question">{nc.question}</p>
                </div>
                <Badge tone={state.tone} label={state.label} />
            </header>

            <div className="nc-groups">
                <FieldGroup
                    title="Finding & risk"
                    owner="Auditor"
                    fields={AUDITOR_FIELDS}
                    nc={nc}
                    editable={role === "auditor" && !locked}
                    onSave={(draft) => patch(draft, "Finding saved.")}
                />
                <FieldGroup
                    title="Corrective actions"
                    owner="Audited team"
                    fields={TEAM_FIELDS}
                    nc={nc}
                    editable={role === "team" && !locked}
                    onSave={(draft) => patch(draft, "Actions submitted for QMS verification.")}
                />
            </div>

            <div className="nc-verify">
                <div className="nc-group-head">
                    <strong>Verification</strong>
                    <span className="owner-tag">QMS</span>
                </div>
                {nc.verified_at && (
                    <p className="muted small">
                        {nc.status === "ACCEPTED" ? "Accepted" : "Rework requested"} by {nc.verified_by_name} · {formatDateTime(nc.verified_at)}
                    </p>
                )}
                {role === "qms" && !locked ? (
                    <>
                        <textarea className="input" rows={2} value={remarks} placeholder="Verification remarks"
                            onChange={(e) => setRemarks(e.target.value)} />
                        <div className="form-actions">
                            {!hasActions && <span className="field-hint">The team must submit a correction or corrective action first.</span>}
                            <button className="btn btn-sm btn-ghost danger" disabled={!hasActions || Boolean(busy)}
                                onClick={() => verify("REWORK_REQUIRED")}>
                                {busy === "REWORK_REQUIRED" ? "Saving…" : "Request rework"}
                            </button>
                            <button className="btn btn-sm btn-success" disabled={!hasActions || Boolean(busy)}
                                onClick={() => verify("ACCEPTED")}>
                                {busy === "ACCEPTED" ? "Saving…" : "Accept"}
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="pre nc-value">{nc.verification_remarks || <span className="muted">{locked ? "No remarks." : "Not verified yet."}</span>}</p>
                )}
            </div>
        </article>
    );
}
