import { Link } from "react-router-dom";
import { getDepartments } from "../constants";

export function Stat({ label, value, sub, to }) {
    const body = (
        <>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </>
    );

    return to ? (
        <Link to={to} className="stat stat-link">
            {body}
        </Link>
    ) : (
        <div className="stat">{body}</div>
    );
}

export function TaskList({ title, items, empty, viewAll = true }) {
    return (
        <div className="card">
            <div className="card-head">
                <div className="section-heading">
                    <h2>{title}</h2>
                    {items.length > 0 && (
                        <span className="section-count">
                            {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                    )}
                </div>

                {viewAll && (
                    <Link to="/audits" className="link section-action">
                        View all →
                    </Link>
                )}
            </div>

            {items.length === 0 ? (
                <p className="muted">{empty}</p>
            ) : (
                <ul className="task-list">
                    {items.map((t) => (
                        <li key={t.key}>
                            <Link to={t.to} className="task">
                                <span className="task-main">
                                    <strong className="mono">{t.code}</strong>
                                    <span className="muted"> · {t.text}</span>
                                </span>

                                <span className="task-meta">{t.meta}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Framework × department grid: where QMS can create an audit today. */
export function ChecklistCoverage({ frameworks, checklists }) {
    const active = frameworks.filter((f) => f.is_active);
    const departments = getDepartments();

    return (
        <div className="card">
            <div className="card-head">
                <div className="section-heading">
                    <h2>Checklist coverage</h2>
                    {active.length > 0 && (
                        <span className="section-count">
                            {active.length} {active.length === 1 ? "framework" : "frameworks"}
                        </span>
                    )}
                </div>

                <Link to="/checklists" className="link section-action">
                    Manage checklists →
                </Link>
            </div>

            <p className="muted">
                A new audit copies the active checklist for its framework and its project's department.
                Red cells mean QMS cannot create an audit there yet.
            </p>

            <div className="table-wrap">
                <table className="table coverage">
                    <thead>
                        <tr>
                            <th>Framework</th>
                            {departments.map((d) => (
                                <th key={d.id} className="center">
                                    {d.name}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {active.map((f) => (
                            <tr key={f.id}>
                                <td>
                                    <strong>{f.name}</strong>
                                </td>

                                {departments.map((d) => {
                                    const c = checklists.find(
                                        (x) =>
                                            x.is_active &&
                                            x.framework === f.id &&
                                            x.department === d.id
                                    );

                                    const state = !c
                                        ? "missing"
                                        : c.items.length === 0
                                            ? "empty"
                                            : "ok";

                                    return (
                                        <td key={d.id} className="center">
                                            {c ? (
                                                <Link
                                                    to={`/checklists/${c.id}`}
                                                    className={`cov cov-${state}`}
                                                >
                                                    {c.items.length} items
                                                </Link>
                                            ) : (
                                                <span className="cov cov-missing">
                                                    None
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
