from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from rest_framework.response import Response

from .services import (
    get_employees,
    get_departments,
    get_projects
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees(request):
    data = get_employees()

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def departments(request):
    data = get_departments()

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projects(request):
    data = get_projects()

    return Response(data)
