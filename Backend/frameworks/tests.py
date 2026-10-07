from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, Department

from .models import Checklist, Framework


class ChecklistPermissionTests(TestCase):

    def setUp(self):
        self.qa = Department.objects.create(name="QA")

        self.framework = Framework.objects.create(
            name="ISO 9001",
            code="ISO9001"
        )

        self.client = APIClient()

    def make_user(self, username, role):
        return User.objects.create_user(
            username=username,
            password="pw",
            employee_id=username.upper(),
            role=role,
            department=self.qa
        )

    def create_checklist(self, user):
        self.client.force_authenticate(user)

        return self.client.post(
            "/api/checklists/",
            {
                "framework": self.framework.id,
                "department": self.qa.id,
                "name": "QA checklist",
            },
            format="json"
        )

    def test_director_and_qms_can_write_checklists(self):
        director = self.make_user("director", "DIRECTOR")

        response = self.create_checklist(director)

        self.assertEqual(
            response.status_code,
            201,
            response.data
        )

        # QMS can also create a checklist,
        # but it must use a different department because
        # Framework + Department must be unique.
        dev = Department.objects.create(
            name="DEV"
        )

        qms = self.make_user("qms", "QMS")

        self.client.force_authenticate(qms)

        response = self.client.post(
            "/api/checklists/",
            {
                "framework": self.framework.id,
                "department": dev.id,
                "name": "DEV checklist",
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data
        )

    def test_employee_cannot_write_checklists(self):
        employee = self.make_user(
            "employee",
            "EMPLOYEE"
        )

        response = self.create_checklist(employee)

        self.assertEqual(
            response.status_code,
            403
        )

    def test_director_cannot_write_frameworks(self):
        director = self.make_user(
            "director",
            "DIRECTOR"
        )

        self.client.force_authenticate(director)

        response = self.client.post(
            "/api/frameworks/",
            {
                "name": "X",
                "code": "X"
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )


class ChecklistItemTests(TestCase):

    def setUp(self):
        self.qa = Department.objects.create(name="QA")

        framework = Framework.objects.create(
            name="ISO 9001",
            code="ISO9001"
        )

        self.checklist = Checklist.objects.create(
            framework=framework,
            department=self.qa,
            name="QA"
        )

        self.url = (
            f"/api/checklists/{self.checklist.id}/items/"
        )

        self.client = APIClient()

        director = User.objects.create_user(
            username="director",
            password="pw",
            employee_id="DIRECTOR",
            role="DIRECTOR",
            department=self.qa
        )

        self.client.force_authenticate(director)

    def test_item_crud(self):
        created = self.client.post(
            self.url,
            {
                "item_code": "1",
                "question": "Documented?",
                "order": 1
            },
            format="json"
        )

        self.assertEqual(
            created.status_code,
            201,
            created.data
        )

        item_url = f"{self.url}{created.data['id']}/"

        self.assertEqual(
            self.client.patch(
                item_url,
                {
                    "question": "Documented and current?"
                },
                format="json"
            ).status_code,
            200
        )

        self.assertEqual(
            self.client.get(
                f"/api/checklists/{self.checklist.id}/"
            ).data["items"][0]["question"],
            "Documented and current?"
        )

        self.assertEqual(
            self.client.delete(item_url).status_code,
            204
        )

        self.assertEqual(
            self.client.get(self.url).data,
            []
        )

    def test_employee_cannot_add_items(self):
        employee = User.objects.create_user(
            username="employee",
            password="pw",
            employee_id="EMPLOYEE",
            role="EMPLOYEE",
            department=self.qa
        )

        self.client.force_authenticate(employee)

        response = self.client.post(
            self.url,
            {
                "item_code": "1",
                "question": "q",
                "order": 1
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            403
        )