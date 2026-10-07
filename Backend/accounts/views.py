from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from rest_framework import viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User,Department
from .serializers import LoginSerializer,UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True).order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class DepartmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        departments = Department.objects.filter(
            is_active=True
        ).values(
            "id",
            "name"
        )

        return Response(departments)
