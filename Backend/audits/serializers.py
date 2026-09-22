from django.utils import timezone
from rest_framework import serializers

from .models import (
    Audit, AuditAssignment, AuditSchedule, ChecklistResponse, Evidence,
    Finding, CorrectiveAction, Verification, AuditReport,
)
from checklists.models import ChecklistItem


class AuditAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditAssignment
        fields = ['id', 'employee_code', 'employee_name', 'assignment_type', 'assigned_at']
        read_only_fields = ['id', 'employee_name', 'assigned_at']


class AuditScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditSchedule
        fields = ['id', 'start_at', 'end_at', 'confirmed_by_username', 'confirmed_at',
                  'department_confirmed', 'department_confirmed_at', 'uploaded_to_bebonet', 'uploaded_at']
        read_only_fields = ['id', 'confirmed_by_username', 'confirmed_at', 'department_confirmed_at', 'uploaded_at']

    def validate(self, attrs):
        if attrs['end_at'] <= attrs['start_at']:
            raise serializers.ValidationError({'end_at': 'End time must be after start time.'})
        return attrs


class ChecklistResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistResponse
        fields = ['id', 'item', 'result', 'response_value', 'auditor_comment',
                  'responded_by_employee_code', 'responded_at']
        read_only_fields = ['id', 'responded_by_employee_code', 'responded_at']

    def validate_item(self, value):
        audit = self.context.get('audit')
        if audit and value.checklist_id != audit.checklist_id:
            raise serializers.ValidationError('Checklist item does not belong to this audit checklist.')
        return value


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ['id', 'response', 'file', 'original_name', 'description',
                  'uploaded_by_employee_code', 'uploaded_at']
        read_only_fields = ['id', 'original_name', 'uploaded_by_employee_code', 'uploaded_at']


class CorrectiveActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectiveAction
        fields = ['id', 'action_type', 'description', 'owner_employee_code', 'due_date',
                  'status', 'submitted_at', 'closed_at']
        read_only_fields = ['id', 'status', 'submitted_at', 'closed_at']


class FindingSerializer(serializers.ModelSerializer):
    actions = CorrectiveActionSerializer(many=True, read_only=True)
    class Meta:
        model = Finding
        fields = ['id', 'response', 'finding_type', 'title', 'description', 'severity',
                  'raised_by_employee_code', 'raised_at', 'is_closed', 'actions']
        read_only_fields = ['id', 'raised_by_employee_code', 'raised_at', 'is_closed', 'actions']

    def validate(self, attrs):
        if attrs.get('finding_type') == Finding.FindingType.NON_CONFORMITY and not attrs.get('severity'):
            raise serializers.ValidationError({'severity': 'Severity is required for a non-conformity.'})
        if attrs.get('finding_type') == Finding.FindingType.SUGGESTION:
            attrs['severity'] = ''
        return attrs


class VerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verification
        fields = ['id', 'action', 'decision', 'comments', 'verified_by_employee_code', 'verified_at']
        read_only_fields = ['id', 'verified_by_employee_code', 'verified_at']


class AuditReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditReport
        fields = ['id', 'report_type', 'content', 'created_by_employee_code', 'created_at', 'confirmed_at']
        read_only_fields = ['id', 'created_by_employee_code', 'created_at', 'confirmed_at']


class AuditCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audit
        fields = ['id', 'framework', 'checklist', 'department_code', 'department_name', 'project_code', 'project_name', 'audit_year', 'cycle', 'status']
        read_only_fields = ['id', 'department_name', 'project_name', 'status']

    def validate(self, attrs):
        checklist = attrs['checklist']
        framework = attrs['framework']
        if checklist.framework_id != framework.id:
            raise serializers.ValidationError({'checklist': 'Checklist belongs to a different framework.'})
        if checklist.department_code != attrs['department_code']:
            raise serializers.ValidationError({'department_code': 'Department does not match the selected checklist.'})
        if not checklist.is_active:
            raise serializers.ValidationError({'checklist': 'Selected checklist is inactive.'})
        attrs['project_code'] = attrs.get('project_code', '')
        attrs['department_name'] = checklist.department_name
        return attrs


class AuditListSerializer(serializers.ModelSerializer):
    framework_code = serializers.CharField(source='framework.code', read_only=True)
    checklist_title = serializers.CharField(source='checklist.title', read_only=True)
    class Meta:
        model = Audit
        fields = ['id', 'framework', 'framework_code', 'checklist', 'checklist_title', 'department_code',
                  'department_name', 'project_code', 'project_name', 'audit_year', 'cycle', 'status', 'scheduled_start', 'scheduled_end',
                  'created_by_username', 'created_at', 'updated_at', 'closed_at']


class AuditDetailSerializer(AuditListSerializer):
    assignments = AuditAssignmentSerializer(many=True, read_only=True)
    schedule = AuditScheduleSerializer(read_only=True)
    responses = ChecklistResponseSerializer(many=True, read_only=True)
    evidence = EvidenceSerializer(many=True, read_only=True)
    findings = FindingSerializer(many=True, read_only=True)
    reports = AuditReportSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()
    def get_events(self, obj):
        return [{'id': e.id, 'event_type': e.event_type, 'actor_employee_code': e.actor_employee_code, 'actor_username': e.actor_username, 'message': e.message, 'created_at': e.created_at} for e in obj.events.all()]

    class Meta(AuditListSerializer.Meta):
        fields = AuditListSerializer.Meta.fields + ['assignments', 'schedule', 'responses', 'evidence', 'findings', 'reports', 'events']
