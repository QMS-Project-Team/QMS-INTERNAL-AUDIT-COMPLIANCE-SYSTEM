from django.urls import path

from .views import (
    audit_list,
    audit_detail,
    audit_dashboard,
    audit_history,
    audit_notifications,
    assign_auditor,
    schedule_audit,
    confirm_schedule,
    confirm_department,
    audit_deadline_view,
    submit_response,
    upload_evidence,
    create_finding,
    create_action,
    submit_action,
    verify_action,
    create_report,
    confirm_report,
    close_audit,
)

urlpatterns = [
    path('', audit_list, name='audit-list'),
    path('dashboard/', audit_dashboard, name='audit-dashboard'),

    path('<int:pk>/', audit_detail, name='audit-detail'),
    path('<int:pk>/assign/', assign_auditor, name='audit-assign'),
    path('<int:pk>/schedule/', schedule_audit, name='audit-schedule'),
    path('<int:pk>/schedule/confirm/', confirm_schedule, name='audit-schedule-confirm'),
    path('<int:pk>/department-confirm/', confirm_department, name='audit-department-confirm'),
    path('<int:pk>/deadlines/', audit_deadline_view, name='audit-deadlines'),
    path('<int:pk>/history/', audit_history, name='audit-history'),
    path('<int:pk>/notifications/', audit_notifications, name='audit-notifications'),
    path('<int:pk>/responses/', submit_response, name='audit-response'),
    path('<int:pk>/evidence/', upload_evidence, name='audit-evidence'),
    path('<int:pk>/findings/', create_finding, name='audit-finding'),

    path('findings/<int:finding_id>/actions/', create_action, name='finding-action'),
    path('actions/<int:action_id>/submit/', submit_action, name='action-submit'),
    path('actions/<int:action_id>/verify/', verify_action, name='action-verify'),

    path('<int:pk>/reports/', create_report, name='audit-report'),
    path('reports/<int:report_id>/confirm/', confirm_report, name='report-confirm'),
    path('<int:pk>/close/', close_audit, name='audit-close'),
]
