from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from accounts.permissions import IsDirector, IsManager, IsQMS

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
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

        if user.role in ["QMS","DIRECTOR", "MANAGER"]:
            return Project.objects.all()

        # if user.role in ["DIRECTOR", "MANAGER"]:
        #     return Project.objects.filter(
        #         project_owner=user
        #     )

        return Project.objects.none()

    def perform_create(self, serializer):
        serializer.save(
            project_owner=self.request.user
        )