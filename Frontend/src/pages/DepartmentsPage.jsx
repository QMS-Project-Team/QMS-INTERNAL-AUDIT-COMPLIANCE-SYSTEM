import { authApi, checklistsApi, departmentsApi, projectsApi } from "../api/endpoints";
import useLoad from "../hooks/useLoad";
import { EmptyState, ErrorBox, Loading, PageHeader } from "../components/ui";
import { ROLES } from "../constants";

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
            people: countBy(users, "department"),
            employees: countBy(users.filter((u) => u.role === ROLES.EMPLOYEE), "department"),
        };
    });

    return (
        <>
            <PageHeader
                title="Departments"
                subtitle="Active departments. Projects, checklists and audits each belong to one department."
            />

            <div className="card">
                <ErrorBox message={error} onRetry={reload} />
                {loading && !data ? (
                    <Loading />
                ) : !data?.departments.length ? (
                    <EmptyState title="No departments found" text="Departments are created in the Django admin." />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th className="num">People</th>
                                    <th className="num">Employees</th>
                                    <th className="num">Projects</th>
                                    <th className="num">Active checklists</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.departments.map((d) => (
                                    <tr key={d.id}>
                                        <td><strong>{d.name}</strong></td>
                                        <td className="num">{data.people[d.id] || 0}</td>
                                        <td className="num">{data.employees[d.id] || 0}</td>
                                        <td className="num">{data.projects[d.id] || 0}</td>
                                        <td className="num">{data.checklists[d.id] || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="table-note muted">
                            Project counts include only the projects you can see. Departments are managed in the Django admin.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
