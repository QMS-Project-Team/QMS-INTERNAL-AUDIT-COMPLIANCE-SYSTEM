<<<<<<< HEAD
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import (
    MasterAPIResponseError,
    MasterAPITimeoutError,
    MasterAPIUnavailableError,
    get_departments,
    get_employees,
    get_projects,
)


def _master_api_call(fetch):
    try:
        return Response(fetch())
    except MasterAPITimeoutError:
        return Response(
            {"error": "master_api_timeout", "message": "The external master data service timed out."},
            status=504,
        )
    except MasterAPIUnavailableError:
        return Response(
            {"error": "master_api_unavailable", "message": "The external master data service is currently unavailable."},
            status=503,
        )
    except MasterAPIResponseError:
        return Response(
            {"error": "master_api_error", "message": "The external master data service returned an invalid response."},
            status=502,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def employees(request):
    return _master_api_call(get_employees)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def departments(request):
    return _master_api_call(get_departments)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def projects(request):
    return _master_api_call(get_projects)
=======
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
>>>>>>> development
