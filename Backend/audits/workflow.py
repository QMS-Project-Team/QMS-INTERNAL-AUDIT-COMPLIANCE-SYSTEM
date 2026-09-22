from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from employees.models import Employee
from team.services import get_employees, get_projects


def current_employee(request):
    try:
        employee = request.user.employee
    except Employee.DoesNotExist:
        raise ValidationError({'message': 'Authenticated user is not linked to an employee profile.'})
    return employee


def master_employees():
    data = get_employees()
    if not isinstance(data, list):
        raise ValidationError({'message': 'Master employee service returned an unexpected format.'})
    return data


def master_employee_by_code(code):
    for item in master_employees():
        if item.get('employee_code') == code:
            return item
    return None


def resolve_current_employee_code(request):
    employee = current_employee(request)
    username = request.user.username
    for item in master_employees():
        if item.get('email') == employee.email or item.get('name') == employee.name:
            return item.get('employee_code'), item
    # A superuser can operate without a master employee identity.
    if request.user.is_superuser:
        return username, {'employee_code': username, 'name': employee.name, 'department': employee.department}
    raise ValidationError({'message': 'Your employee account is not mapped to the external master employee service.'})


def audit_deadlines(audit):
    start = audit.scheduled_start
    if not start:
        return {}
    return {
        't_minus_30': start - timedelta(days=30),
        't_minus_20': start - timedelta(days=20),
        't_minus_15': start - timedelta(days=15),
        't_minus_7': start - timedelta(days=7),
        'audit_deadline': start + timedelta(days=15),
        'nc_deadline': start + timedelta(days=10),
    }


def assert_auditor_allowed(audit, employee_code, existing_codes=None):
    employee = master_employee_by_code(employee_code)

    if not employee:
        raise ValidationError({
            'employee_code': 'Employee code does not exist in the master employee service.'
        })

    # Master API returns the employee department as a numeric ID.
    # Resolve that ID to the department_code used by the Audit.
    department_id = employee.get('department')

    if department_id is not None:
        departments = __import__('team.services', fromlist=['get_departments']).get_departments()

        department = next(
            (
                item for item in departments
                if item.get('id') == department_id
            ),
            None,
        )

        if department and department.get('department_code') == audit.department_code:
            raise ValidationError({
                'employee_code': 'An auditor cannot audit their own department.'
            })

    existing_codes = existing_codes or set()

    if employee_code in existing_codes:
        raise ValidationError({
            'employee_code': 'This employee is already assigned to this audit.'
        })

    if audit.project_code:
        project_ids = set(employee.get('projects') or [])

        for project in get_projects():
            if (
                project.get('project_code') == audit.project_code
                and project.get('id') in project_ids
            ):
                raise ValidationError({
                    'employee_code': 'Auditor has a project conflict with the audit project.'
                })

    return employee


def record_event(audit, event_type, message, request=None, employee_code=''):
    from .models import AuditEvent
    username = request.user.username if request is not None else ''
    AuditEvent.objects.create(audit=audit, event_type=event_type, actor_employee_code=employee_code, actor_username=username, message=message)
