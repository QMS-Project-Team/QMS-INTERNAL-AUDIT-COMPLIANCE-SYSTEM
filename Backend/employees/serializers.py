from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Employee
        fields = [
            'id',
            'name',
            'email',
            'contact',
            'project',
            'department',
            'role'
        ]


class RegisterSerializer(serializers.Serializer):

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    contact = serializers.CharField(max_length=15)
    project = serializers.CharField(max_length=100)
    department = serializers.CharField(max_length=100)
    role = serializers.CharField(max_length=100)

    def validate_username(self, value):

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "Username already exists."
            )

        return value

    def validate_email(self, value):

        if Employee.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )

        return value

    def create(self, validated_data):

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )

        employee = Employee.objects.create(
            user=user,
            name=validated_data['name'],
            email=validated_data['email'],
            contact=validated_data['contact'],
            project=validated_data['project'],
            department=validated_data['department'],
            role=validated_data['role']
        )

        return employee