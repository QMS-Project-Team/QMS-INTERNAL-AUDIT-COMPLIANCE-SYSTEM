from django.contrib import admin
from .models import Checklist, ChecklistItem

class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 0
    ordering = ('sort_order', 'item_number')

@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ('title', 'framework', 'department_code', 'version', 'is_active', 'updated_at')
    list_filter = ('framework', 'is_active')
    search_fields = ('title', 'department_code', 'department_name')
    inlines = [ChecklistItemInline]

@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ('checklist', 'item_number', 'response_type', 'is_mandatory', 'sort_order')
    list_filter = ('response_type', 'is_mandatory')
