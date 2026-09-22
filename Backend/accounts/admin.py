from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "QMS Information",
            {
                "fields": (
                    "employee_id",
                    "role",
                    "department",
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "QMS Information",
            {
                "fields": (
                    "employee_id",
                    "role",
                    "department",
                )
            },
        ),
    )