from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (AuditViewSet,AuditorNominationViewSet,AuditorAssignmentViewSet,
                    AuditorOrientationViewSet,AuditScheduleViewSet,AuditConfirmationViewSet)


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
    path(
        "audits/<int:audit_id>/nominations/",
        AuditorNominationViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
        name="audit-nominations",
    ),

    path(
        "audits/<int:audit_id>/nominations/<int:pk>/",
        AuditorNominationViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy",
        }),
        name="audit-nomination-detail",
    ),

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
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy",
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

]