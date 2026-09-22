from rest_framework import serializers
from .models import Checklist, ChecklistItem


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = [
            'id',
            'item_number',
            'requirement',
            'guidance',
            'response_type',
            'is_mandatory',
            'sort_order',
        ]


class ChecklistSerializer(serializers.ModelSerializer):
    framework_code = serializers.CharField(
        source='framework.code',
        read_only=True
    )
    items = ChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Checklist
        fields = [
            'id',
            'framework',
            'framework_code',
            'department_code',
            'department_name',
            'title',
            'version',
            'is_active',
            'created_at',
            'updated_at',
            'items',
        ]


class ChecklistCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checklist
        fields = [
            'framework',
            'department_code',
            'department_name',
            'title',
            'version',
            'is_active',
        ]


class ChecklistItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = [
            'item_number',
            'requirement',
            'guidance',
            'response_type',
            'is_mandatory',
            'sort_order',
        ]
