from rest_framework import serializers
from .models import Framework

class FrameworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Framework
        fields = ['id','code','name','description','version','is_active','created_at','updated_at']
