from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin,CreateModelMixin,UpdateModelMixin


from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets

from .services import create_audit_checklist

from accounts.permissions import IsQMS,IsDirector

from accounts.models import User
from projects.models import ProjectMember

from .models import (Audit,AuditorAssignment,AuditorOrientation,
                     AuditSchedule,AuditConfirmation,
                     AuditChecklist,AuditChecklistItem,AuditChecklistItemHistory,AuditNC)

from .serializers import (serializers,AuditSerializer,AuditorAssignmentSerializer,
                          AuditorOrientationSerializer,AuditScheduleSerializer,
                          AuditConfirmationSerializer,AuditChecklistSerializer,
                          AuditChecklistItemSerializer,AuditNCSerializer)


class AuditViewSet(ModelViewSet):

    serializer_class = AuditSerializer

    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [
                IsAuthenticated,
            ]

        elif self.action == "create":
            permission_classes = [
                IsQMS,
            ]

        elif self.action in ["update", "partial_update", "destroy"]:
            permission_classes = [
                IsQMS,
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

        queryset = Audit.objects.select_related(
            "project",
            "department",
            "framework",
            "created_by",
        )

        if user.role == User.Role.QMS:
            return queryset

        if user.role == User.Role.DIRECTOR:
            return queryset.filter(
                project__project_owner=user
            )

        if user.role == User.Role.EMPLOYEE:
            return queryset.filter(
                auditor_assignments__auditor=user
            ).distinct()

        return queryset.none()

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]

        audit = serializer.save(
            created_by=self.request.user,
            department=project.department,
            status=Audit.Status.PENDING_ASSIGNMENT
        )

        create_audit_checklist(audit)



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


