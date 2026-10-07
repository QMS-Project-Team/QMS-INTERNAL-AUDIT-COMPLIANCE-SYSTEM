from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User,Department
from frameworks.models import Checklist, ChecklistItem, Framework
from projects.models import Project,ProjectMember

from .models import Audit, AuditSchedule,AuditorOrientation


def make_user(username, role, department):
    return User.objects.create_user(
        username=username,
        password="pw",
        employee_id=username.upper(),
        role=role,
        department=department,
    )


class AuditFlowTests(TestCase):
    """End-to-end audit workflow through the API, as the frontend drives it."""

    def setUp(self):
        self.qa = Department.objects.create(
            name="QA"
        )

        self.dev = Department.objects.create(
            name="DEV"
        )

        self.hr = Department.objects.create(
            name="HR"
        )

        self.admin = Department.objects.create(
            name="ADMIN"
        )


        self.director = make_user(
            "director",
            User.Role.DIRECTOR,
            self.qa,
        )

        self.qms = make_user(
            "qms",
            User.Role.QMS,
            self.admin,
        )

        # Employees who will become auditors through assignment
        self.auditor1 = make_user(
            "aud1",
            User.Role.EMPLOYEE,
            self.dev,
        )

        self.auditor2 = make_user(
            "aud2",
            User.Role.EMPLOYEE,
            self.hr,
        )

        self.qa_employee = make_user(
            "qaemp",
            User.Role.EMPLOYEE,
            self.qa,
        )

        self.framework = Framework.objects.create(
            name="ISO 9001",
            code="ISO9001",
        )

        checklist = Checklist.objects.create(
            framework=self.framework,
            department=self.qa,
            name="QA checklist",
        )

        ChecklistItem.objects.create(
            checklist=checklist,
            item_code="1",
            question="q1",
            order=1,
        )

        ChecklistItem.objects.create(
            checklist=checklist,
            item_code="2",
            question="q2",
            order=2,
        )

        self.project = Project.objects.create(
            project_code="P1",
            name="Project",
            department=self.qa,
            project_owner=self.director,
        )

        # The audited project must have exactly one Primary
        # and exactly one Secondary POC.
        ProjectMember.objects.create(
            project=self.project,
            employee=self.qa_employee,
            poc_type=ProjectMember.POCType.PRIMARY,
        )

        self.project2 = Project.objects.create(
            project_code="P2",
            name="Auditor Project",
            department=self.dev,
            project_owner=self.director,
        )

        ProjectMember.objects.create(
            project=self.project2,
            employee=self.auditor1,
            poc_type=ProjectMember.POCType.PRIMARY,
        )

        self.project3 = Project.objects.create(
            project_code="P3",
            name="Second Auditor Project",
            department=self.hr,
            project_owner=self.director,
        )

        ProjectMember.objects.create(
            project=self.project3,
            employee=self.auditor2,
            poc_type=ProjectMember.POCType.SECONDARY,
        )

        # Add a Secondary POC to the audited project.
        secondary_employee = make_user(
            "qaemp2",
            User.Role.EMPLOYEE,
            self.qa,
        )

        ProjectMember.objects.create(
            project=self.project,
            employee=secondary_employee,
            poc_type=ProjectMember.POCType.SECONDARY,
        )

        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    def create_audit(self):
        response = self.as_user(self.qms).post("/api/audits/", {
            "audit_code": "A1",
            "project": self.project.id,
            "framework": self.framework.id,
            "planned_start_date": "2026-10-10",
            "planned_end_date": "2026-10-12",
        })
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]


    def test_full_flow_to_confirmed_schedule(self):
        audit_id = self.create_audit()

        qms = self.as_user(self.qms)
        assign_url = f"/api/audits/{audit_id}/assignments/"
        self.assertEqual(qms.post(assign_url, {"auditor": self.auditor1.id, "assignment_type": "PRIMARY"}).status_code, 201)
        self.assertEqual(qms.post(assign_url, {"auditor": self.auditor2.id, "assignment_type": "SECONDARY"}).status_code, 201)

        duplicate = qms.post(assign_url, {"auditor": self.auditor2.id, "assignment_type": "PRIMARY"})
        self.assertEqual(duplicate.status_code, 400)


        # Schedule and confirmations take only the documented body fields.
        schedule = qms.post(f"/api/audits/{audit_id}/schedule/", {
            "scheduled_start": "2026-10-10T09:00:00Z",
            "scheduled_end": "2026-10-10T17:00:00Z",
        })
        self.assertEqual(schedule.status_code, 201, schedule.data)

        moved = qms.patch(
            f"/api/audits/{audit_id}/schedule/{schedule.data['id']}/",
            {"scheduled_start": "2026-10-10T10:00:00Z"},
        )
        self.assertEqual(moved.status_code, 200, moved.data)

        backwards = qms.patch(
            f"/api/audits/{audit_id}/schedule/{schedule.data['id']}/",
            {"scheduled_end": "2026-10-10T08:00:00Z"},
        )
        self.assertEqual(backwards.status_code, 400)

        for kind in ("COMBINED", "INDIVIDUAL"):
            response = qms.post(f"/api/audits/{audit_id}/confirmations/", {"confirmation_type": kind})
            self.assertEqual(response.status_code, 201, response.data)

        self.assertEqual(
            AuditSchedule.objects.get(audit_id=audit_id).status,
            AuditSchedule.Status.CONFIRMED,
        )

        # QMS list carries the workflow summary.
        audit = qms.get("/api/audits/").data[0]
        self.assertEqual(audit["progress"]["schedule"]["status"], "CONFIRMED")
        self.assertEqual(audit["progress"]["confirmations"], ["COMBINED", "INDIVIDUAL"])
        self.assertEqual(audit["progress"]["checklist"]["item_count"], 2)
        self.assertEqual(audit["progress"]["orientations_completed"], 0)
        self.assertIsNone(audit["my_assignment"])

        # Auditors see only their own audits, with their assignment.
        auditor = self.as_user(self.auditor1)
        mine = auditor.get("/api/audits/").data
        self.assertEqual([a["id"] for a in mine], [audit_id])
        self.assertEqual(mine[0]["my_assignment"]["assignment_type"], "PRIMARY")

        # Starting needs orientation first, then works.
        auditor = self.as_user(self.auditor1)
        self.assertEqual(auditor.post(f"/api/audits/{audit_id}/start/").status_code, 400)
        orientation_id = mine[0]["my_assignment"]["orientation_id"]
        print("AUDITOR1 ID:", self.auditor1.id)
        print("ORIENTATION ID:", orientation_id)
        print(
            "ORIENTATION AUDITOR:",
            AuditorOrientation.objects.get(id=orientation_id).assignment.auditor_id
)
        orientation_response = auditor.post(
            f"/api/orientations/{orientation_id}/complete/"
        )

        print("ORIENTATION RESPONSE:", orientation_response.status_code)
        print("ORIENTATION DATA:", orientation_response.data)

        self.assertEqual(
            orientation_response.status_code,
            200,
            orientation_response.data
        )
        started = auditor.post(f"/api/audits/{audit_id}/start/")
        self.assertEqual(started.status_code, 200, started.data)
        self.assertEqual(started.data["status"], "IN_PROGRESS")

        checklist = auditor.get(f"/api/audits/{audit_id}/checklist/")
        self.assertEqual(checklist.status_code, 200, checklist.data)
        self.assertEqual(len(checklist.data["items"]), 2)

    def start_audit(self):
        """Create, assign, orient, schedule, confirm and start an audit."""
        audit_id = self.create_audit()
        qms = self.as_user(self.qms)
        url = f"/api/audits/{audit_id}"
        qms.post(f"{url}/assignments/", {"auditor": self.auditor1.id, "assignment_type": "PRIMARY"})
        qms.post(f"{url}/assignments/", {"auditor": self.auditor2.id, "assignment_type": "SECONDARY"})
        qms.post(f"{url}/schedule/", {
            "scheduled_start": "2026-10-10T09:00:00Z",
            "scheduled_end": "2026-10-10T17:00:00Z",
        })
        for kind in ("COMBINED", "INDIVIDUAL"):
            qms.post(f"{url}/confirmations/", {"confirmation_type": kind})

        auditor = self.as_user(self.auditor1)
        orientation_id = auditor.get(f"{url}/").data["my_assignment"]["orientation_id"]
        auditor.post(f"/api/orientations/{orientation_id}/complete/")
        self.assertEqual(auditor.post(f"{url}/start/").status_code, 200)
        return audit_id

    def test_nc_lifecycle_to_closure(self):
        audit_id = self.start_audit()
        url = f"/api/audits/{audit_id}"
        team_member = self.qa_employee  # member of the audited project

        # The audited team can see its own project's audit (not as an auditor).
        team_view = self.as_user(team_member).get("/api/audits/").data
        self.assertEqual([a["id"] for a in team_view], [audit_id])
        self.assertIsNone(team_view[0]["my_assignment"])

        # Auditor evaluates: item 1 compliant, item 2 non-compliant (opens an NC).
        auditor = self.as_user(self.auditor1)
        items = auditor.get(f"{url}/checklist/").data["items"]
        first, second = sorted(items, key=lambda i: i["order"])
        self.assertEqual(auditor.patch(f"{url}/checklist-items/{first['id']}/", {"result": "COMPLIANT"}, format="json").status_code, 200)
        self.assertEqual(auditor.patch(f"{url}/checklist-items/{second['id']}/", {"result": "NON_COMPLIANT", "remarks": "No record"}, format="json").status_code, 200)

        # NCs are listable by the auditor, the audited team and QMS, but not the director.
        ncs = auditor.get(f"{url}/ncs/").data
        self.assertEqual(len(ncs), 1)
        nc_id = ncs[0]["id"]
        self.assertEqual(ncs[0]["checklist_item_id"], second["id"])
        self.assertEqual(len(self.as_user(team_member).get(f"{url}/ncs/").data), 1)
        self.assertEqual(len(self.as_user(self.qms).get(f"{url}/ncs/").data), 1)
        self.assertEqual(self.as_user(self.director).get(f"{url}/ncs/").data, [])

        progress = self.as_user(self.qms).get(f"{url}/").data["progress"]
        self.assertEqual(
            {k: progress["checklist"][k] for k in ("compliant", "non_compliant", "pending")},
            {"compliant": 1, "non_compliant": 1, "pending": 0},
        )
        self.assertEqual(progress["ncs"]["awaiting_action"], 1)

        # Auditor: finding + risk action. Team: corrective actions.
        auditor = self.as_user(self.auditor1)
        self.assertEqual(auditor.patch(f"{url}/ncs/{nc_id}/", {"finding": "Missing record", "risk_action": "Monitor"}, format="json").status_code, 200)
        team = self.as_user(team_member)
        self.assertEqual(team.patch(f"{url}/ncs/{nc_id}/", {"correction": "Recorded", "corrective_action": "Checklist step"}, format="json").status_code, 200)
        self.assertEqual(self.as_user(self.qms).get(f"{url}/").data["progress"]["ncs"]["awaiting_verification"], 1)

        # QMS: rework, then accept.
        qms = self.as_user(self.qms)
        self.assertEqual(qms.patch(f"{url}/ncs/{nc_id}/", {"status": "REWORK_REQUIRED", "verification_remarks": "Add evidence"}, format="json").status_code, 200)
        self.assertEqual(qms.get(f"{url}/").data["progress"]["ncs"]["rework_required"], 1)
        self.assertEqual(qms.post(f"{url}/close/").status_code, 400)
        self.assertEqual(qms.patch(f"{url}/ncs/{nc_id}/", {"status": "ACCEPTED"}, format="json").status_code, 200)

        # Auditor re-checks the item, then QMS closes.
        auditor = self.as_user(self.auditor1)
        self.assertEqual(auditor.patch(f"{url}/checklist-items/{second['id']}/", {"result": "COMPLIANT"}, format="json").status_code, 200)
        closed = self.as_user(self.qms).post(f"{url}/close/")
        self.assertEqual(closed.status_code, 200, closed.data)
        self.assertEqual(Audit.objects.get(id=audit_id).status, Audit.Status.CLOSED)

    def test_deleting_project_in_use_returns_409(self):
        self.create_audit()

        self.as_user(self.director)

        response = self.client.delete(
            f"/api/projects/{self.project.id}/"
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("still in use", response.data["detail"])


    def test_only_qms_can_create_audit(self):
    # Director cannot create
        self.client.force_authenticate(user=self.director)

        response = self.client.post(
            "/api/audits/",
            {
                "audit_code": "DIRECTOR-AUDIT",
                "project": self.project.id,
                "framework": self.framework.id,
                "planned_start_date": "2026-10-10",
                "planned_end_date": "2026-10-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

        # Employee cannot create
        self.client.force_authenticate(user=self.auditor1)

        response = self.client.post(
            "/api/audits/",
            {
                "audit_code": "EMPLOYEE-AUDIT",
                "project": self.project.id,
                "framework": self.framework.id,
                "planned_start_date": "2026-10-10",
                "planned_end_date": "2026-10-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)


    def test_audit_department_is_derived_from_project(self):
        self.client.force_authenticate(user=self.qms)

        response = self.client.post(
            "/api/audits/",
            {
                "audit_code": "DEPT-TEST",
                "project": self.project.id,
                "framework": self.framework.id,
                "planned_start_date": "2026-10-10",
                "planned_end_date": "2026-10-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        audit = Audit.objects.get(audit_code="DEPT-TEST")

        self.assertEqual(
            audit.department_id,
            self.project.department_id
        )


    def test_client_cannot_override_audit_department(self):
        self.client.force_authenticate(user=self.qms)

        # Project is QA, but we try to send DEV as department.
        response = self.client.post(
            "/api/audits/",
            {
                "audit_code": "OVERRIDE-DEPT",
                "project": self.project.id,
                "framework": self.framework.id,
                "department": self.dev.id,
                "planned_start_date": "2026-10-10",
                "planned_end_date": "2026-10-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        audit = Audit.objects.get(audit_code="OVERRIDE-DEPT")

        # Must still use project's department.
        self.assertEqual(
            audit.department_id,
            self.project.department_id
        )


    def test_audit_creation_creates_correct_checklist(self):
        self.client.force_authenticate(user=self.qms)

        response = self.client.post(
            "/api/audits/",
            {
                "audit_code": "CHECKLIST-TEST",
                "project": self.project.id,
                "framework": self.framework.id,
                "planned_start_date": "2026-10-10",
                "planned_end_date": "2026-10-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        audit = Audit.objects.get(audit_code="CHECKLIST-TEST")

        audit_checklist = audit.audit_checklist

        self.assertEqual(
            audit_checklist.checklist.framework_id,
            self.framework.id
        )

        self.assertEqual(
            audit_checklist.checklist.department_id,
            self.project.department_id
        )

        self.assertEqual(
            audit_checklist.items.count(),
            2
        )
