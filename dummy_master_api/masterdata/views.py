from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Department, Project, Employee
from .serializers import (
    DepartmentSerializer,
    ProjectSerializer,
    EmployeeSerializer
)


@api_view(['GET'])
def employee_list(request):
    employees = Employee.objects.all()
    serializer = EmployeeSerializer(employees, many=True)

    return Response(serializer.data)


@api_view(['GET'])
def department_list(request):
    departments = Department.objects.all()
    serializer = DepartmentSerializer(departments, many=True)

    return Response(serializer.data)


@api_view(['GET'])
def project_list(request):
    projects = Project.objects.all()
    serializer = ProjectSerializer(projects, many=True)

    return Response(serializer.data)