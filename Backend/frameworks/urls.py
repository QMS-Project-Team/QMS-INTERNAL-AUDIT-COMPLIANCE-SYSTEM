from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import FrameworkViewSet,ChecklistViewSet,ChecklistItemViewSet


router = DefaultRouter()

router.register(
    "frameworks",
    FrameworkViewSet,
    basename="framework"
)

router.register(
    "checklists",
    ChecklistViewSet,
    basename="checklists"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "checklists/<int:checklist_id>/items/",
        ChecklistItemViewSet.as_view({
            "get": "list",
            "post": "create",
        }),
    ),
    path(
        "checklists/<int:checklist_id>/items/<int:pk>/",
        ChecklistItemViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy",
        }),
    ),
]