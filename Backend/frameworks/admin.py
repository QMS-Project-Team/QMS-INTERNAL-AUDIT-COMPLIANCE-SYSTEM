from django.contrib import admin
from .models import Framework, Checklist, ChecklistItem


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "is_active",
        "created_at",
    )

    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "framework",
        "department",
        "is_active",
        "created_at",
    )

    list_filter = ("framework", "department", "is_active")
    search_fields = ("name", "framework__name", "department__name")


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = (
        "item_code",
        "checklist",
        "order",
        "is_active",
        "created_at",
    )

    list_filter = ("is_active",)
    search_fields = ("item_code", "question", "checklist__name")
    ordering = ("checklist", "order")