from rest_framework import serializers

from .models import Framework,Checklist,ChecklistItem


class FrameworkSerializer(serializers.ModelSerializer):

    class Meta:
        model = Framework

        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class ChecklistItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = ChecklistItem

        fields = [
            "id",
            "item_code",
            "question",
            "order",
            "is_active",
        ]

        read_only_fields = [
            "id",
        ]


class ChecklistSerializer(serializers.ModelSerializer):

    framework_name = serializers.CharField(
        source="framework.name",
        read_only=True
    )

    items = ChecklistItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Checklist

        fields = [
            "id",
            "framework",
            "framework_name",
            "department",
            "name",
            "description",
            "is_active",
            "items",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "framework_name",
            "items",
            "created_at",
            "updated_at",
        ]