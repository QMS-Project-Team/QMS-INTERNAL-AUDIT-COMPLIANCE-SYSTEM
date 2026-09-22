from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import FrameworkViewSet,ChecklistViewSet


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
]