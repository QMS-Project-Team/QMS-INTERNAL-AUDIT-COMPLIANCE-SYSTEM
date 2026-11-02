from django.contrib import admin

from .models import (
    Audit,
    AuditSchedule,
    AuditorAssignment,
    AuditChecklist,
    AuditChecklistItem,
    AuditorOrientation,
    AuditConfirmation,
    AuditChecklistItemHistory,
    AuditNC,
    AnnualAuditPlan,Notification,
    AuditReminderLog
)


@admin.register(Audit)
class AuditAdmin(admin.ModelAdmin):
    list_display = (
        "audit_code",
        "project",
        "department",
        "framework",
        "created_by",
        "planned_start_date",
        "planned_end_date",
        "status",
        "created_at",
    )

    list_filter = ("department", "framework", "status")

    search_fields = (
        "audit_code",
        "project__name",
        "project__project_code",
    )


@admin.register(AuditSchedule)
class AuditScheduleAdmin(admin.ModelAdmin):
    list_display = (
        "audit",
        "scheduled_start",
        "scheduled_end",
        "status",
        "scheduled_by",
        "created_at",
    )

    list_filter = ("status",)
    search_fields = ("audit__audit_code",)


@admin.register(AuditorAssignment)
class AuditorAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "audit",
        "auditor",
        "assignment_type",
        "assigned_by",
        "assigned_at",
    )

    list_filter = ("assignment_type",)
    search_fields = (
        "audit__audit_code",
        "auditor__username",
    )


@admin.register(AuditChecklist)
class AuditChecklistAdmin(admin.ModelAdmin):
    list_display = (
        "audit",
        "checklist",
        "created_at",
    )

    search_fields = (
        "audit__audit_code",
        "checklist__name",
    )


@admin.register(AuditChecklistItem)
class AuditChecklistItemAdmin(admin.ModelAdmin):
    list_display = (
        "audit_checklist",
        "checklist_item",
        "result",
        "created_at",
    )

    list_filter = ("result",)
    search_fields = (
        "audit_checklist__audit__audit_code",
        "checklist_item__item_code",
        "checklist_item__question",
    )


@admin.register(AuditorOrientation)
class AuditorOrientationAdmin(admin.ModelAdmin):
    list_display = (
        "assignment",
        "status",
        "completed_at",
        "created_at",
    )

    list_filter = ("status",)
    search_fields = (
        "assignment__audit__audit_code",
        "assignment__auditor__username",
    )


@admin.register(AuditConfirmation)
class AuditConfirmationAdmin(admin.ModelAdmin):
    list_display = (
        "schedule",
        "confirmation_type",
        "confirmed_at",
        "confirmed_by",
    )

    list_filter = ("confirmation_type",)
    search_fields = (
        "schedule__audit__audit_code",
        "confirmed_by__username",
    )


@admin.register(AuditChecklistItemHistory)
class AuditChecklistItemHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "audit_checklist_item",
        "evaluated_by",
        "evaluated_at",
    )

    search_fields = (
        "audit_checklist_item__checklist_item__item_code",
        "evaluated_by__username",
        "remarks",
    )


@admin.register(AuditNC)
class AuditNCAdmin(admin.ModelAdmin):
    list_display = (
        "audit_checklist_item",
        "status",
        "verified_by",
        "verified_at",
        "created_at",
    )

    list_filter = ("status",)
    search_fields = (
        "audit_checklist_item__audit_checklist__audit__audit_code",
        "audit_checklist_item__checklist_item__item_code",
        "finding",
    )

@admin.register(AnnualAuditPlan)
class AnnualAuditPlanAdmin(admin.ModelAdmin):
    list_display = (
        "audit_year",
        "cycle_1_start",
        "cycle_1_end",
        "cycle_2_start",
        "cycle_2_end",
        "created_by",
        "created_at",
    )

    list_filter = (
        "audit_year",
        "created_at",
    )

    search_fields = (
        "audit_year",
        "created_by__employee_id",
    )

    ordering = ("-audit_year",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )



@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "recipient",
        "notification_type",
        "title",
        "message",
        "is_read",
        "created_at",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )

    search_fields = (
        "recipient__username",
        "title",
        "message",
    )

    readonly_fields = ("created_at",)

@admin.register(AuditReminderLog)
class AuditReminderLogAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "audit",
        "auditor",
        "reminder_days",
        "sent_at",
    )

    list_filter = (
        "reminder_days",
        "sent_at",
    )

    search_fields = (
        "audit__audit_code",
        "auditor__username",
        "auditor__employee_id",
    )

    readonly_fields = (
        "sent_at",
    )

    ordering = ("-sent_at",)