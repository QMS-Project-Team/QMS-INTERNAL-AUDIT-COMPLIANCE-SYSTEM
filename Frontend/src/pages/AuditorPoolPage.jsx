import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditsApi, authApi, pocsApi } from "../api/endpoints";
import useLoad from "../hooks/useLoad";
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, SearchInput } from "../components/ui";
import { pocLabel } from "../constants";

const fullName = (u) => (u?.first_name ? `${u.first_name} ${u.last_name}` : u?.username || "—");

/**
 * Every Primary / Secondary / Additional POC across projects. These employees
 * are the auditor pool: QMS assigns them to audits of *other* projects, and an
 * employee can be on only one non-closed audit at a time.
 */
export default function AuditorPoolPage() {
    const [search, setSearch] = useState("");
    const [onlyAvailable, setOnlyAvailable] = useState(false);

    const { data, loading, error, reload } = useLoad(async () => {
        const [pocs, audits, users] = await Promise.all([pocsApi.list(), auditsApi.list(), authApi.users()]);
        return { pocs, audits, users };
    });

    const { rows, available } = useMemo(() => {
        if (!data) return { rows: [], available: 0 };
        const users = Object.fromEntries(data.users.map((u) => [u.id, u]));
        const active = {};
        data.audits
            .filter((a) => a.status !== "CLOSED")
            .forEach((a) =>
                (a.progress?.auditors || []).forEach((x) => {
                    active[x.auditor] = { audit: a, type: x.assignment_type };
                })
            );
        const q = search.toLowerCase();
        const list = data.pocs
            .map((poc) => ({ poc, user: users[poc.employee], active: active[poc.employee] }))
            .filter(({ poc, user, active: a }) =>
                (!onlyAvailable || !a) &&
                [poc.employee_name, fullName(user), poc.project_name, poc.project_code, poc.department]
                    .some((v) => v?.toLowerCase().includes(q))
            )
            .sort((a, b) => Boolean(a.active) - Boolean(b.active) || a.poc.employee_name.localeCompare(b.poc.employee_name));
        return { rows: list, available: data.pocs.filter((poc) => !active[poc.employee]).length };
    }, [data, search, onlyAvailable]);

    const total = data?.pocs.length || 0;

    return (
        <>
            <PageHeader
                title="Auditor pool"
                subtitle="Project POCs who can audit other projects. One active audit per auditor; nobody audits their own project."
            />

            <div className="card">
                <div className="toolbar">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, project, department…" />
                    <label className="check">
                        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
                        Available only
                    </label>
                    {data && <span className="muted">{available} of {total} available</span>}
                </div>

                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : rows.length === 0 ? (
                    <EmptyState
                        title={total ? "Nobody matches" : "No POCs yet"}
                        text={total ? null : "Directors mark Primary, Secondary and Additional POCs on their projects."}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Home project</th>
                                    <th>Department</th>
                                    <th>POC role</th>
                                    <th>Availability</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ poc, user, active }) => (
                                    <tr key={poc.id}>
                                        <td><strong>{fullName(user)}</strong> <span className="muted">{poc.employee_name}</span></td>
                                        <td><span className="mono">{poc.project_code}</span> <span className="muted">{poc.project_name}</span></td>
                                        <td>{poc.department}</td>
                                        <td><Badge value={poc.poc_type} label={pocLabel(poc.poc_type)} /></td>
                                        <td>
                                            {active ? (
                                                <span>
                                                    <Badge tone="amber" label={`${active.type.toLowerCase()} on`} />{" "}
                                                    <Link to={`/audits/${active.audit.id}`} className="link mono">{active.audit.audit_code}</Link>
                                                </span>
                                            ) : (
                                                <Badge value="ACTIVE" label="Available" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
