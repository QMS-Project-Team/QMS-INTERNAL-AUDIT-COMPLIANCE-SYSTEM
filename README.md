# QMS-INTERNAL-AUDIT-COMPLIANCE-SYSTEM
Full-Stack project using React and Django REST Framework

## Running locally

Requires Python 3.12+ and Node.js 20.19+ (or 22.12+).

### Backend (http://127.0.0.1:8000)

```bash
cd Backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo       # departments, frameworks, checklists + items, demo users
python manage.py runserver
```

`seed_demo` is safe to re-run. Run the tests with `python manage.py test`.

### Frontend (http://localhost:5173)

```bash
cd Frontend
npm install
npm run dev
```

The API URL defaults to `http://127.0.0.1:8000/api`; override it with `VITE_API_URL`.

### Demo logins

All demo users share the password `Password@123`.

| Username | Role | Department |
| --- | --- | --- |
| director1 | Director | QA |
| manager1 | Manager | DEV |
| qms1 | QMS | ADMIN |
| auditor1 / auditor2 / auditor3 | Auditor | DEV / HR / ADMIN |
| member1 … member4 | Team member | QA / DEV / HR / ADMIN |

## Audit flow in the UI

1. **Director / Manager**: create a project, plan an audit (framework + department), nominate at least two auditors from other departments, then **Submit to QMS**.
2. **QMS**: open the audit, assign a PRIMARY and a SECONDARY auditor from the nominees, then **Complete assignment**. This attaches the active checklist for the audit's framework and department.
3. **Auditors**: mark their orientation complete from the dashboard.
4. **QMS**: verify orientations, schedule the audit, and record the combined (T-15) and individual (T-7) confirmations. The schedule then becomes Confirmed.

Audit execution, evidence, findings/NCs, corrective actions and reports are not implemented on the backend yet.

## API additions beyond the API reference

- `GET /api/auth/users/?role=&department=`: read-only user directory for the nomination and assignment pickers.
- Audit objects include read-only `progress` (nominations, assigned auditors + orientation status, checklist, schedule, confirmations) and `my_assignment` (the requesting auditor's own assignment). These power the QMS and auditor dashboards without one request per audit.
- Auditors can list and open the audits they are assigned to, which also makes the existing `POST /api/audits/<id>/start/` and `GET /api/audits/<id>/checklist/` reachable for them.
- `/api/checklists/<id>/items/` (+ `/<item_id>/`): CRUD for master checklist items.
- Checklist create/update/delete is allowed for **Director** as well as QMS. Frameworks remain QMS-only.
- Deleting a record that is still referenced (e.g. a project with audits) returns `409` with a message instead of a `500`.
- Schedule and confirmation POSTs take only the documented body fields (`audit` / `schedule` are set by the server), and duplicate nominations/assignments return `400`.
