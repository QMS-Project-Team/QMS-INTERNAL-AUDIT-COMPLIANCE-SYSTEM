from django.contrib import admin

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):

    list_display = (
        "project_code",
        "name",
        "department",
        "project_owner",
        "status",
        "created_at",
    )

    list_filter = (
        "department",
        "status",
    )

    search_fields = (
        "project_code",
        "name",
    )