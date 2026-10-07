from rest_framework import serializers

from accounts.models import User
from projects.models import Project, ProjectMember

from .models import (Audit,AuditorAssignment,
                     AuditorOrientation,AuditSchedule,AuditConfirmation,
                     AuditChecklist,AuditChecklistItem,AuditNC)


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
            "department",
            "created_by",
            "created_by_name",
            "project_name",
            "framework_name",
            "progress",
            "my_assignment",
            "status",
            "created_at",
            "updated_at",
        ]


    def validate(self, attrs):

        project = attrs.get("project")
        framework = attrs.get("framework")

        if not project:
            raise serializers.ValidationError({
                "project": "Project is required."
            })

        if not framework:
            raise serializers.ValidationError({
                "framework": "Framework is required."
            })

        # Project must be active
        if project.status != Project.Status.ACTIVE:
            raise serializers.ValidationError({
                "project": "Only active projects can be audited."
            })

        # Framework must be active
        if not framework.is_active:
            raise serializers.ValidationError({
                "framework": "Only active frameworks can be used for an audit."
            })

        # A project must have exactly one Primary POC
        primary_poc_count = project.members.filter(
            poc_type=ProjectMember.POCType.PRIMARY
        ).count()

        if primary_poc_count != 1:
            raise serializers.ValidationError(
            {
                "project": (
                    "The selected project must have exactly one Primary POC "
                    "before an audit can be created."
                )
            }
        )

        # A project must have exactly one Secondary POC
        secondary_poc_count = project.members.filter(
            poc_type=ProjectMember.POCType.SECONDARY
        ).count()

        if secondary_poc_count != 1:
            raise serializers.ValidationError(
            {
                "project": (
                    "The selected project must have exactly one Secondary POC "
                    "before an audit can be created."
                )
            }
        )

        # Planned end date must be after planned start date
        start_date = attrs.get(
            "planned_start_date",
            getattr(self.instance, "planned_start_date", None)
        )

        end_date = attrs.get(
            "planned_end_date",
            getattr(self.instance, "planned_end_date", None)
        )

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({
                "planned_end_date": (
                    "Planned end date must be after planned start date."
                )
            })

        return attrs

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
        ncs = {"total": 0, "awaiting_action": 0, "awaiting_verification": 0,
               "rework_required": 0, "accepted": 0}
        if hasattr(audit, "audit_checklist"):
            items = list(audit.audit_checklist.items.all())
            results = [item.result for item in items]
            checklist = {
                "id": audit.audit_checklist.id,
                "name": audit.audit_checklist.checklist.name,
                "item_count": len(items),
                "compliant": results.count(AuditChecklistItem.Result.COMPLIANT),
                "non_compliant": results.count(AuditChecklistItem.Result.NON_COMPLIANT),
                "pending": results.count(AuditChecklistItem.Result.PENDING),
            }

            for nc in AuditNC.objects.filter(audit_checklist_item__in=items):
                ncs["total"] += 1
                if nc.status == AuditNC.Status.ACCEPTED:
                    ncs["accepted"] += 1
                elif nc.status == AuditNC.Status.REWORK_REQUIRED:
                    ncs["rework_required"] += 1
                elif nc.correction.strip() or nc.corrective_action.strip():
                    ncs["awaiting_verification"] += 1
                else:
                    ncs["awaiting_action"] += 1

        return {
            "auditors": auditors,
            "orientations_total": sum(1 for a in auditors if a["orientation_status"]),
            "orientations_completed": sum(
                1 for a in auditors if a["orientation_status"] == "COMPLETED"
            ),
            "checklist": checklist,
            "schedule": schedule,
            "confirmations": confirmations,
            "ncs": ncs,
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
            "audit",
            "assigned_by",
            "assigned_at",
        ]

    def validate(self, attrs):
        audit = self.context["audit"]
        auditor = attrs.get("auditor")
        assignment_type = attrs.get("assignment_type")

        # 1. Auditor must be an employee
        if auditor.role != User.Role.EMPLOYEE:
            raise serializers.ValidationError(
                "Selected auditor must be an employee."
            )

        # 2. Employee must be a member of a project
        membership = ProjectMember.objects.filter(
            employee=auditor
        ).select_related("project").first()

        if not membership:
            raise serializers.ValidationError(
                "Selected employee is not a member of any project."
            )

        # 3. Employee cannot have POC type NONE
        if membership.poc_type == ProjectMember.POCType.NONE:
            raise serializers.ValidationError(
                "Selected employee must have a valid POC type."
            )

        # 4. Employee must come from a different project
        if membership.project_id == audit.project_id:
            raise serializers.ValidationError(
                "Auditor cannot belong to the audited project."
            )

        # 5. Prevent duplicate assignment of same employee
        if AuditorAssignment.objects.filter(
            audit=audit,
            auditor=auditor
        ).exists():
            raise serializers.ValidationError(
                "This employee is already assigned to this audit."
            )

        # 6. Only PRIMARY / SECONDARY assignments
        if assignment_type not in [
            AuditorAssignment.AssignmentType.PRIMARY,
            AuditorAssignment.AssignmentType.SECONDARY,
        ]:
            raise serializers.ValidationError(
                "Assignment type must be PRIMARY or SECONDARY."
            )

        # 7. Only one PRIMARY / SECONDARY
        if AuditorAssignment.objects.filter(
            audit=audit,
            assignment_type=assignment_type
        ).exists():
            raise serializers.ValidationError(
                f"This audit already has a {assignment_type} auditor."
            )

        active_assignment = AuditorAssignment.objects.filter(
            auditor=auditor
        ).exclude(
            audit__status=Audit.Status.CLOSED
        ).exists()

        if active_assignment:
            raise serializers.ValidationError(
                {
                    "auditor": (
                        "This employee is already assigned as an auditor "
                        "to an active audit."
                    )
                }
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

    t15_date = serializers.DateTimeField(read_only=True)
    t7_date = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AuditSchedule
        fields = [
            "id",
            "audit",
            "audit_code",
            "scheduled_start",
            "scheduled_end",
            "t15_date",
            "t7_date",
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
            "t15_date",
            "t7_date",
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

class AuditNCSerializer(serializers.ModelSerializer):

    checklist_item_id = serializers.IntegerField(
        source="audit_checklist_item.id",
        read_only=True
    )

    item_code = serializers.CharField(
        source="audit_checklist_item.checklist_item.item_code",
        read_only=True
    )

    question = serializers.CharField(
        source="audit_checklist_item.checklist_item.question",
        read_only=True
    )

    project_name = serializers.CharField(
        source="audit_checklist_item.audit_checklist.audit.project.name",
        read_only=True
    )

    verified_by_name = serializers.CharField(
        source="verified_by.username",
        read_only=True
    )

    class Meta:
        model = AuditNC

        fields = [
            "id",
            "checklist_item_id",
            "item_code",
            "question",
            "project_name",

            "finding",
            "risk_action",
            "correction",
            "corrective_action",
            "preventive_action",

            "status",

            "verified_by",
            "verified_by_name",
            "verified_at",
            "verification_remarks",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "checklist_item_id",
            "item_code",
            "question",
            "project_name",

            "status",

            "verified_by",
            "verified_by_name",
            "verified_at",
            "verification_remarks",

            "created_at",
            "updated_at",
        ]