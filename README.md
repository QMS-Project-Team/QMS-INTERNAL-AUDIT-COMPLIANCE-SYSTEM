# QMS-INTERNAL-AUDIT-COMPLIANCE-SYSTEM
Full-Stack project using React and Django REST Framework

## Running locally

Requires Python 3.12+ and Node.js 20.19+ (or 22.12+).

### Backend (http://127.0.0.1:8000)

```bash
cd Backend
python -m venv env
env\Scripts\activate.bat            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

celery -A config worker --loglevel=INFO --pool=solo // issue for not reconnecting can be multiple port
```

`Backend/db.sqlite3` is committed with the shared dev data. To load users into an empty database run
`python manage.py import_dummy_users dummy_users.csv`. Run the tests with `python manage.py test`.

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
| director1 / director2 | Director | QA / DEV |
| qms1 | QMS | ADMIN |
| employee1 … employee7 | Employee | DEV, HR, ADMIN, QA, DEV, HR, ADMIN |

## Audit flow in the UI

Follows *QMS Backend Flow and API Documentation* (Backend 8). Roles: Director, QMS, Employee. There is no
permanent auditor role: an employee audits only while assigned to an audit.

1. **Director**: create projects, add employees as members, mark exactly one **Primary** and one **Secondary POC**
   (plus any Additional POCs). Director or QMS maintain the master checklists per framework and department.
2. **QMS**: create the audit (project + framework + dates). The department comes from the project and the matching
   active checklist is copied into the audit. Then assign a Primary and a Secondary auditor from the *eligible
   auditors*: POCs of other projects who aren't on another open audit. The audit becomes Assigned.
3. **Assigned auditors**: complete orientation.
4. **QMS**: schedule the audit (T-15 / T-7 dates are derived), record the Combined and Individual confirmations.
5. **Auditor**: start the audit and evaluate each checklist item. A non-compliant item opens an NC; the auditor fills
   the finding and risk action.
6. **Audited team** (members of the audited project): fill correction, corrective and preventive action.
7. **QMS**: accept the NC or request rework. After acceptance the auditor marks the item compliant.
8. **QMS**: close the audit once every item is compliant and every NC is accepted.

## API additions beyond the backend documentation

- `GET /api/audits/<id>/ncs/`: list an audit's NCs (same visibility as `GET /ncs/<id>/`). Without it the
  frontend has no way to find NC ids.
- Employees also see audits of the project they belong to, so the audited team can reach its NCs
  ("access based on assignment or audited-project membership").
- The audit `progress` summary also reports checklist results (compliant / non-compliant / pending) and NC counts
  (awaiting action, awaiting verification, rework required, accepted) for dashboards and the closure step.


set EMAIL_HOST_USER=harjotkaur1242@gmail.com
set EMAIL_HOST_PASSWORD=hpkqmkdcuwezlacf


from django.core.mail import send_mail
from django.conf import settings

send_mail(
    "QMS Email Test",
    "Testing email delivery from the QMS system.",
    settings.DEFAULT_FROM_EMAIL,
    ["kaurharjot127@gmail.com"],
    fail_silently=False,
)

import os

print("Username:", repr(os.environ.get("EMAIL_HOST_USER")))
print("Password configured:", bool(os.environ.get("EMAIL_HOST_PASSWORD")))
print("Password length:", len(os.environ.get("EMAIL_HOST_PASSWORD", "")))