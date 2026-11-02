from datetime import date

from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AnnualAuditPlan, Notification
from .tasks import send_annual_audit_plan_notification


class AnnualAuditPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.employee_id",
        read_only=True,
    )

    class Meta:
        model = AnnualAuditPlan
        fields = [
            "id",
            "audit_year",
            "cycle_1_start",
            "cycle_1_end",
            "cycle_2_start",
            "cycle_2_end",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        # For updates, use the saved value when a field is omitted.
        instance = getattr(self, "instance", None)

        year = data.get(
            "audit_year",
            instance.audit_year if instance else None,
        )

        fields = [
            "cycle_1_start",
            "cycle_1_end",
            "cycle_2_start",
            "cycle_2_end",
        ]

        dates = {
            field: data.get(
                field,
                getattr(instance, field, None) if instance else None,
            )
            for field in fields
        }

        if year is None or any(value is None for value in dates.values()):
            raise serializers.ValidationError(
                "Audit year and all four cycle dates are required."
            )

        for field, value in dates.items():
            if value.year != year:
                raise serializers.ValidationError({
                    field: "Each date must belong to the selected audit year."
                })

        if dates["cycle_1_start"] > dates["cycle_1_end"]:
            raise serializers.ValidationError(
                "Cycle 1 start date must be before or equal to its end date."
            )

        if dates["cycle_2_start"] > dates["cycle_2_end"]:
            raise serializers.ValidationError(
                "Cycle 2 start date must be before or equal to its end date."
            )

        if dates["cycle_2_start"] <= dates["cycle_1_end"]:
            raise serializers.ValidationError(
                "Cycle 2 must start after Cycle 1 ends."
            )

        return data


class AnnualAuditPlanViewSet(viewsets.ModelViewSet):
    serializer_class = AnnualAuditPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role in ["QMS", "DIRECTOR"]:
            return AnnualAuditPlan.objects.all()

        return AnnualAuditPlan.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != "QMS":
            raise PermissionDenied("Only QMS users can create audit plans.")

        plan = serializer.save(created_by=self.request.user)

        # Queue the task only after the database transaction commits.
        transaction.on_commit(
            lambda: send_annual_audit_plan_notification.delay(plan.id)
        )

    def perform_update(self, serializer):
        if self.request.user.role != "QMS":
            raise PermissionDenied("Only QMS users can update audit plans.")

        plan = serializer.save()

        transaction.on_commit(
            lambda: send_annual_audit_plan_notification.delay(plan.id)
        )

    def perform_destroy(self, instance):
        if self.request.user.role != "QMS":
            raise PermissionDenied("Only QMS users can delete audit plans.")

        instance.delete()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ) 
    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response({
            "message": "Notification marked as read.",
            "is_read": notification.is_read,
        })

    def get_serializer_class(self):
        return NotificationSerializer


class NotificationSerializer(serializers.ModelSerializer):
    audit_year = serializers.IntegerField(
        source="annual_audit_plan.audit_year",
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "audit_year",
            "is_read",
            "created_at",
        ]