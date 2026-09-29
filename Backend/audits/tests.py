from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from frameworks.models import Checklist, ChecklistItem, Framework
from projects.models import Project

from .models import Audit, AuditSchedule


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
        self.director = make_user("director", "DIRECTOR", "QA")
        self.qms = make_user("qms", "QMS", "ADMIN")
        self.auditor1 = make_user("aud1", "AUDITOR", "DEV")
        self.auditor2 = make_user("aud2", "AUDITOR", "HR")
        self.qa_auditor = make_user("aud3", "AUDITOR", "QA")

        self.framework = Framework.objects.create(name="ISO 9001", code="ISO9001")
        checklist = Checklist.objects.create(
            framework=self.framework, department="QA", name="QA checklist"
        )
        ChecklistItem.objects.create(checklist=checklist, item_code="1", question="q1", order=1)
        ChecklistItem.objects.create(checklist=checklist, item_code="2", question="q2", order=2)

        self.project = Project.objects.create(
            project_code="P1", name="Project", department="QA", project_owner=self.director
        )

        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    def create_audit(self):
        response = self.as_user(self.director).post("/api/audits/", {
            "audit_code": "A1",
            "project": self.project.id,
            "department": "QA",
            "framework": self.framework.id,
            "planned_start_date": "2026-10-10",
            "planned_end_date": "2026-10-12",
        })
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def test_duplicate_nomination_is_rejected_cleanly(self):
        audit_id = self.create_audit()
        url = f"/api/audits/{audit_id}/nominations/"

        self.assertEqual(self.client.post(url, {"auditor": self.auditor1.id}).status_code, 201)
        response = self.client.post(url, {"auditor": self.auditor1.id})

        self.assertEqual(response.status_code, 400)
        self.assertIn("already nominated", str(response.data))

    def test_own_department_auditor_cannot_be_nominated(self):
        audit_id = self.create_audit()
        response = self.client.post(
            f"/api/audits/{audit_id}/nominations/", {"auditor": self.qa_auditor.id}
        )
        self.assertEqual(response.status_code, 400)

    def test_full_flow_to_confirmed_schedule(self):
        audit_id = self.create_audit()
        for auditor in (self.auditor1, self.auditor2):
            self.client.post(f"/api/audits/{audit_id}/nominations/", {"auditor": auditor.id})
        self.client.patch(f"/api/audits/{audit_id}/", {"status": "PENDING_ASSIGNMENT"})

        qms = self.as_user(self.qms)
        assign_url = f"/api/audits/{audit_id}/assignments/"
        self.assertEqual(qms.post(assign_url, {"auditor": self.auditor1.id, "assignment_type": "PRIMARY"}).status_code, 201)
        self.assertEqual(qms.post(assign_url, {"auditor": self.auditor2.id, "assignment_type": "SECONDARY"}).status_code, 201)

        duplicate = qms.post(assign_url, {"auditor": self.auditor2.id, "assignment_type": "PRIMARY"})
        self.assertEqual(duplicate.status_code, 400)

        completed = qms.post(f"/api/audits/{audit_id}/complete-assignment/", {})
        self.assertEqual(completed.status_code, 200, completed.data)
        self.assertEqual(completed.data["checklist_name"], "QA checklist")
        self.assertEqual(Audit.objects.get(id=audit_id).audit_checklist.items.count(), 2)

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
        self.assertEqual(audit["progress"]["nomination_count"], 2)
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
        self.assertEqual(self.as_user(self.qa_auditor).get("/api/audits/").data, [])

        # Starting needs orientation first, then works.
        auditor = self.as_user(self.auditor1)
        self.assertEqual(auditor.post(f"/api/audits/{audit_id}/start/").status_code, 400)
        orientation_id = mine[0]["my_assignment"]["orientation_id"]
        self.assertEqual(auditor.post(f"/api/orientations/{orientation_id}/complete/").status_code, 200)
        started = auditor.post(f"/api/audits/{audit_id}/start/")
        self.assertEqual(started.status_code, 200, started.data)
        self.assertEqual(started.data["status"], "IN_PROGRESS")

        checklist = auditor.get(f"/api/audits/{audit_id}/checklist/")
        self.assertEqual(checklist.status_code, 200, checklist.data)
        self.assertEqual(len(checklist.data["items"]), 2)

    def test_deleting_project_in_use_returns_409(self):
        self.create_audit()
        response = self.client.delete(f"/api/projects/{self.project.id}/")
        self.assertEqual(response.status_code, 409)
        self.assertIn("still in use", response.data["detail"])
