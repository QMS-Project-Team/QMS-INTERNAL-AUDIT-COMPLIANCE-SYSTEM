from django.contrib import admin
from .models import Audit, AuditAssignment, AuditSchedule, ChecklistResponse, Evidence, Finding, CorrectiveAction, Verification, AuditReport, AuditEvent, AuditNotification

@admin.register(Audit)
class AuditAdmin(admin.ModelAdmin):
    list_display = ('id', 'framework', 'department_code', 'project_code', 'audit_year', 'cycle', 'status', 'scheduled_start')
    list_filter = ('status', 'audit_year', 'framework')
    search_fields = ('department_code', 'department_name', 'project_code', 'created_by_username')

for model in [AuditAssignment, AuditSchedule, ChecklistResponse, Evidence, Finding, CorrectiveAction, Verification, AuditReport, AuditEvent, AuditNotification]:
    admin.site.register(model)
