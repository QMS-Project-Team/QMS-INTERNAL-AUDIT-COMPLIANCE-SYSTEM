from rest_framework import serializers
from accounts.models import User
from .models import Project,ProjectMember


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


class ProjectMemberSerializer(serializers.ModelSerializer):

    employee_name = serializers.CharField(
        source="employee.username",
        read_only=True
    )

    class Meta:
        model = ProjectMember
        fields = [
            "id",
            "project",
            "employee",
            "employee_name",
            "poc_type",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "project",
            "employee_name",
            "created_at",
            "updated_at",
        ]

    def validate_employee(self, employee):

        if employee.role != User.Role.EMPLOYEE:
            raise serializers.ValidationError(
                "Only Employees can be added as project members."
            )

        return employee
    
    def validate_poc_type(self, poc_type):

        project = self.instance.project

        if poc_type == ProjectMember.POCType.PRIMARY:
            exists = ProjectMember.objects.filter(
                project=project,
                poc_type=ProjectMember.POCType.PRIMARY
            ).exclude(
                id=self.instance.id
            ).exists()

            if exists:
                raise serializers.ValidationError(
                    "This project already has a Primary POC."
                )

        if poc_type == ProjectMember.POCType.SECONDARY:
            exists = ProjectMember.objects.filter(
                project=project,
                poc_type=ProjectMember.POCType.SECONDARY
            ).exclude(
                id=self.instance.id
            ).exists()

            if exists:
                raise serializers.ValidationError(
                    "This project already has a Secondary POC."
                )

        return poc_type
    