class AuditChecklistItemViewSet(
    viewsets.GenericViewSet,
    RetrieveModelMixin,
    UpdateModelMixin
):

    serializer_class = AuditChecklistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        audit_id = self.kwargs["audit_id"]

        return AuditChecklistItem.objects.filter(
            audit_checklist__audit_id=audit_id
        ).select_related(
            "audit_checklist",
            "audit_checklist__audit",
            "checklist_item"
        )

    def partial_update(self, request, *args, **kwargs):

        audit = get_object_or_404(
            Audit,
            id=self.kwargs["audit_id"]
        )

        # 1. User must be assigned to this audit
        is_assigned = AuditorAssignment.objects.filter(
            audit=audit,
            auditor=request.user
        ).exists()

        if not is_assigned:
            return Response(
                {
                    "detail": "You are not assigned to this audit."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Audit must be in progress
        if audit.status != Audit.Status.IN_PROGRESS:
            return Response(
                {
                    "detail": (
                        "Checklist items can only be updated "
                        "while the audit is in progress."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Get checklist item belonging to this audit
        item = get_object_or_404(
            self.get_queryset(),
            id=self.kwargs["pk"]
        )

        old_result = item.result

        serializer = self.get_serializer(
            item,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        new_result = serializer.validated_data.get(
            "result",
            old_result
        )

        # 4. A compliant item cannot be re-evaluated
        if old_result == AuditChecklistItem.Result.COMPLIANT:
            return Response(
                {
                    "detail": (
                        "A compliant checklist item "
                        "cannot be re-evaluated."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Save checklist result / remarks
        serializer.save()

        # 6. Only process when item ENTERS NON_COMPLIANT state
        if (
            new_result == AuditChecklistItem.Result.NON_COMPLIANT
            and old_result != AuditChecklistItem.Result.NON_COMPLIANT
        ):

            # Create NC history
            AuditChecklistItemHistory.objects.create(
                audit_checklist_item=item,
                remarks=item.remarks,
                evaluated_by=request.user
            )

            # Create current NC record
            AuditNC.objects.get_or_create(
                audit_checklist_item=item
            )

        return Response(
            self.get_serializer(item).data,
            status=status.HTTP_200_OK
        )



class AuditorAssignmentViewSet(ListModelMixin,
                                RetrieveModelMixin,
                                CreateModelMixin,
                                viewsets.GenericViewSet):

    serializer_class = AuditorAssignmentSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]

        elif self.action == "create":
            permission_classes = [IsQMS]

        else:
            permission_classes = [IsAuthenticated]

        return [
            permission()
            for permission in permission_classes
        ]

    def get_queryset(self):
        audit_id = self.kwargs["audit_id"]

        return AuditorAssignment.objects.filter(
            audit_id=audit_id
        ).select_related(
            "audit",
            "auditor",
            "assigned_by"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()

        audit_id = self.kwargs["audit_id"]
        audit = get_object_or_404(Audit, id=audit_id)

        context["audit"] = audit

        return context

    def perform_create(self, serializer):

        audit_id = self.kwargs["audit_id"]

        try:
            audit = Audit.objects.get(
                id=audit_id
            )
        except Audit.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Audit not found.")

        if audit.status != Audit.Status.PENDING_ASSIGNMENT:
            raise serializers.ValidationError(
                "Auditors can only be assigned while the audit is pending assignment."
            )

        assignment=serializer.save(
            audit=audit,
            assigned_by=self.request.user
        )
        AuditorOrientation.objects.create(
            assignment=assignment
        )

        primary_exists = AuditorAssignment.objects.filter(
            audit=audit,
            assignment_type=AuditorAssignment.AssignmentType.PRIMARY
        ).exists()

        secondary_exists = AuditorAssignment.objects.filter(
            audit=audit,
            assignment_type=AuditorAssignment.AssignmentType.SECONDARY
        ).exists()

        if primary_exists and secondary_exists:
            audit.status = Audit.Status.ASSIGNED
            audit.save(update_fields=["status", "updated_at"])


class AuditorOrientationViewSet(ListModelMixin,RetrieveModelMixin,
                                viewsets.GenericViewSet):

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
        permission_classes = [
            IsAuthenticated
        ]

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


class AuditNCViewSet(
    viewsets.GenericViewSet,
    RetrieveModelMixin,
    UpdateModelMixin
):

    serializer_class = AuditNCSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        audit_id = self.kwargs["audit_id"]

        queryset = AuditNC.objects.filter(
            audit_checklist_item__audit_checklist__audit_id=audit_id
        ).select_related(
            "audit_checklist_item",
            "audit_checklist_item__checklist_item",
            "audit_checklist_item__audit_checklist",
            "audit_checklist_item__audit_checklist__audit",
            "audit_checklist_item__audit_checklist__audit__project",
            "audit_checklist_item__audit_checklist__audit__project__department",
            "verified_by",
        )

        user = self.request.user

        # QMS can view all NCs
        if user.role == User.Role.QMS:
            return queryset

        # Assigned auditor can view NC
        if AuditorAssignment.objects.filter(
            audit_id=audit_id,
            auditor=user
        ).exists():
            return queryset

        # Employees belonging to the audited project can view NC
        if ProjectMember.objects.filter(
            project__audits__id=audit_id,
            employee=user
        ).exists():
            return queryset

        return queryset.none()

    def partial_update(self, request, *args, **kwargs):

        nc = get_object_or_404(
            self.get_queryset(),
            id=kwargs["pk"]
        )

        user = request.user

        # QMS cannot modify NC actions here
        if user.role == User.Role.QMS:
            return Response(
                {
                    "detail": (
                        "QMS can view non-conformities "
                        "but cannot update them here."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Check whether user is an assigned auditor
        is_auditor = AuditorAssignment.objects.filter(
            audit=nc.audit_checklist_item.audit_checklist.audit,
            auditor=user
        ).exists()

        # Check whether user belongs to audited project
        is_project_member = ProjectMember.objects.filter(
            project=nc.audit_checklist_item.audit_checklist.audit.project,
            employee=user
        ).exists()

        # Auditor fields
        auditor_fields = {
            "finding",
            "risk_action",
        }

        # Audited team fields
        team_fields = {
            "correction",
            "corrective_action",
            "preventive_action",
        }

        submitted_fields = set(request.data.keys())

        # Auditor trying to update
        if is_auditor:

            invalid_fields = submitted_fields - auditor_fields

            if invalid_fields:
                return Response(
                    {
                        "detail": (
                            "Auditors can only update "
                            "finding and risk_action."
                        ),
                        "invalid_fields": list(invalid_fields)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Audited team trying to update
        elif is_project_member:

            invalid_fields = submitted_fields - team_fields

            if invalid_fields:
                return Response(
                    {
                        "detail": (
                            "Project members can only update "
                            "correction, corrective_action "
                            "and preventive_action."
                        ),
                        "invalid_fields": list(invalid_fields)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        else:
            return Response(
                {
                    "detail": "You do not have permission to update this NC."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(
            nc,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )