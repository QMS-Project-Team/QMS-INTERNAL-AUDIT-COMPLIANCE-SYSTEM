from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        DIRECTOR = "DIRECTOR", "Director"
        MANAGER = "MANAGER", "Manager"
        QMS = "QMS", "QMS"
        AUDITOR = "AUDITOR", "Auditor"
        TEAM_MEMBER = "TEAM_MEMBER", "Team Member"

    class Department(models.TextChoices):
        QA = "QA", "QA"
        DEV = "DEV", "Development"
        HR = "HR", "HR"
        ADMIN = "ADMIN", "Administration"

    employee_id = models.CharField(
        max_length=20,
        unique=True
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices
    )

    department = models.CharField(
        max_length=20,
        choices=Department.choices
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.username} - {self.role}"