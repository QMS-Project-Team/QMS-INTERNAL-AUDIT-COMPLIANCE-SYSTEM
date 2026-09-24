from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import LoginSerializer,UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(ListAPIView):
    """Read-only user directory, used by nomination / assignment pickers."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        queryset = User.objects.filter(is_active=True).order_by("username")

        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department=department)

        return queryset
