from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from qms.models import Framework
from checklists.models import Checklist, ChecklistItem
from .models import Audit, AuditAssignment


class AuditWorkflowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='TestPass123!')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.framework = Framework.objects.create(code='NBA', name='NBA', version='1')
        self.checklist = Checklist.objects.create(
            framework=self.framework, department_code='DEPT001', department_name='IT',
            title='IT Audit Checklist', version='1.0'
        )
        ChecklistItem.objects.create(checklist=self.checklist, item_number=1, requirement='Requirement')

    def test_create_audit(self):
        response = self.client.post('/api/audits/', {
            'framework': self.framework.id,
            'checklist': self.checklist.id,
            'department_code': 'DEPT001',
            'audit_year': 2026,
            'cycle': 1,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Audit.objects.count(), 1)

    @patch('audits.workflow.get_employees')
    @patch('audits.workflow.get_projects')
    def test_assignment_rejects_own_department_and_accepts_cross_department(self, mock_projects, mock_employees):
        audit = Audit.objects.create(framework=self.framework, checklist=self.checklist,
            department_code='DEPT001', department_name='IT', audit_year=2026, cycle=1, created_by_username='tester')
        mock_projects.return_value = []
        mock_employees.return_value = [
            {'employee_code': 'EMP001', 'name': 'IT User', 'email': 'it@example.com', 'department': {'department_code': 'DEPT001'}},
            {'employee_code': 'EMP002', 'name': 'HR User', 'email': 'hr@example.com', 'department': {'department_code': 'DEPT002'}},
        ]
        bad = self.client.post(f'/api/audits/{audit.id}/assign/', {'employee_code': 'EMP001', 'assignment_type': 'primary'}, format='json')
        self.assertEqual(bad.status_code, 400)
        good = self.client.post(f'/api/audits/{audit.id}/assign/', {'employee_code': 'EMP002', 'assignment_type': 'primary'}, format='json')
        self.assertEqual(good.status_code, 201)
        self.assertTrue(AuditAssignment.objects.filter(employee_code='EMP002').exists())
