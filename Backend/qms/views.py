from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Framework
from .serializers import FrameworkSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def framework_list(request):
    if request.method == 'GET':
        frameworks = Framework.objects.filter(is_active=True)
        return Response(
            FrameworkSerializer(frameworks, many=True).data
        )

    serializer = FrameworkSerializer(data=request.data)

    if serializer.is_valid():
        framework = serializer.save()
        return Response(
            FrameworkSerializer(framework).data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
