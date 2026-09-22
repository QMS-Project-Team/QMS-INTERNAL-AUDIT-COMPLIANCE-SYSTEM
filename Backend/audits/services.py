from django.db import transaction

from frameworks.models import Checklist,ChecklistItem
from .models import Audit, AuditChecklist, AuditChecklistItem


@transaction.atomic
def create_audit_checklist(audit):

    # Find the checklist matching the audit
    checklist = Checklist.objects.filter(
        framework=audit.framework,
        department=audit.department,
        is_active=True
    ).first()

    if not checklist:
        raise ValueError(
            "No active checklist exists for this framework and department."
        )

    # Prevent creating another checklist for the same audit
    if hasattr(audit, "audit_checklist"):
        raise ValueError(
            "Checklist has already been created for this audit."
        )

    # Create the audit-specific checklist
    audit_checklist = AuditChecklist.objects.create(
        audit=audit,
        checklist=checklist
    )

    # Create an execution item for every master checklist item
    checklist_items = ChecklistItem.objects.filter(
        checklist=checklist,
        is_active=True
    )

    audit_items = [
        AuditChecklistItem(
            audit_checklist=audit_checklist,
            checklist_item=item
        )
        for item in checklist_items
    ]

    AuditChecklistItem.objects.bulk_create(audit_items)

    return audit_checklist



