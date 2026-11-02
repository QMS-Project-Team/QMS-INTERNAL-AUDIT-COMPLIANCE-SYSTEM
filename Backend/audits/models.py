from django.core.exceptions import ValidationError
from datetime import timedelta
from django.conf import settings
from django.db import models

from accounts.models import User,Department
from projects.models import Project
from frameworks.models import Framework,Checklist,ChecklistItem


class Audit(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT", "Pending Assignment"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        PENDING_CLOSURE = "PENDING_CLOSURE", "Pending Closure"
        CLOSED = "CLOSED", "Closed"

    audit_code = models.CharField(
        max_length=50,
        unique=True
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.PROTECT,
        related_name="audits"
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="audits"
    )

    framework = models.ForeignKey(
        Framework,
        on_delete=models.PROTECT,
        related_name="audits"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_audits"
    )

    planned_start_date = models.DateField()

    planned_end_date = models.DateField()

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.audit_code} - {self.project.name}"



class AuditSchedule(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SCHEDULED = "SCHEDULED", "Scheduled"
        CONFIRMED = "CONFIRMED", "Confirmed"

    audit = models.OneToOneField(
        Audit,
        on_delete=models.CASCADE,
        related_name="schedule"
    )

    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    scheduled_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="audit_schedules_created"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.scheduled_end <= self.scheduled_start:
            raise ValidationError(
                "Scheduled end must be after scheduled start."
            )

    @property
    def t15_date(self):
        return self.scheduled_start - timedelta(days=15)

    @property
    def t7_date(self):
        return self.scheduled_start - timedelta(days=7)
    

    def __str__(self):
        return (
            f"{self.audit.audit_code} - "
            f"{self.scheduled_start}"
        )

class AuditorAssignment(models.Model):

    class AssignmentType(models.TextChoices):
        PRIMARY = "PRIMARY", "Primary"
        SECONDARY = "SECONDARY", "Secondary"

    audit = models.ForeignKey(
        Audit,
        on_delete=models.CASCADE,
        related_name="auditor_assignments"
    )

    auditor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="auditor_assignments"
    )

    assignment_type = models.CharField(
        max_length=20,
        choices=AssignmentType.choices
    )

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="assignments_created"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["audit", "auditor"],
                name="unique_auditor_assignment"
            ),
            models.UniqueConstraint(
                fields=["audit", "assignment_type"],
                name="unique_audit_assignment_type"
            ),
        ]

    def __str__(self):
        return (
            f"{self.audit.audit_code} - "
            f"{self.auditor.username} - "
            f"{self.assignment_type}"
        )


class AuditChecklist(models.Model):

    audit = models.OneToOneField(
        Audit,
        on_delete=models.CASCADE,
        related_name="audit_checklist"
    )

    checklist = models.ForeignKey(
        Checklist,
        on_delete=models.PROTECT,
        related_name="audit_checklists"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.audit.audit_code} - {self.checklist.name}"



class AuditChecklistItem(models.Model):

    class Result(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLIANT = "COMPLIANT", "Compliant"
        NON_COMPLIANT = "NON_COMPLIANT", "Non-Compliant"

    audit_checklist = models.ForeignKey(
        AuditChecklist,
        on_delete=models.CASCADE,
        related_name="items"
    )

    checklist_item = models.ForeignKey(
        ChecklistItem,
        on_delete=models.PROTECT,
        related_name="audit_items"
    )

    result = models.CharField(
        max_length=30,
        choices=Result.choices,
        default=Result.PENDING
    )

    remarks = models.TextField(
        blank=True
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
                fields=["audit_checklist", "checklist_item"],
                name="unique_audit_checklist_item"
            )
        ]

    def __str__(self):
        return (
            f"{self.audit_checklist.audit.audit_code} - "
            f"{self.checklist_item.item_code}"
        )


