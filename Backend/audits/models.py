from django.db import models

from checklists.models import Checklist, ChecklistItem


class Audit(models.Model):
    """A single department audit instance."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SCHEDULED = 'scheduled', 'Scheduled'
        IN_PROGRESS = 'in_progress', 'In Progress'
        AWAITING_ACTION = 'awaiting_action', 'Awaiting Action'
        AWAITING_VERIFICATION = 'awaiting_verification', 'Awaiting Verification'
        CLOSED = 'closed', 'Closed'
        CANCELLED = 'cancelled', 'Cancelled'

    framework = models.ForeignKey('qms.Framework', on_delete=models.PROTECT, related_name='audits')
    checklist = models.ForeignKey(Checklist, on_delete=models.PROTECT, related_name='audits')
    department_code = models.CharField(max_length=30)
    department_name = models.CharField(max_length=150)
    project_code = models.CharField(max_length=30, blank=True)
    project_name = models.CharField(max_length=150, blank=True)
    audit_year = models.PositiveIntegerField()
    cycle = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    created_by_username = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-audit_year', '-cycle', 'department_name']
        constraints = [
            models.UniqueConstraint(
                fields=['framework', 'department_code', 'audit_year', 'cycle'],
                name='unique_department_audit_cycle',
            ),
        ]

    def __str__(self):
        return f"{self.framework.code} {self.audit_year} C{self.cycle} - {self.department_name}"


class AuditAssignment(models.Model):
    """Assignment of primary/secondary auditors using external master employee codes."""

    class AssignmentType(models.TextChoices):
        PRIMARY = 'primary', 'Primary'
        SECONDARY = 'secondary', 'Secondary'

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='assignments')
    employee_code = models.CharField(max_length=30)
    employee_name = models.CharField(max_length=150, blank=True)
    assignment_type = models.CharField(max_length=20, choices=AssignmentType.choices)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['audit', 'employee_code'],
                name='unique_audit_employee_assignment',
            ),
            models.UniqueConstraint(
                fields=['audit', 'assignment_type'],
                name='unique_audit_assignment_type',
            ),
        ]

    def __str__(self):
        return f"{self.audit_id}: {self.assignment_type} - {self.employee_code}"


class AuditSchedule(models.Model):
    """Confirmed schedule details and department confirmation state."""

    audit = models.OneToOneField(Audit, on_delete=models.CASCADE, related_name='schedule')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    confirmed_by_username = models.CharField(max_length=150, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    department_confirmed = models.BooleanField(default=False)
    department_confirmed_at = models.DateTimeField(null=True, blank=True)
    uploaded_to_bebonet = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(null=True, blank=True)


class ChecklistResponse(models.Model):
    """Auditor's response to one checklist item for one audit."""

    class Result(models.TextChoices):
        COMPLIANT = 'compliant', 'Compliant'
        NON_COMPLIANT = 'non_compliant', 'Non-Compliant'
        NOT_APPLICABLE = 'not_applicable', 'Not Applicable'
        PENDING = 'pending', 'Pending'

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='responses')
    item = models.ForeignKey(ChecklistItem, on_delete=models.PROTECT, related_name='audit_responses')
    result = models.CharField(max_length=30, choices=Result.choices, default=Result.PENDING)
    response_value = models.TextField(blank=True)
    auditor_comment = models.TextField(blank=True)
    responded_by_employee_code = models.CharField(max_length=30, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['audit', 'item'],
                name='unique_audit_checklist_response',
            ),
        ]


class Evidence(models.Model):
    """Evidence attached to an audit or a specific checklist response."""

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='evidence')
    response = models.ForeignKey(
        ChecklistResponse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidence',
    )
    file = models.FileField(upload_to='audit_evidence/%Y/%m/')
    original_name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    uploaded_by_employee_code = models.CharField(max_length=30)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Finding(models.Model):
    """A non-conformity or auditor suggestion found during an audit."""

    class FindingType(models.TextChoices):
        NON_CONFORMITY = 'non_conformity', 'Non-Conformity'
        SUGGESTION = 'suggestion', 'Suggestion'

    class Severity(models.TextChoices):
        MINOR = 'minor', 'Minor'
        MAJOR = 'major', 'Major'
        CRITICAL = 'critical', 'Critical'

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='findings')
    response = models.ForeignKey(
        ChecklistResponse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='findings',
    )
    finding_type = models.CharField(max_length=30, choices=FindingType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=Severity.choices, blank=True)
    raised_by_employee_code = models.CharField(max_length=30)
    raised_at = models.DateTimeField(auto_now_add=True)
    is_closed = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class CorrectiveAction(models.Model):
    """One of the four actions defined by the audit process."""

    class ActionType(models.TextChoices):
        CORRECTION = 'correction', 'Correction'
        CORRECTIVE = 'corrective_action', 'Corrective Action'
        PREVENTIVE = 'preventive_action', 'Preventive Action'
        RISK = 'risk_action', 'Risk Action'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        SUBMITTED = 'submitted', 'Submitted'
        REWORK = 'rework', 'Rework Required'
        ACCEPTED = 'accepted', 'Accepted'
        CLOSED = 'closed', 'Closed'

    finding = models.ForeignKey(Finding, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    description = models.TextField(blank=True)
    owner_employee_code = models.CharField(max_length=30)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    submitted_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['finding', 'action_type'],
                name='unique_finding_action_type',
            ),
        ]


class Verification(models.Model):
    """Auditor verification of a corrective/preventive/risk action."""

    class Decision(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'

    action = models.ForeignKey(CorrectiveAction, on_delete=models.CASCADE, related_name='verifications')
    decision = models.CharField(max_length=20, choices=Decision.choices, default=Decision.PENDING)
    comments = models.TextField(blank=True)
    verified_by_employee_code = models.CharField(max_length=30)
    verified_at = models.DateTimeField(auto_now_add=True)


class AuditReport(models.Model):
    """Initial or closure report generated for an audit."""

    class ReportType(models.TextChoices):
        INITIAL = 'initial', 'Initial'
        CLOSURE = 'closure', 'Closure'

    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    content = models.TextField()
    created_by_employee_code = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['audit', 'report_type'],
                name='unique_audit_report_type',
            ),
        ]


class AuditEvent(models.Model):
    """Immutable audit trail entry for important workflow changes."""
    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=60)
    actor_employee_code = models.CharField(max_length=30, blank=True)
    actor_username = models.CharField(max_length=150, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']


class AuditNotification(models.Model):
    """Scheduled/issued reminder or escalation for an audit milestone."""
    audit = models.ForeignKey(Audit, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=60)
    recipient_username = models.CharField(max_length=150)
    message = models.TextField()
    due_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['audit', 'notification_type', 'recipient_username'], name='unique_audit_notification_recipient'),
        ]
        ordering = ['due_at', 'id']
