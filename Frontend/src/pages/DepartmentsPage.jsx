import { authApi, checklistsApi, departmentsApi, projectsApi } from "../api/endpoints";
import useLoad from "../hooks/useLoad";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { formatDate } from "../utils/format";
import { departmentLabel } from "../constants";

const countBy = (list, key) =>
    list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});

export default function DepartmentsPage() {
    const { data, loading, error, reload } = useLoad(async () => {
        const [departments, projects, checklists, users] = await Promise.all([
            departmentsApi.list(),
            projectsApi.list(),
            checklistsApi.list(),
            authApi.users(),
        ]);
        return {
            departments,
            projects: countBy(projects, "department"),
            checklists: countBy(checklists.filter((c) => c.is_active), "department"),
            members: countBy(users, "department"),
            auditors: countBy(users.filter((u) => u.role === "AUDITOR"), "department"),
        };
    });

    return (
        <>
            <PageHeader title="Departments" subtitle="Departments covered by the annual audit plan." />

            <div className="card">
                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : !data?.departments.length ? (
                    <EmptyState title="No departments found" text="Run `python manage.py seed_demo` on the backend to create them." />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th className="num">Members</th>
                                    <th className="num">Auditors</th>
                                    <th className="num">Projects</th>
                                    <th className="num">Active checklists</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.departments.map((d) => (
                                    <tr key={d.id}>
                                        <td>
                                            <strong>{departmentLabel(d.name)}</strong>
                                            {departmentLabel(d.name) !== d.name && <span className="muted mono"> {d.name}</span>}
                                        </td>
                                        <td className="num">{data.members[d.name] || 0}</td>
                                        <td className="num">{data.auditors[d.name] || 0}</td>
                                        <td className="num">{data.projects[d.name] || 0}</td>
                                        <td className="num">{data.checklists[d.name] || 0}</td>
                                        <td>{formatDate(d.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="table-note muted">
                            Auditors can only audit departments other than their own.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
