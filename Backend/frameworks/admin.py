from django.contrib import admin

from .models import Framework


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):

    list_display = (
        "code",
        "name",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "code",
        "name",
    )