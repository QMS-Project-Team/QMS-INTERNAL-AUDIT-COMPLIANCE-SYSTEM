from django.contrib import admin

from .models import Audit, AuditorNomination


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

    list_filter = (
        "department",
        "framework",
        "status",
    )

    search_fields = (
        "audit_code",
        "project__name",
        "project__project_code",
    )


@admin.register(AuditorNomination)
class AuditorNominationAdmin(admin.ModelAdmin):

    list_display = (
        "audit",
        "auditor",
        "nominated_by",
        "nominated_at",
    )

    list_filter = (
        "auditor",
        "nominated_by",
    )

    search_fields = (
        "audit__audit_code",
        "auditor__username",
        "nominated_by__username",
    )