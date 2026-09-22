from rest_framework import serializers
from .models import Department, Project, Employee


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            'id',
            'department_code',
            'name'
        ]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id',
            'project_code',
            'name',
            'description',
            'department'
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_code',
            'name',
            'email',
            'contact',
            'role',
            'department',
            'projects'
        ]