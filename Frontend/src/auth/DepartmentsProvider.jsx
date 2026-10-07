import { useEffect, useState } from "react";
import { departmentsApi } from "../api/endpoints";
import { setDepartments } from "../constants";
import { Loading } from "../components/ui";

/** Loads departments once after login so departmentLabel(id) works everywhere. */
export default function DepartmentsProvider({ children }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        departmentsApi
            .list()
            .then(setDepartments)
            // Pages still render; unknown ids show as "#id".
            .catch(() => setDepartments([]))
            .finally(() => setReady(true));
    }, []);

    return ready ? children : <Loading label="Loading…" />;
}
