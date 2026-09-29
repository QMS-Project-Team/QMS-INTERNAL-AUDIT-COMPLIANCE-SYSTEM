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

    # Read-only workflow summary so list screens don't need one call per audit.
    progress = serializers.SerializerMethodField()

    my_assignment = serializers.SerializerMethodField()

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
            "progress",
            "my_assignment",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_by_name",
            "project_name",
            "framework_name",
            "progress",
            "my_assignment",
            "created_at",
            "updated_at",
        ]

    def get_progress(self, audit):
        assignments = list(audit.auditor_assignments.all())

        auditors = []
        for assignment in assignments:
            orientation = getattr(assignment, "orientation", None)
            auditors.append({
                "assignment_id": assignment.id,
                "auditor": assignment.auditor_id,
                "auditor_name": assignment.auditor.username,
                "assignment_type": assignment.assignment_type,
                "orientation_status": orientation.status if orientation else None,
            })

        schedule = None
        confirmations = []
        if hasattr(audit, "schedule"):
            schedule = {
                "id": audit.schedule.id,
                "scheduled_start": audit.schedule.scheduled_start,
                "scheduled_end": audit.schedule.scheduled_end,
                "status": audit.schedule.status,
            }
            confirmations = sorted(
                c.confirmation_type for c in audit.schedule.confirmations.all()
            )

        checklist = None
        if hasattr(audit, "audit_checklist"):
            checklist = {
                "id": audit.audit_checklist.id,
                "name": audit.audit_checklist.checklist.name,
                "item_count": len(audit.audit_checklist.items.all()),
            }

        return {
            "nomination_count": len(audit.auditor_nominations.all()),
            "auditors": auditors,
            "orientations_total": sum(1 for a in auditors if a["orientation_status"]),
            "orientations_completed": sum(
                1 for a in auditors if a["orientation_status"] == "COMPLETED"
            ),
            "checklist": checklist,
            "schedule": schedule,
            "confirmations": confirmations,
        }

    def get_my_assignment(self, audit):
        """The requesting user's own assignment on this audit, if any."""
        request = self.context.get("request")
        if not request:
            return None

        for assignment in audit.auditor_assignments.all():
            if assignment.auditor_id == request.user.id:
                orientation = getattr(assignment, "orientation", None)
                return {
                    "assignment_id": assignment.id,
                    "assignment_type": assignment.assignment_type,
                    "orientation_id": orientation.id if orientation else None,
                    "orientation_status": orientation.status if orientation else None,
                    "orientation_completed_at": (
                        orientation.completed_at if orientation else None
                    ),
                }

        return None


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

        duplicate = AuditorNomination.objects.filter(
            audit=audit,
            auditor=auditor
        )

        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)

        if duplicate.exists():
            raise serializers.ValidationError(
                "This auditor is already nominated for this audit."
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

        duplicate = AuditorAssignment.objects.filter(
            audit=audit,
            auditor=auditor
        )

        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)

        if duplicate.exists():
            raise serializers.ValidationError(
                "This auditor is already assigned to this audit."
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
            "audit",
            "audit_code",
            "status",
            "scheduled_by",
            "scheduled_by_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start = attrs.get(
            "scheduled_start",
            getattr(self.instance, "scheduled_start", None)
        )
        end = attrs.get(
            "scheduled_end",
            getattr(self.instance, "scheduled_end", None)
        )

        if start and end and end <= start:
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
            "schedule",
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