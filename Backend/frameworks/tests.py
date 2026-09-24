from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

from .models import Checklist, Framework


def make_user(username, role):
    return User.objects.create_user(
        username=username, password="pw", employee_id=username.upper(), role=role, department="QA"
    )


class ChecklistPermissionTests(TestCase):

    def setUp(self):
        self.framework = Framework.objects.create(name="ISO 9001", code="ISO9001")
        self.client = APIClient()

    def create_checklist(self, user):
        self.client.force_authenticate(user)
        return self.client.post("/api/checklists/", {
            "framework": self.framework.id, "department": "QA", "name": "QA checklist",
        })

    def test_director_and_qms_can_write_checklists(self):
        for role in ("DIRECTOR", "QMS"):
            self.assertEqual(self.create_checklist(make_user(role.lower(), role)).status_code, 201)

    def test_manager_and_auditor_cannot_write_checklists(self):
        for role in ("MANAGER", "AUDITOR"):
            self.assertEqual(self.create_checklist(make_user(role.lower(), role)).status_code, 403)

    def test_director_cannot_write_frameworks(self):
        self.client.force_authenticate(make_user("director", "DIRECTOR"))
        response = self.client.post("/api/frameworks/", {"name": "X", "code": "X"})
        self.assertEqual(response.status_code, 403)


class ChecklistItemTests(TestCase):

    def setUp(self):
        framework = Framework.objects.create(name="ISO 9001", code="ISO9001")
        self.checklist = Checklist.objects.create(framework=framework, department="QA", name="QA")
        self.url = f"/api/checklists/{self.checklist.id}/items/"
        self.client = APIClient()
        self.client.force_authenticate(make_user("director", "DIRECTOR"))

    def test_item_crud(self):
        created = self.client.post(self.url, {"item_code": "1", "question": "Documented?", "order": 1})
        self.assertEqual(created.status_code, 201, created.data)
        item_url = f"{self.url}{created.data['id']}/"

        self.assertEqual(self.client.patch(item_url, {"question": "Documented and current?"}).status_code, 200)
        self.assertEqual(
            self.client.get(f"/api/checklists/{self.checklist.id}/").data["items"][0]["question"],
            "Documented and current?",
        )
        self.assertEqual(self.client.delete(item_url).status_code, 204)
        self.assertEqual(self.client.get(self.url).data, [])

    def test_auditor_cannot_add_items(self):
        self.client.force_authenticate(make_user("aud", "AUDITOR"))
        response = self.client.post(self.url, {"item_code": "1", "question": "q", "order": 1})
        self.assertEqual(response.status_code, 403)
