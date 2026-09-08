from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from Backend.employees.models import Employee


class Command(BaseCommand):
    help = "Create 100 dummy employees with login accounts"

    def handle(self, *args, **kwargs):

        departments = [
            "IT",
            "HR",
            "Finance",
            "Marketing",
            "Engineering"
        ]

        projects = [
            "Project Alpha",
            "Project Beta",
            "Project Gamma",
            "Project Delta"
        ]

        roles = [
            "Software Engineer",
            "Manager",
            "Team Lead",
            "HR Executive",
            "Developer"
        ]

        for i in range(1, 101):

            username = f"employee{i}"
            password = f"Employee@{i}123"

            user = User.objects.create_user(
                username=username,
                password=password
            )

            Employee.objects.create(
                user=user,
                name=f"Employee {i}",
                email=f"employee{i}@company.com",
                contact=f"987650{i:04d}",
                project=projects[(i - 1) % len(projects)],
                department=departments[(i - 1) % len(departments)],
                role=roles[(i - 1) % len(roles)]
            )

        self.stdout.write(
            self.style.SUCCESS(
                "100 employees and their login accounts created successfully!"
            )
        )