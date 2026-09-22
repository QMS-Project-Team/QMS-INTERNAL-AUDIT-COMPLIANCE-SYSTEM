from django.db import models
from qms.models import Framework


class Checklist(models.Model):
    """A department-specific checklist belonging to one compliance framework."""

    framework = models.ForeignKey(
        Framework,
        on_delete=models.PROTECT,
        related_name='checklists',
    )
    department_code = models.CharField(max_length=30)
    department_name = models.CharField(max_length=150)
    title = models.CharField(max_length=200)
    version = models.CharField(max_length=50, default='1.0')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['framework', 'department_name', 'title']
        constraints = [
            models.UniqueConstraint(
                fields=['framework', 'department_code', 'version'],
                name='unique_checklist_framework_department_version',
            ),
        ]

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    """One auditable question/requirement in a checklist."""

    class ResponseType(models.TextChoices):
        YES_NO = 'yes_no', 'Yes / No'
        TEXT = 'text', 'Text'
        NUMBER = 'number', 'Number'
        DATE = 'date', 'Date'

    checklist = models.ForeignKey(
        Checklist,
        on_delete=models.CASCADE,
        related_name='items',
    )
    item_number = models.PositiveIntegerField()
    requirement = models.TextField()
    guidance = models.TextField(blank=True)
    response_type = models.CharField(
        max_length=20,
        choices=ResponseType.choices,
        default=ResponseType.YES_NO,
    )
    is_mandatory = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'item_number', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['checklist', 'item_number'],
                name='unique_checklist_item_number',
            ),
        ]

    def __str__(self):
        return f"{self.checklist.title} - {self.item_number}"
