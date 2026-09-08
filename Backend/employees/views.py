from django.contrib.auth import authenticate
from .serializers import EmployeeSerializer, RegisterSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import Employee
from .serializers import EmployeeSerializer


# GET /api/employees/
# POST /api/employees/
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_list(request):

    employees = Employee.objects.all()

    serializer = EmployeeSerializer(
        employees,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


# POST /api/login/
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):

    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(
        username=username,
        password=password
    )

    if user is None:
        return Response(
            {"message": "Invalid username or password"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "message": "Login successful",
            "username": user.username,
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        },
        status=status.HTTP_200_OK
    )


# GET/PUT/PATCH/DELETE /api/employees/<id>/
@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail(request, id):

    try:
        employee = Employee.objects.get(id=id)

    except Employee.DoesNotExist:
        return Response(
            {"message": "Employee not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':

        serializer = EmployeeSerializer(employee)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    if request.method == 'PUT':

        serializer = EmployeeSerializer(
            employee,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'PATCH':

        serializer = EmployeeSerializer(
            employee,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == 'DELETE':

        employee.delete()

        return Response(
            {"message": "Employee deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):

    employee = request.user.employee

    return Response(
        {
            "id": employee.id,
            "username": request.user.username,
            "name": employee.name,
            "email": employee.email,
            "contact": employee.contact,
            "project": employee.project,
            "department": employee.department,
            "role": employee.role
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):

    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():

        employee = serializer.save()

        return Response(
            {
                "message": "Registration successful",
                "employee": EmployeeSerializer(employee).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):

    refresh_token = request.data.get('refresh')

    if not refresh_token:
        return Response(
            {"message": "Refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response(
            {"message": "Logout successful"},
            status=status.HTTP_205_RESET_CONTENT
        )

    except TokenError:
        return Response(
            {"message": "Invalid or expired refresh token"},
            status=status.HTTP_400_BAD_REQUEST
        )