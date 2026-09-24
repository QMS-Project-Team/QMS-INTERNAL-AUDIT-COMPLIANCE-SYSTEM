from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets

from django.shortcuts import get_object_or_404

from accounts.permissions import IsDirector, IsQMS

from .models import Framework
from .models import Checklist, ChecklistItem
from .serializers import FrameworkSerializer
from .serializers import ChecklistSerializer, ChecklistItemSerializer


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
            permission_classes = [IsDirector | IsQMS]

        return [
            permission()
            for permission in permission_classes
        ]


class ChecklistItemViewSet(viewsets.ModelViewSet):
    """Items of one master checklist: /api/checklists/<checklist_id>/items/"""

    serializer_class = ChecklistItemSerializer

    def get_queryset(self):
        return ChecklistItem.objects.filter(
            checklist_id=self.kwargs["checklist_id"]
        )

    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]

        else:
            permission_classes = [IsDirector | IsQMS]

        return [
            permission()
            for permission in permission_classes
        ]

    def perform_create(self, serializer):
        checklist = get_object_or_404(
            Checklist,
            id=self.kwargs["checklist_id"]
        )

        serializer.save(checklist=checklist)
