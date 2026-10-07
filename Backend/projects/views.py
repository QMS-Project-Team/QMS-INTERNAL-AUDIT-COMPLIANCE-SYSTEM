from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import IsDirector, IsQMS, IsDirectorOrQMS
from accounts.models import User
from audits.models import Audit,AuditorAssignment
from .models import Project,ProjectMember
from .serializers import ProjectSerializer,ProjectMemberSerializer


class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [
                IsAuthenticated,
            ]

        elif self.action == "create":
            permission_classes = [
                IsDirector,
            ]

        elif self.action in ["update", "partial_update", "destroy"]:
            permission_classes = [
                IsDirector,
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

        queryset = Project.objects.select_related(
            "department",
            "project_owner"
        )

        if user.role == User.Role.DIRECTOR:
            return queryset.filter(project_owner=user)

        if user.role == User.Role.QMS:
            return queryset

        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(
            project_owner=self.request.user
        )


class ProjectMemberViewSet(ModelViewSet):

    serializer_class = ProjectMemberSerializer
    permission_classes = [IsDirector]

    def get_queryset(self):

        project_id = self.kwargs["project_id"]

        return ProjectMember.objects.filter(
            project_id=project_id,
            project__project_owner=self.request.user
        ).select_related(
            "employee",
            "project",
            "project__department"
        )

    def perform_create(self, serializer):

        project_id = self.kwargs["project_id"]

        try:
            project = Project.objects.get(
                id=project_id
            )
        except Project.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Project not found.")

        if project.project_owner != self.request.user:
            raise PermissionDenied(
                "You can only manage members of your own projects."
            )

        serializer.save(
            project=project,
            poc_type=ProjectMember.POCType.NONE
        )



class POCListView(APIView):

    permission_classes = [IsQMS]

    def get(self, request):

        pocs = ProjectMember.objects.filter(
            poc_type__in=[
                ProjectMember.POCType.PRIMARY,
                ProjectMember.POCType.SECONDARY,
                ProjectMember.POCType.ADDITIONAL,
            ]
        ).select_related(
            "employee",
            "project",
            "project__department"
        )

        data = [
            {
                "id": poc.id,
                "employee": poc.employee.id,
                "employee_name": poc.employee.username,
                "project": poc.project.id,
                "project_name": poc.project.name,
                "project_code": poc.project.project_code,
                "department": poc.project.department.name,
                "poc_type": poc.poc_type,
            }
            for poc in pocs
        ]

        return Response(data)


class EligibleAuditorListView(APIView):

    permission_classes = [IsQMS]

    def get(self, request, project_id):


        active_auditor_ids = AuditorAssignment.objects.filter(
            audit__status__in=[
                Audit.Status.PENDING_ASSIGNMENT,
                Audit.Status.ASSIGNED,
                Audit.Status.IN_PROGRESS,
                Audit.Status.PENDING_CLOSURE,
            ]
        ).values_list("auditor_id", flat=True)


        eligible_pocs = ProjectMember.objects.filter(
            employee__role=User.Role.EMPLOYEE,
            poc_type__in=[
                ProjectMember.POCType.PRIMARY,
                ProjectMember.POCType.SECONDARY,
                ProjectMember.POCType.ADDITIONAL,
            ]
        ).exclude(
            project_id=project_id
        ).exclude(
            employee_id__in=active_auditor_ids
        ).select_related(
            "employee",
            "project",
            "project__department"
        )

        data = [
            {
                "id": poc.id,
                "employee": poc.employee.id,
                "employee_name": poc.employee.username,
                "project": poc.project.id,
                "project_name": poc.project.name,
                "project_code": poc.project.project_code,
                "department": poc.project.department.name,
                "poc_type": poc.poc_type,
            }
            for poc in eligible_pocs
        ]

        return Response(data)