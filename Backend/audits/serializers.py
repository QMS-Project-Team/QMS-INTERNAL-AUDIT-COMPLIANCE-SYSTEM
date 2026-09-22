from rest_framework import serializers

from accounts.models import User

from .models import (Audit,AuditorNomination,AuditorAssignment,
                     AuditorOrientation,AuditSchedule,AuditConfirmation,
                     AuditChecklist,AuditChecklistItem)


class AuditSerializer(serializers.ModelSerializer):

    project_name = serializers.CharField(
        source="project.name",
        read_only=True
    )

    framework_name = serializers.CharField(
        source="framework.name",
        read_only=True
    )

    created_by_name = serializers.CharField(
        source="created_by.username",
        read_only=True
    )

    class Meta:
        model = Audit

        fields = [
            "id",
            "audit_code",
            "project",
            "project_name",
            "department",
            "framework",
            "framework_name",
            "created_by",
            "created_by_name",
            "planned_start_date",
            "planned_end_date",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_by_name",
            "project_name",
            "framework_name",
            "created_at",
            "updated_at",
        ]


class AuditorNominationSerializer(
    serializers.ModelSerializer
):

    auditor_name = serializers.CharField(
        source="auditor.username",
        read_only=True
    )

    nominated_by_name = serializers.CharField(
        source="nominated_by.username",
        read_only=True
    )

    class Meta:
        model = AuditorNomination

        fields = [
            "id",
            "audit",
            "auditor",
            "auditor_name",
            "nominated_by",
            "nominated_by_name",
            "nominated_at",
        ]

        read_only_fields = [
            "id",
            "audit",
            "nominated_by",
            "nominated_by_name",
            "nominated_at",
        ]

    def validate_auditor(self, value):

        if value.role != User.Role.AUDITOR:
            raise serializers.ValidationError(
                "Selected user must be an auditor."
            )

        return value

    def validate(self, attrs):

        auditor = attrs["auditor"]

        audit = self.context["audit"]

        if auditor.department == audit.department:
            raise serializers.ValidationError(
                "An auditor cannot audit their own department."
            )

        return attrs



class AuditorAssignmentSerializer(serializers.ModelSerializer):
    auditor_name = serializers.CharField(
        source="auditor.username",
        read_only=True
    )

    assigned_by_name = serializers.CharField(
        source="assigned_by.username",
        read_only=True
    )

    class Meta:
        model = AuditorAssignment

        fields = [
            "id",
            "audit",
            "auditor",
            "auditor_name",
            "assignment_type",
            "assigned_by",
            "assigned_by_name",
            "assigned_at",
        ]

        read_only_fields = [
            "id",
            "audit",
            "assigned_by",
            "assigned_by_name",
            "assigned_at",
        ]

    def validate_auditor(self, value):
        if value.role != User.Role.AUDITOR:
            raise serializers.ValidationError(
                "Selected user must be an auditor."
            )

        return value

    def validate(self, attrs):
        auditor = attrs["auditor"]
        audit = self.context["audit"]

        # Auditor cannot audit their own department
        if auditor.department == audit.department:
            raise serializers.ValidationError(
                "An auditor cannot audit their own department."
            )

        # Auditor must have been nominated for this audit
        is_nominated = AuditorNomination.objects.filter(
            audit=audit,
            auditor=auditor
        ).exists()

        if not is_nominated:
            raise serializers.ValidationError(
                "Auditor must be nominated for this audit before assignment."
            )

        return attrs


class AuditorOrientationSerializer(serializers.ModelSerializer):

    auditor_name = serializers.CharField(
        source="assignment.auditor.username",
        read_only=True
    )

    audit_code = serializers.CharField(
        source="assignment.audit.audit_code",
        read_only=True
    )

    class Meta:
        model = AuditorOrientation

        fields = [
            "id",
            "assignment",
            "auditor_name",
            "audit_code",
            "status",
            "completed_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "auditor_name",
            "audit_code",
            "completed_at",
            "created_at",
            "updated_at",
        ]


class AuditScheduleSerializer(serializers.ModelSerializer):
    audit_code = serializers.CharField(
        source="audit.audit_code",
        read_only=True
    )

    scheduled_by_name = serializers.CharField(
        source="scheduled_by.username",
        read_only=True
    )

    class Meta:
        model = AuditSchedule
        fields = [
            "id",
            "audit",
            "audit_code",
            "scheduled_start",
            "scheduled_end",
            "status",
            "scheduled_by",
            "scheduled_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "audit_code",
            "status",
            "scheduled_by",
            "scheduled_by_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        if attrs["scheduled_end"] <= attrs["scheduled_start"]:
            raise serializers.ValidationError(
                "Scheduled end must be after scheduled start."
            )

        return attrs


class AuditConfirmationSerializer(serializers.ModelSerializer):
    audit_code = serializers.CharField(
        source="schedule.audit.audit_code",
        read_only=True
    )

    confirmed_by_name = serializers.CharField(
        source="confirmed_by.username",
        read_only=True
    )

    class Meta:
        model = AuditConfirmation
        fields = [
            "id",
            "schedule",
            "audit_code",
            "confirmation_type",
            "confirmed_at",
            "confirmed_by",
            "confirmed_by_name",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "audit_code",
            "confirmed_at",
            "confirmed_by",
            "confirmed_by_name",
            "created_at",
        ]


class AuditChecklistItemSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(
        source="checklist_item.item_code",
        read_only=True
    )
    question = serializers.CharField(
        source="checklist_item.question",
        read_only=True
    )
    order = serializers.IntegerField(
        source="checklist_item.order",
        read_only=True
    )

    class Meta:
        model = AuditChecklistItem
        fields = [
            "id",
            "item_code",
            "question",
            "order",
            "result",
            "remarks",
        ]
        read_only_fields = [
            "id",
            "item_code",
            "question",
            "order",
        ]


class AuditChecklistSerializer(serializers.ModelSerializer):
    audit_code = serializers.CharField(
        source="audit.audit_code",
        read_only=True
    )
    checklist_name = serializers.CharField(
        source="checklist.name",
        read_only=True
    )
    framework_name = serializers.CharField(
        source="checklist.framework.name",
        read_only=True
    )
    department = serializers.CharField(
        source="audit.department",
        read_only=True
    )
    items = AuditChecklistItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = AuditChecklist
        fields = [
            "id",
            "audit",
            "audit_code",
            "checklist_name",
            "framework_name",
            "department",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "audit",
            "audit_code",
            "checklist_name",
            "framework_name",
            "department",
            "items",
            "created_at",
            "updated_at",
        ]