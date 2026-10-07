from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (AuditViewSet,AuditorAssignmentViewSet,
                    AuditorOrientationViewSet,AuditScheduleViewSet,AuditConfirmationViewSet,
                    AuditChecklistItemViewSet,AuditNCViewSet)


router = DefaultRouter()

router.register(
    "audits",
    AuditViewSet,
    basename="audit"
)

router.register(
    "orientations",
    AuditorOrientationViewSet,
    basename="auditor-orientations"
)

urlpatterns = [
    path("", include(router.urls)),


    # for list
    path(
        "audits/<int:audit_id>/assignments/",
        AuditorAssignmentViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
    ),

    # assignment operations
    path(
        "audits/<int:audit_id>/assignments/<int:pk>/",
        AuditorAssignmentViewSet.as_view({
            "get": "retrieve",
        }),
    ),

    path(
        "audits/<int:audit_id>/schedule/",
        AuditScheduleViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
    ),

    path(
        "audits/<int:audit_id>/schedule/<int:pk>/",
        AuditScheduleViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
        }),
    ),

    path(
        "audits/<int:audit_id>/confirmations/",
        AuditConfirmationViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
    ),

    path(
        "audits/<int:audit_id>/confirmations/<int:pk>/",
        AuditConfirmationViewSet.as_view({
            "get": "retrieve",
        }),
    ),

    path(
    "audits/<int:audit_id>/checklist-items/<int:pk>/",
        AuditChecklistItemViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
        }),
    ),

    path(
        "audits/<int:audit_id>/ncs/",
        AuditNCViewSet.as_view({
            "get": "list",
        }),
    ),
    path(
    "audits/<int:audit_id>/ncs/<int:pk>/",
        AuditNCViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
        }),
    ),
]