from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets

from accounts.permissions import IsQMS

from .models import Framework
from .models import Checklist
from .serializers import FrameworkSerializer
from .serializers import ChecklistSerializer


class FrameworkViewSet(ModelViewSet):

    queryset = Framework.objects.all()

    serializer_class = FrameworkSerializer

    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [
                IsAuthenticated,
            ]

        elif self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
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


class ChecklistViewSet(viewsets.ModelViewSet):

    queryset = Checklist.objects.all()
    serializer_class = ChecklistSerializer

    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]

        else:
            permission_classes = [IsQMS]

        return [
            permission()
            for permission in permission_classes
        ]