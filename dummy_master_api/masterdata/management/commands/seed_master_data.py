from django.core.management.base import BaseCommand
from masterdata.models import Department, Project, Employee


class Command(BaseCommand):
    help = "Creates dummy master data for departments, projects and employees."

    def handle(self, *args, **kwargs):

        # Departments
        departments_data = [
            ("DEPT001", "IT"),
            ("DEPT002", "HR"),
            ("DEPT003", "Finance"),
            ("DEPT004", "Quality"),
            ("DEPT005", "Operations"),
        ]

        departments = {}

        for code, name in departments_data:
            department, created = Department.objects.get_or_create(
                department_code=code,
                defaults={"name": name}
            )

            departments[code] = department

        self.stdout.write(
            self.style.SUCCESS("Departments created/loaded.")
        )

        # Projects
        projects_data = [
            ("PROJ001", "Project Alpha", "Internal Software Project", "DEPT001"),
            ("PROJ002", "Project Beta", "Mobile Application Project", "DEPT001"),
            ("PROJ003", "Project Gamma", "Recruitment Management Project", "DEPT002"),
            ("PROJ004", "Project Delta", "Employee Management Project", "DEPT002"),
            ("PROJ005", "Project Epsilon", "Financial Reporting Project", "DEPT003"),
            ("PROJ006", "Project Zeta", "Budget Management Project", "DEPT003"),
            ("PROJ007", "Project Eta", "Quality Compliance Project", "DEPT004"),
            ("PROJ008", "Project Theta", "Audit Management Project", "DEPT004"),
            ("PROJ009", "Project Iota", "Operations Automation Project", "DEPT005"),
            ("PROJ010", "Project Kappa", "Process Improvement Project", "DEPT005"),
        ]

        projects = {}

        for code, name, description, department_code in projects_data:
            project, created = Project.objects.get_or_create(
                project_code=code,
                defaults={
                    "name": name,
                    "description": description,
                    "department": departments[department_code],
                }
            )

            projects[code] = project

        self.stdout.write(
            self.style.SUCCESS("Projects created/loaded.")
        )

        # Employees
        roles = [
            "Software Engineer",
            "Senior Software Engineer",
            "Project Manager",
            "Team Lead",
            "Analyst",
        ]

        department_codes = list(departments.keys())
        project_codes = list(projects.keys())

        for i in range(1, 101):

            employee_code = f"EMP{i:03d}"

            department_code = department_codes[(i - 1) % len(department_codes)]
            department = departments[department_code]

            employee, created = Employee.objects.get_or_create(
                employee_code=employee_code,
                defaults={
                    "name": f"Employee {i}",
                    "email": f"employee{i}@company.com",
                    "contact": f"987650{i:04d}",
                    "role": roles[(i - 1) % len(roles)],
                    "department": department,
                }
            )

            # Assign employee to a project
            project_code = project_codes[(i - 1) % len(project_codes)]
            project = projects[project_code]

            employee.projects.add(project)

        self.stdout.write(
            self.style.SUCCESS("100 employees created/loaded.")
        )

        self.stdout.write(
            self.style.SUCCESS("Dummy master data setup complete!")
        )