from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone


from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets

from .services import create_audit_checklist

from accounts.permissions import IsQMS,IsDirector, IsManager, IsAuditor

from accounts.models import User
from .models import (Audit,AuditorNomination,AuditorAssignment,AuditorOrientation,
                     AuditSchedule,AuditConfirmation,
                     AuditChecklist,AuditChecklistItem)

from .serializers import (serializers,AuditSerializer,AuditorNominationSerializer,
                          AuditorAssignmentSerializer,AuditorOrientationSerializer,
                          AuditScheduleSerializer,AuditConfirmationSerializer,
                          AuditChecklistSerializer,AuditChecklistItemSerializer)


class AuditViewSet(ModelViewSet):

    serializer_class = AuditSerializer

    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [
                IsAuthenticated,
            ]

        elif self.action == "create":
            permission_classes = [
                IsDirector | IsManager,
            ]

        elif self.action in ["update", "partial_update", "destroy"]:
            permission_classes = [
                IsDirector | IsManager,
            ]

        else:
            permission_classes = [
                IsAuthenticated,
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    def get_queryset(self):

        user = self.request.user

        if user.role == "QMS":
            return Audit.objects.all()

        if user.role in ["DIRECTOR", "MANAGER"]:
            return Audit.objects.filter(
                created_by=user
            )

        return Audit.objects.none()

    def perform_create(self, serializer):

        serializer.save(
            created_by=self.request.user
        )


    @action(
    detail=True,
    methods=["post"],
    url_path="complete-assignment",
    permission_classes=[IsQMS]
    )
    def complete_assignment(self, request, pk=None):
        audit = self.get_object()

        if audit.status != Audit.Status.PENDING_ASSIGNMENT:
            return Response(
                {
                    "detail": (
                        "Assignment can only be completed for an audit "
                        "in PENDING_ASSIGNMENT status."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        assignments = AuditorAssignment.objects.filter(audit=audit)

        has_primary = assignments.filter(
            assignment_type=AuditorAssignment.AssignmentType.PRIMARY
        ).exists()

        has_secondary = assignments.filter(
            assignment_type=AuditorAssignment.AssignmentType.SECONDARY
        ).exists()

        if not has_primary:
            return Response(
                {
                    "detail": "At least one Primary auditor is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not has_secondary:
            return Response(
                {
                    "detail": "At least one Secondary auditor is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            audit_checklist = create_audit_checklist(audit)

        except ValueError as error:
            return Response(
                {
                    "detail": str(error)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        audit.status = Audit.Status.ASSIGNED

        audit.save(
            update_fields=["status", "updated_at"]
        )

        return Response(
            {
                "detail": "Auditor assignment completed successfully.",
                "audit_id": audit.id,
                "audit_code": audit.audit_code,
                "status": audit.status,
                "audit_checklist_id": audit_checklist.id,
                "checklist_id": audit_checklist.checklist.id,
                "checklist_name": audit_checklist.checklist.name,
            },
            status=status.HTTP_200_OK
        )

    


    @action(
    detail=True,
    methods=["post"],
    url_path="complete-orientation",
    permission_classes=[IsQMS]
    )
    def complete_orientation(self, request, pk=None):

        audit = self.get_object()

        # Audit must have assigned auditors
        if audit.status != Audit.Status.ASSIGNED:
            return Response(
                {
                    "detail": (
                        "Orientation can only be completed "
                        "for an ASSIGNED audit."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        assignments = AuditorAssignment.objects.filter(
            audit=audit
        )

        if not assignments.exists():
            return Response(
                {
                    "detail": "No auditors are assigned to this audit."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        orientations = AuditorOrientation.objects.filter(
            assignment__audit=audit
        )

        incomplete_orientations = orientations.exclude(
            status=AuditorOrientation.Status.COMPLETED
        )

        if incomplete_orientations.exists():

            incomplete_auditors = [
                orientation.assignment.auditor.username
                for orientation in incomplete_orientations
            ]

            return Response(
                {
                    "detail": "Not all assigned auditors have completed orientation.",
                    "pending_auditors": incomplete_auditors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "detail": "All assigned auditors have completed orientation.",
                "audit_id": audit.id,
                "audit_code": audit.audit_code,
                "status": audit.status,
            },
            status=status.HTTP_200_OK
        )


    @action(
    detail=True,
    methods=["post"],
    url_path="start",
    permission_classes=[IsAuthenticated],
    )
    def start_audit(self, request, pk=None):
        audit = self.get_object()

        # 1. Check that the user is assigned to this audit
        assignment = audit.auditor_assignments.filter(
            auditor=request.user
        ).first()

        if not assignment:
            return Response(
                {"detail": "You are not assigned to this audit."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Check orientation
        orientation = getattr(assignment, "orientation", None)

        if not orientation or orientation.status != "COMPLETED":
            return Response(
                {"detail": "Auditor orientation must be completed before starting the audit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Check schedule
        schedule = getattr(audit, "schedule", None)

        if not schedule:
            return Response(
                {"detail": "Audit schedule does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Check confirmation
        if schedule.status != "CONFIRMED":
            return Response(
                {"detail": "Audit schedule must be confirmed before starting the audit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 5. Check audit checklist
        if not hasattr(audit, "audit_checklist"):
            return Response(
                {"detail": "Audit checklist does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 6. Check audit status
        if audit.status != Audit.Status.ASSIGNED:
            return Response(
                {
                    "detail": (
                        f"Audit cannot be started from its current status: "
                        f"{audit.status}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 7. Start the audit
        audit.status = Audit.Status.IN_PROGRESS
        audit.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "detail": "Audit started successfully.",
                "audit_id": audit.id,
                "audit_code": audit.audit_code,
                "status": audit.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(
    detail=True,
    methods=["get"],
    url_path="checklist",
    permission_classes=[IsAuthenticated],
    )
    def checklist(self, request, pk=None):
        audit = self.get_object()

        # User must be assigned to this audit
        is_assigned = audit.auditor_assignments.filter(
            auditor=request.user
        ).exists()

        if not is_assigned:
            return Response(
                {"detail": "You are not assigned to this audit."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Checklist can only be accessed during execution
        if audit.status != Audit.Status.IN_PROGRESS:
            return Response(
                {
                    "detail": (
                        "Audit checklist can only be accessed "
                        "while the audit is in progress."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get audit-specific checklist
        try:
            audit_checklist = audit.audit_checklist
        except AuditChecklist.DoesNotExist:
            return Response(
                {"detail": "Audit checklist does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AuditChecklistSerializer(
            audit_checklist
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )



class AuditorNominationViewSet(ModelViewSet):

    serializer_class = AuditorNominationSerializer

    def get_permissions(self):

        if self.action in [
            "list",
            "retrieve",
        ]:
            permission_classes = [
                IsAuthenticated,
            ]

        elif self.action == "create":
            permission_classes = [
                IsDirector | IsManager,
            ]

        elif self.action in [
            "update",
            "partial_update",
            "destroy",
        ]:
            permission_classes = [
                IsDirector | IsManager,
            ]

        else:
            permission_classes = [
                IsAuthenticated,
            ]

        return [
            permission()
            for permission in permission_classes
        ]

    def get_queryset(self):

        return AuditorNomination.objects.filter(
            audit_id=self.kwargs["audit_id"]
        )

    def get_serializer_context(self):

        context = super().get_serializer_context()

        context["audit"] = Audit.objects.get(
            id=self.kwargs["audit_id"]
        )

        return context

    def perform_create(self, serializer):

        audit = Audit.objects.get(
            id=self.kwargs["audit_id"]
        )

        serializer.save(
            audit=audit,
            nominated_by=self.request.user
        )


class AuditorAssignmentViewSet(viewsets.ModelViewSet):

    serializer_class = AuditorAssignmentSerializer

    def get_queryset(self):
        audit_id = self.kwargs.get("audit_id")

        return AuditorAssignment.objects.filter(
            audit_id=audit_id
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        audit_id = self.kwargs.get("audit_id")

        context["audit"] = get_object_or_404(
            Audit,
            id=audit_id
        )

        return context

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]

        else:
            permission_classes = [IsQMS]

        return [
            permission()
            for permission in permission_classes
        ]

    def perform_create(self, serializer):

        audit = get_object_or_404(
            Audit,
            id=self.kwargs.get("audit_id")
        )

        assignment = serializer.save(
            audit=audit,
            assigned_by=self.request.user
        )

        AuditorOrientation.objects.create(
            assignment=assignment
        )


class AuditorOrientationViewSet(viewsets.ModelViewSet):

    serializer_class = AuditorOrientationSerializer

    def get_queryset(self):
        queryset = AuditorOrientation.objects.select_related(
            "assignment",
            "assignment__auditor",
            "assignment__audit",
        )

        if self.request.user.role == User.Role.QMS:
            return queryset

        return queryset.filter(
            assignment__auditor=self.request.user
        )

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]

        else:
            permission_classes = [IsAuditor]

        return [
            permission()
            for permission in permission_classes
        ]

    @action(
    detail=True,
    methods=["post"],
    url_path="complete"
    )
    def complete(self, request, pk=None):

        orientation = self.get_object()

        # Make sure this orientation belongs to the logged-in auditor
        if orientation.assignment.auditor != request.user:
            return Response(
                {
                    "detail": (
                        "You can only complete your own orientation."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if orientation.status == AuditorOrientation.Status.COMPLETED:
            return Response(
                {
                    "detail": "Orientation is already completed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        orientation.status = AuditorOrientation.Status.COMPLETED
        orientation.completed_at = timezone.now()

        orientation.save(
            update_fields=[
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Orientation completed successfully.",
                "orientation_id": orientation.id,
                "audit_code": orientation.assignment.audit.audit_code,
                "status": orientation.status,
                "completed_at": orientation.completed_at,
            },
            status=status.HTTP_200_OK
        )


class AuditScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = AuditScheduleSerializer

    def get_queryset(self):
        audit_id = self.kwargs.get("audit_id")

        return AuditSchedule.objects.filter(
            audit_id=audit_id
        )

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsQMS]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        audit = get_object_or_404(
            Audit,
            id=self.kwargs.get("audit_id")
        )

        if audit.status != Audit.Status.ASSIGNED:
            raise serializers.ValidationError(
                "Schedule can only be created for an ASSIGNED audit."
            )

        if AuditSchedule.objects.filter(audit=audit).exists():
            raise serializers.ValidationError(
                "A schedule already exists for this audit."
            )

        serializer.save(
            audit=audit,
            scheduled_by=self.request.user,
            status=AuditSchedule.Status.SCHEDULED
        )

class AuditConfirmationViewSet(viewsets.ModelViewSet):
    serializer_class = AuditConfirmationSerializer

    def get_queryset(self):
        audit_id = self.kwargs.get("audit_id")

        return AuditConfirmation.objects.filter(
            schedule__audit_id=audit_id
        )

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsQMS]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        audit = get_object_or_404(
            Audit,
            id=self.kwargs.get("audit_id")
        )

        schedule = get_object_or_404(
            AuditSchedule,
            audit=audit
        )

        if schedule.status != AuditSchedule.Status.SCHEDULED:
            raise serializers.ValidationError(
                "Confirmation can only be created for a scheduled audit."
            )

        confirmation_type = self.request.data.get(
            "confirmation_type"
        )

        if confirmation_type not in [
            AuditConfirmation.ConfirmationType.COMBINED,
            AuditConfirmation.ConfirmationType.INDIVIDUAL,
        ]:
            raise serializers.ValidationError(
                "Invalid confirmation type."
            )

        if AuditConfirmation.objects.filter(
            schedule=schedule,
            confirmation_type=confirmation_type
        ).exists():
            raise serializers.ValidationError(
                "This confirmation has already been recorded."
            )

        confirmation = serializer.save(
            schedule=schedule,
            confirmed_at=timezone.now(),
            confirmed_by=self.request.user
        )

        confirmations = AuditConfirmation.objects.filter(
            schedule=schedule
        )

        has_combined = confirmations.filter(
            confirmation_type=AuditConfirmation.ConfirmationType.COMBINED
        ).exists()

        has_individual = confirmations.filter(
            confirmation_type=AuditConfirmation.ConfirmationType.INDIVIDUAL
        ).exists()

        if has_combined and has_individual:
            schedule.status = AuditSchedule.Status.CONFIRMED
            schedule.save(
                update_fields=["status", "updated_at"]
            )