class AuditorOrientation(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"

    assignment = models.OneToOneField(
        AuditorAssignment,
        on_delete=models.CASCADE,
        related_name="orientation"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return (
            f"{self.assignment.audit.audit_code} - "
            f"{self.assignment.auditor.username} - "
            f"{self.status}"
        )


class AuditConfirmation(models.Model):

    class ConfirmationType(models.TextChoices):
        COMBINED = "COMBINED", "Combined"
        INDIVIDUAL = "INDIVIDUAL", "Individual"

    schedule = models.ForeignKey(
        AuditSchedule,
        on_delete=models.CASCADE,
        related_name="confirmations"
    )

    confirmation_type = models.CharField(
        max_length=20,
        choices=ConfirmationType.choices
    )

    confirmed_at = models.DateTimeField()

    confirmed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="audit_confirmations_created"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "confirmation_type"],
                name="unique_schedule_confirmation_type"
            )
        ]

    def __str__(self):
        return (
            f"{self.schedule.audit.audit_code} - "
            f"{self.confirmation_type}"
        )




class AuditChecklistItemHistory(models.Model):

    audit_checklist_item = models.ForeignKey(
        AuditChecklistItem,
        on_delete=models.CASCADE,
        related_name="history"
    )

    remarks = models.TextField(
        blank=True
    )

    evaluated_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="audit_checklist_history"
    )

    evaluated_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"{self.audit_checklist_item} - "
            f"{self.evaluated_at}"
        )


class AuditNC(models.Model):

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        SUBMITTED = "SUBMITTED", "Submitted"
        REWORK_REQUIRED = "REWORK_REQUIRED", "Rework Required"
        ACCEPTED = "ACCEPTED", "Accepted"

    audit_checklist_item = models.OneToOneField(
        AuditChecklistItem,
        on_delete=models.PROTECT,
        related_name="nc"
    )

    # Filled by auditor
    finding = models.TextField(
        blank=True
    )

    # Filled by auditor
    risk_action = models.TextField(
        blank=True
    )

    # Filled by audited team
    correction = models.TextField(
        blank=True
    )

    corrective_action = models.TextField(
        blank=True
    )

    preventive_action = models.TextField(
        blank=True
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN
    )

    # Auditor verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="verified_audit_ncs",
        null=True,
        blank=True
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    verification_remarks = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.audit_checklist_item} - NC"



class AnnualAuditPlan(models.Model):
    audit_year = models.PositiveIntegerField()

    cycle_1_start = models.DateField()
    cycle_1_end = models.DateField()

    cycle_2_start = models.DateField()
    cycle_2_end = models.DateField()

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="annual_audit_plans",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-audit_year"]

    def __str__(self):
        return f"Audit Plan {self.audit_year}"


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        ANNUAL_AUDIT_PLAN = "1", "Annual Audit Plan"
        PROJECT = "2", "Project"
        AUDIT_ASSIGNMENT = "3", "Audit Assignment"
        AUDIT_REMINDER = "4", "Audit Reminder"
        CHECKLIST_NC = "5", "Checklist / Non-Conformity"
        CORRECTIVE_ACTION = "6", "Corrective Action"
        AUDIT_CLOSURE = "7", "Audit Closure"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=2,
        choices=NotificationType.choices,
    )

    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.get_notification_type_display()} - "
            f"{self.recipient}"
        )
class AuditReminderLog(models.Model):

    class ReminderType(models.IntegerChoices):
        FIFTEEN_DAYS = 15, "15 Days Before"
        SEVEN_DAYS = 7, "7 Days Before"

    audit = models.ForeignKey(
        Audit,
        on_delete=models.CASCADE,
        related_name="reminder_logs"
    )

    auditor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="audit_reminder_logs"
    )

    reminder_days = models.PositiveSmallIntegerField(
        choices=ReminderType.choices
    )

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["audit", "auditor", "reminder_days"],
                name="unique_audit_auditor_reminder"
            )
        ]

    def __str__(self):
        return (
            f"{self.audit.audit_code} - "
            f"{self.auditor.username} - "
            f"{self.reminder_days} Days"
        )