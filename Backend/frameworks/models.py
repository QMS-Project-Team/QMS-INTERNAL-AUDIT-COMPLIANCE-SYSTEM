from django.db import models
from accounts.models import User,Department


class Framework(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    code = models.CharField(
        max_length=50,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.code} - {self.name}"


class Checklist(models.Model):

    framework = models.ForeignKey(
        Framework,
        on_delete=models.PROTECT,
        related_name="checklists"
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="checklists"
    )

    name = models.CharField(
        max_length=150
    )

    description = models.TextField(
        blank=True
    )

    is_active = models.BooleanField(
        default=True
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
                fields=["framework", "department"],
                name="unique_framework_department_checklist"
            )
        ]

    def __str__(self):
        return f"{self.framework.code} - {self.department} - {self.name}"


class ChecklistItem(models.Model):

    checklist = models.ForeignKey(
        Checklist,
        on_delete=models.CASCADE,
        related_name="items"
    )

    question = models.TextField()

    item_code = models.CharField(
        max_length=50
    )

    order = models.PositiveIntegerField(
        default=1
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.item_code} - {self.question[:50]}"