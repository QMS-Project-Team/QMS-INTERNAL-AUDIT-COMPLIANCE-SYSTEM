from django.contrib import admin

from .models import Project, ProjectMember


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


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):

    list_display = (
        "project",
        "employee",
        "poc_type",
        "created_at",
    )

    list_filter = (
        "poc_type",
        "project",
    )

    search_fields = (
        "project__name",
        "employee__username",
    )