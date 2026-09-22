from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from checklists.models import ChecklistItem
from team.services import MasterAPIError, get_departments, get_projects
from .models import Audit, AuditAssignment, AuditSchedule, ChecklistResponse, Evidence, Finding, CorrectiveAction, Verification, AuditReport
from .serializers import (
    AuditListSerializer, AuditDetailSerializer, AuditCreateSerializer,
    AuditAssignmentSerializer, AuditScheduleSerializer, ChecklistResponseSerializer,
    EvidenceSerializer, FindingSerializer, CorrectiveActionSerializer, VerificationSerializer, AuditReportSerializer,
)
from .workflow import resolve_current_employee_code, master_employee_by_code, assert_auditor_allowed, audit_deadlines, record_event


def _error_from_master(exc):
    return Response({'message': str(exc) or 'Master employee service is unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _get_audit(pk):
    try:
        return Audit.objects.select_related('framework', 'checklist').get(pk=pk)
    except Audit.DoesNotExist:
        return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def audit_list(request):
    if request.method == 'GET':
        queryset = Audit.objects.select_related('framework', 'checklist').prefetch_related('assignments', 'schedule', 'responses', 'evidence', 'findings__actions', 'reports')
        for field, param in [('audit_year', 'year'), ('department_code', 'department'), ('status', 'status'), ('framework__code', 'framework')]:
            value = request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})
        return Response(AuditListSerializer(queryset, many=True).data)

    serializer = AuditCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    data = serializer.validated_data
    project_code = data.get('project_code', '')
    if project_code:
        try:
            projects = get_projects()
        except MasterAPIError as exc:
            return _error_from_master(exc)
        project = next((p for p in projects if p.get('project_code') == project_code), None)
        if not project:
            return Response({'project_code': 'Project does not exist in the master service.'}, status=400)
        department = project.get('department')
        project_department_id = department.get('id') if isinstance(department, dict) else department
        # The master project payload exposes department as an id. The checklist's department code
        # is the authoritative QMS department identifier, so only the project existence is enforced here.
        data['project_name'] = project.get('name', '')
    try:
        audit = Audit.objects.create(**data, created_by_username=request.user.username)
        record_event(audit, 'audit_created', 'Audit created.', request)
    except Exception as exc:
        return Response({'message': str(exc)}, status=400)
    return Response(AuditDetailSerializer(audit).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_detail(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    return Response(AuditDetailSerializer(audit).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_auditor(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    assignment_type = request.data.get('assignment_type')
    employee_code = request.data.get('employee_code')
    if assignment_type not in (AuditAssignment.AssignmentType.PRIMARY, AuditAssignment.AssignmentType.SECONDARY):
        return Response({'assignment_type': 'Use primary or secondary.'}, status=400)
    if not employee_code:
        return Response({'employee_code': 'This field is required.'}, status=400)
    try:
        existing = set(audit.assignments.values_list('employee_code', flat=True))
        employee = assert_auditor_allowed(audit, employee_code, existing)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    except Exception as exc:
        return Response(getattr(exc, 'detail', {'message': str(exc)}), status=400)
    if AuditAssignment.objects.filter(
        audit=audit,
        assignment_type=assignment_type,
    ).exists():
        return Response(
            {'message': f'{assignment_type.title()} auditor already assigned.'},
            status=400,
        )

    assignment = AuditAssignment.objects.create(
        audit=audit,
        assignment_type=assignment_type,
        employee_code=employee_code,
        employee_name=employee.get('name', ''),
    )
    record_event(audit, 'auditor_assigned', f'{assignment_type.title()} auditor {employee_code} assigned.', request, employee_code)
    return Response(AuditAssignmentSerializer(assignment).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_audit(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    if audit.assignments.count() != 2:
        return Response({'message': 'Primary and secondary auditors must be assigned before scheduling.'}, status=400)
    if audit.assignments.values('assignment_type').distinct().count() != 2:
        return Response({'message': 'Both primary and secondary auditor assignments are required.'}, status=400)
    serializer = AuditScheduleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    schedule, _ = AuditSchedule.objects.update_or_create(audit=audit, defaults=serializer.validated_data)
    audit.scheduled_start = schedule.start_at
    audit.scheduled_end = schedule.end_at
    audit.status = Audit.Status.SCHEDULED
    audit.save(update_fields=['scheduled_start', 'scheduled_end', 'status', 'updated_at'])
    record_event(audit, 'audit_scheduled', f'Audit scheduled for {schedule.start_at.isoformat()}.', request)
    return Response(AuditScheduleSerializer(schedule).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_schedule(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    try:
        schedule = audit.schedule
    except AuditSchedule.DoesNotExist:
        return Response({'message': 'Audit has not been scheduled.'}, status=400)
    now = timezone.now()
    schedule.confirmed_by_username = request.user.username
    schedule.confirmed_at = now
    schedule.uploaded_to_bebonet = bool(request.data.get('uploaded_to_bebonet', False))
    schedule.uploaded_at = now if schedule.uploaded_to_bebonet else None
    schedule.save()
    record_event(audit, 'schedule_confirmed', 'Audit schedule confirmed.', request)
    return Response(AuditScheduleSerializer(schedule).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_department(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    try:
        schedule = audit.schedule
    except AuditSchedule.DoesNotExist:
        return Response({'message': 'Audit has not been scheduled.'}, status=400)
    schedule.department_confirmed = True
    schedule.department_confirmed_at = timezone.now()
    schedule.save(update_fields=['department_confirmed', 'department_confirmed_at'])
    record_event(audit, 'department_confirmed', 'Department confirmed the audit schedule.', request)
    return Response(AuditScheduleSerializer(schedule).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_deadline_view(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    return Response(audit_deadlines(audit))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_response(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    if audit.status in (Audit.Status.CLOSED, Audit.Status.CANCELLED):
        return Response({'message': 'This audit is no longer editable.'}, status=400)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    serializer = ChecklistResponseSerializer(data=request.data, context={'audit': audit})
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    response, _ = ChecklistResponse.objects.update_or_create(
        audit=audit, item=serializer.validated_data['item'],
        defaults={**serializer.validated_data, 'responded_by_employee_code': code, 'responded_at': timezone.now()},
    )
    if audit.status == Audit.Status.SCHEDULED:
        audit.status = Audit.Status.IN_PROGRESS
        audit.save(update_fields=['status', 'updated_at'])
    record_event(audit, 'checklist_response', f'Checklist item {response.item_id} recorded as {response.result}.', request, code)
    return Response(ChecklistResponseSerializer(response).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def upload_evidence(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'file': 'A file is required.'}, status=400)
    response_id = request.data.get('response')
    response_obj = None
    if response_id:
        try:
            response_obj = ChecklistResponse.objects.get(id=response_id, audit=audit)
        except ChecklistResponse.DoesNotExist:
            return Response({'response': 'Response does not belong to this audit.'}, status=400)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    evidence = Evidence.objects.create(audit=audit, response=response_obj, file=file_obj,
        original_name=file_obj.name, description=request.data.get('description', ''), uploaded_by_employee_code=code)
    record_event(audit, 'evidence_uploaded', f'Evidence uploaded: {evidence.original_name}.', request, code)
    return Response(EvidenceSerializer(evidence).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_finding(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    if audit.scheduled_start and timezone.now() > audit.scheduled_start + __import__('datetime').timedelta(days=2):
        return Response({'message': 'Non-conformities must be logged within 2 days of the audit start.'}, status=400)
    serializer = FindingSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    data = serializer.validated_data
    if data.get('response') and data['response'].audit_id != audit.id:
        return Response({'response': 'Response does not belong to this audit.'}, status=400)
    finding = Finding.objects.create(audit=audit, raised_by_employee_code=code, **data)
    if finding.finding_type == Finding.FindingType.NON_CONFORMITY:
        audit.status = Audit.Status.AWAITING_ACTION
        audit.save(update_fields=['status', 'updated_at'])
    record_event(audit, 'finding_created', f'{finding.finding_type}: {finding.title}.', request, code)
    return Response(FindingSerializer(finding).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_action(request, finding_id):
    try:
        finding = Finding.objects.select_related('audit').get(id=finding_id)
    except Finding.DoesNotExist:
        return Response({'message': 'Finding not found'}, status=404)

    if finding.finding_type != Finding.FindingType.NON_CONFORMITY:
        return Response(
            {'message': 'Suggestions do not require corrective actions.'},
            status=400
        )

    serializer = CorrectiveActionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    action_type = serializer.validated_data['action_type']
    owner_code = serializer.validated_data['owner_employee_code']

    try:
        owner = master_employee_by_code(owner_code)
    except MasterAPIError as exc:
        return _error_from_master(exc)

    if not owner:
        return Response(
            {
                'owner_employee_code':
                'Owner does not exist in the master employee service.'
            },
            status=400
        )

    # Master API returns employee.department as a numeric department ID.
    # QMS audits store the department as a department code such as DEPT001.
    owner_dept = owner.get('department')

    if isinstance(owner_dept, dict):
        owner_dept_code = owner_dept.get('department_code')
    else:
        try:
            departments = get_departments()
        except MasterAPIError as exc:
            return _error_from_master(exc)

        department = next(
            (
                item for item in departments
                if item.get('id') == owner_dept
            ),
            None
        )

        owner_dept_code = (
            department.get('department_code')
            if department
            else None
        )

    # Correction, corrective action, and preventive action
    # must belong to the audited department.
    if (
        action_type != CorrectiveAction.ActionType.RISK
        and owner_dept_code != finding.audit.department_code
    ):
        return Response(
            {
                'owner_employee_code':
                'Correction, corrective action, and preventive action '
                'must be owned by the audited department.'
            },
            status=400
        )

    # Risk action must be owned by an assigned auditor.
    if (
        action_type == CorrectiveAction.ActionType.RISK
        and not finding.audit.assignments.filter(
            employee_code=owner_code
        ).exists()
    ):
        return Response(
            {
                'owner_employee_code':
                'Risk action must be owned by an assigned auditor.'
            },
            status=400
        )

    due_date = serializer.validated_data.get('due_date')

    if (
        due_date
        and finding.audit.scheduled_start
        and due_date > (
            finding.audit.scheduled_start.date()
            + __import__('datetime').timedelta(days=10)
        )
    ):
        return Response(
            {
                'due_date':
                'Corrective actions must be due within 10 days '
                'of the audit start.'
            },
            status=400
        )

    # Only an assigned auditor can create a risk action.
    if action_type == CorrectiveAction.ActionType.RISK:
        try:
            code, _ = resolve_current_employee_code(request)
        except MasterAPIError as exc:
            return _error_from_master(exc)

        if not finding.audit.assignments.filter(
            employee_code=code,
            assignment_type=AuditAssignment.AssignmentType.PRIMARY
        ).exists() and not finding.audit.assignments.filter(
            employee_code=code,
            assignment_type=AuditAssignment.AssignmentType.SECONDARY
        ).exists():
            return Response(
                {
                    'message':
                    'Risk action can only be created by an assigned auditor.'
                },
                status=403
            )

    action, created = CorrectiveAction.objects.get_or_create(
        finding=finding,
        action_type=action_type,
        defaults=serializer.validated_data
    )

    if not created:
        return Response(
            {'message': 'This action type already exists for the finding.'},
            status=409
        )

    record_event(
        finding.audit,
        'action_created',
        f'{action_type} created for finding {finding.id}.',
        request
    )

    return Response(
        CorrectiveActionSerializer(action).data,
        status=201
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_action(request, action_id):
    try:
        action = CorrectiveAction.objects.select_related('finding__audit').get(id=action_id)
    except CorrectiveAction.DoesNotExist:
        return Response({'message': 'Corrective action not found.'}, status=404)
    if action.status not in (CorrectiveAction.Status.OPEN, CorrectiveAction.Status.REWORK):
        return Response({'message': 'Only open or rework actions can be submitted.'}, status=400)
    action.description = request.data.get('description', action.description)
    action.owner_employee_code = request.data.get('owner_employee_code', action.owner_employee_code)
    action.due_date = request.data.get('due_date', action.due_date)
    action.status = CorrectiveAction.Status.SUBMITTED
    action.submitted_at = timezone.now()
    action.save()
    record_event(action.finding.audit, 'action_submitted', f'Action {action.id} submitted.', request, action.owner_employee_code)
    audit = action.finding.audit
    if not audit.findings.filter(finding_type=Finding.FindingType.NON_CONFORMITY, actions__status__in=[CorrectiveAction.Status.OPEN, CorrectiveAction.Status.REWORK]).exists():
        audit.status = Audit.Status.AWAITING_VERIFICATION
        audit.save(update_fields=['status', 'updated_at'])
    return Response(CorrectiveActionSerializer(action).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_action(request, action_id):
    try:
        action = CorrectiveAction.objects.select_related('finding__audit').get(id=action_id)
    except CorrectiveAction.DoesNotExist:
        return Response({'message': 'Corrective action not found.'}, status=404)
    if action.status != CorrectiveAction.Status.SUBMITTED:
        return Response({'message': 'Only submitted actions can be verified.'}, status=400)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    if not action.finding.audit.assignments.filter(employee_code=code).exists():
        return Response({'message': 'Only an assigned auditor can verify an action.'}, status=403)
    decision = request.data.get('decision')
    if decision not in (Verification.Decision.ACCEPTED, Verification.Decision.REJECTED):
        return Response({'decision': 'Use accepted or rejected.'}, status=400)
    Verification.objects.create(action=action, decision=decision, comments=request.data.get('comments', ''), verified_by_employee_code=code)
    record_event(action.finding.audit, 'action_verified', f'Action {action.id} verified as {decision}.', request, code)
    action.status = CorrectiveAction.Status.ACCEPTED if decision == Verification.Decision.ACCEPTED else CorrectiveAction.Status.REWORK
    action.save(update_fields=['status'])
    audit = action.finding.audit
    if decision == Verification.Decision.ACCEPTED:
        required_types = {CorrectiveAction.ActionType.CORRECTION, CorrectiveAction.ActionType.CORRECTIVE, CorrectiveAction.ActionType.PREVENTIVE, CorrectiveAction.ActionType.RISK}
        finding_actions = set(action.finding.actions.values_list('action_type', flat=True))
        if required_types.issubset(finding_actions) and not action.finding.actions.exclude(status__in=[CorrectiveAction.Status.ACCEPTED, CorrectiveAction.Status.CLOSED]).exists():
            action.finding.is_closed = True
            action.finding.save(update_fields=['is_closed'])
        remaining = CorrectiveAction.objects.filter(finding__audit=audit).exclude(status__in=[CorrectiveAction.Status.ACCEPTED, CorrectiveAction.Status.CLOSED]).exists()
        if not remaining:
            audit.status = Audit.Status.AWAITING_VERIFICATION
            audit.save(update_fields=['status', 'updated_at'])
    else:
        audit.status = Audit.Status.AWAITING_ACTION
        audit.save(update_fields=['status', 'updated_at'])
    return Response({'decision': decision, 'action': CorrectiveActionSerializer(action).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_report(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    report_type = request.data.get('report_type')
    content = request.data.get('content')
    if report_type not in (AuditReport.ReportType.INITIAL, AuditReport.ReportType.CLOSURE):
        return Response({'report_type': 'Use initial or closure.'}, status=400)
    if not content:
        return Response({'content': 'This field is required.'}, status=400)
    report, _ = AuditReport.objects.update_or_create(audit=audit, report_type=report_type,
        defaults={'content': content, 'created_by_employee_code': code, 'confirmed_at': None})
    record_event(audit, 'report_created', f'{report_type.title()} report created.', request, code)
    return Response(AuditReportSerializer(report).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_report(request, report_id):
    try:
        report = AuditReport.objects.select_related('audit').get(id=report_id)
    except AuditReport.DoesNotExist:
        return Response({'message': 'Report not found.'}, status=404)
    report.confirmed_at = timezone.now()
    report.save(update_fields=['confirmed_at'])
    return Response(AuditReportSerializer(report).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_audit(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    if audit.status == Audit.Status.CLOSED:
        return Response({'message': 'Audit is already closed.'}, status=400)
    try:
        code, _ = resolve_current_employee_code(request)
    except MasterAPIError as exc:
        return _error_from_master(exc)
    if not audit.assignments.filter(employee_code=code).exists() and not request.user.is_superuser:
        return Response({'message': 'Only an assigned auditor or administrator can close an audit.'}, status=403)
    if not audit.reports.filter(report_type=AuditReport.ReportType.CLOSURE, confirmed_at__isnull=False).exists():
        return Response({'message': 'A confirmed closure report is required before closing the audit.'}, status=400)
    mandatory_items = ChecklistItem.objects.filter(checklist=audit.checklist, is_mandatory=True)
    answered_items = set(audit.responses.exclude(result=ChecklistResponse.Result.PENDING).values_list('item_id', flat=True))
    missing_items = [item.item_number for item in mandatory_items if item.id not in answered_items]
    if missing_items:
        return Response({'message': f'Mandatory checklist items are unanswered: {missing_items}'}, status=400)
    non_compliant_response_ids = set(audit.responses.filter(result=ChecklistResponse.Result.NON_COMPLIANT).values_list('id', flat=True))
    finding_response_ids = set(audit.findings.filter(finding_type=Finding.FindingType.NON_CONFORMITY).exclude(response_id__isnull=True).values_list('response_id', flat=True))
    if non_compliant_response_ids - finding_response_ids:
        return Response({'message': 'Every non-compliant checklist response must have a corresponding non-conformity before closure.'}, status=400)
    if audit.scheduled_start and timezone.now() > audit.scheduled_start + __import__('datetime').timedelta(days=15):
        return Response({'message': 'The audit cannot be closed after the 15-day audit deadline without an escalation/authority override.'}, status=400)
    for finding in audit.findings.filter(finding_type=Finding.FindingType.NON_CONFORMITY):
        required = {CorrectiveAction.ActionType.CORRECTION, CorrectiveAction.ActionType.CORRECTIVE, CorrectiveAction.ActionType.PREVENTIVE, CorrectiveAction.ActionType.RISK}
        existing = set(finding.actions.values_list('action_type', flat=True))
        if required - existing:
            return Response({'message': f'Finding {finding.id} must have all four required action measures before closure.'}, status=400)
    open_actions = CorrectiveAction.objects.filter(finding__audit=audit).exclude(status__in=[CorrectiveAction.Status.ACCEPTED, CorrectiveAction.Status.CLOSED]).exists()
    if open_actions:
        return Response({'message': 'All corrective actions must be accepted or closed before the audit can be closed.'}, status=400)
    audit.status = Audit.Status.CLOSED
    audit.closed_at = timezone.now()
    audit.save(update_fields=['status', 'closed_at', 'updated_at'])
    record_event(audit, 'audit_closed', 'Audit closed.', request, code)
    return Response(AuditDetailSerializer(audit).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_history(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    return Response([{'id': e.id, 'event_type': e.event_type, 'actor_employee_code': e.actor_employee_code, 'actor_username': e.actor_username, 'message': e.message, 'created_at': e.created_at} for e in audit.events.all()])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_notifications(request, pk):
    audit = _get_audit(pk)
    if not audit:
        return Response({'message': 'Audit not found'}, status=404)
    return Response([{'id': n.id, 'notification_type': n.notification_type, 'recipient_username': n.recipient_username, 'message': n.message, 'due_at': n.due_at, 'sent_at': n.sent_at} for n in audit.notifications.all()])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_dashboard(request):
    year = request.query_params.get('year')
    queryset = Audit.objects.all()
    if year:
        queryset = queryset.filter(audit_year=year)
    return Response({
        'total': queryset.count(),
        'draft': queryset.filter(status=Audit.Status.DRAFT).count(),
        'scheduled': queryset.filter(status=Audit.Status.SCHEDULED).count(),
        'in_progress': queryset.filter(status=Audit.Status.IN_PROGRESS).count(),
        'awaiting_action': queryset.filter(status=Audit.Status.AWAITING_ACTION).count(),
        'awaiting_verification': queryset.filter(status=Audit.Status.AWAITING_VERIFICATION).count(),
        'closed': queryset.filter(status=Audit.Status.CLOSED).count(),
        'cancelled': queryset.filter(status=Audit.Status.CANCELLED).count(),
        'non_conformities': sum(a.findings.filter(finding_type=Finding.FindingType.NON_CONFORMITY).count() for a in queryset.prefetch_related('findings')),
    })
