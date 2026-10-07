from accounts.models import User,Department
from django.db import models


class Project(models.Model):

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    project_code = models.CharField(
        max_length=50,
        unique=True
    )

    name = models.CharField(
        max_length=150
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="projects"
    )

    project_owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="owned_projects"
    )

    description = models.TextField(
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.project_code} - {self.name}"


class ProjectMember(models.Model):

    class POCType(models.TextChoices):
        NONE = "NONE", "Not a POC"
        PRIMARY = "PRIMARY", "Primary POC"
        SECONDARY = "SECONDARY", "Secondary POC"
        ADDITIONAL = "ADDITIONAL", "Additional POC"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members"
    )

    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="project_memberships"
    )

    poc_type = models.CharField(
        max_length=20,
        choices=POCType.choices,
        default=POCType.NONE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "employee"],
                name="unique_project_employee"
            ),
            models.UniqueConstraint(
                fields=["employee"],
                name="unique_employee_project_membership"
            ),
            models.UniqueConstraint(
            fields=["project"],
            condition=models.Q(poc_type="PRIMARY"),
            name="unique_primary_poc_per_project"
            ),

            models.UniqueConstraint(
                fields=["project"],
                condition=models.Q(poc_type="SECONDARY"),
                name="unique_secondary_poc_per_project"
            ),
        ]

    def __str__(self):
        return f"{self.project.name} - {self.employee.username}"