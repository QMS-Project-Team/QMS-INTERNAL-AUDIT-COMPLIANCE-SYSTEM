from rest_framework import serializers

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):

    project_owner_name = serializers.CharField(
        source="project_owner.username",
        read_only=True
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "project_code",
            "name",
            "department",
            "project_owner",
            "project_owner_name",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "project_owner",
            "project_owner_name",
            "created_at",
            "updated_at",
        ]