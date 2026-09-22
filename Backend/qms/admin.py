from django.contrib import admin
from .models import Framework

@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'version', 'is_active', 'updated_at')
    search_fields = ('code', 'name')
    list_filter = ('is_active',)
