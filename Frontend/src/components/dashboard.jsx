import { Link } from "react-router-dom";
import { DEPARTMENTS } from "../constants";

export function Stat({ label, value, sub, to }) {
    const body = (
        <>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </>
    );
    return to ? <Link to={to} className="stat stat-link">{body}</Link> : <div className="stat">{body}</div>;
}

export function TaskList({ title, items, empty }) {
    return (
        <div className="card">
            <div className="card-head"><h2>{title}</h2></div>
            {items.length === 0 ? (
                <p className="muted">{empty}</p>
            ) : (
                <ul className="task-list">
                    {items.map((t) => (
                        <li key={t.key}>
                            <Link to={t.to} className="task">
                                <span>
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

/** Framework × department grid: which audits could complete assignment today. */
export function ChecklistCoverage({ frameworks, checklists }) {
    const active = frameworks.filter((f) => f.is_active);
    return (
        <div className="card">
            <div className="card-head">
                <h2>Checklist coverage</h2>
                <Link to="/checklists" className="link">Manage checklists →</Link>
            </div>
            <p className="muted">
                Audits use the active checklist matching their framework and department. Red cells mean an audit there cannot complete assignment yet.
            </p>
            <div className="table-wrap">
                <table className="table coverage">
                    <thead>
                        <tr>
                            <th>Framework</th>
                            {DEPARTMENTS.map((d) => <th key={d.value} className="center">{d.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {active.map((f) => (
                            <tr key={f.id}>
                                <td><strong>{f.name}</strong></td>
                                {DEPARTMENTS.map((d) => {
                                    const c = checklists.find((x) => x.is_active && x.framework === f.id && x.department === d.value);
                                    const state = !c ? "missing" : c.items.length === 0 ? "empty" : "ok";
                                    return (
                                        <td key={d.value} className="center">
                                            {c ? (
                                                <Link to={`/checklists/${c.id}`} className={`cov cov-${state}`}>
                                                    {c.items.length} items
                                                </Link>
                                            ) : (
                                                <span className="cov cov-missing">None</span>
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
