from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Checklist, ChecklistItem
from .serializers import (
    ChecklistSerializer,
    ChecklistItemSerializer,
    ChecklistCreateSerializer,
    ChecklistItemCreateSerializer,
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def checklist_list(request):
    if request.method == 'GET':
        queryset = (
            Checklist.objects
            .filter(is_active=True)
            .select_related('framework')
            .prefetch_related('items')
        )

        if request.query_params.get('framework'):
            queryset = queryset.filter(
                framework__code=request.query_params['framework']
            )

        if request.query_params.get('department'):
            queryset = queryset.filter(
                department_code=request.query_params['department']
            )

        return Response(
            ChecklistSerializer(queryset, many=True).data
        )

    serializer = ChecklistCreateSerializer(data=request.data)

    if serializer.is_valid():
        checklist = serializer.save()

        return Response(
            ChecklistSerializer(checklist).data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checklist_detail(request, pk):
    try:
        checklist = (
            Checklist.objects
            .select_related('framework')
            .prefetch_related('items')
            .get(pk=pk, is_active=True)
        )
    except Checklist.DoesNotExist:
        return Response(
            {'message': 'Checklist not found.'},
            status=404
        )

    return Response(
        ChecklistSerializer(checklist).data
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def checklist_items(request, pk):
    if not Checklist.objects.filter(
        pk=pk,
        is_active=True
    ).exists():
        return Response(
            {'message': 'Checklist not found.'},
            status=404
        )

    if request.method == 'GET':
        items = (
            ChecklistItem.objects
            .filter(checklist_id=pk)
            .order_by('sort_order', 'item_number')
        )

        return Response(
            ChecklistItemSerializer(items, many=True).data
        )

    serializer = ChecklistItemCreateSerializer(
        data=request.data
    )

    if serializer.is_valid():
        item = serializer.save(checklist_id=pk)

        return Response(
            ChecklistItemSerializer(item).data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
