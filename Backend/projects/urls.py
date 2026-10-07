from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (ProjectViewSet,ProjectMemberViewSet,POCListView,
                    EligibleAuditorListView)


router = DefaultRouter()

router.register(
    "projects",
    ProjectViewSet,
    basename="project"
)

member_router = DefaultRouter()

member_router.register(
    "projects/(?P<project_id>[^/.]+)/members",
    ProjectMemberViewSet,
    basename="project-member"
)


urlpatterns = [
    path("",
        include(router.urls)
    ),
    path(
        "",
        include(member_router.urls)
    ),
    path(
        "pocs/",
        POCListView.as_view(),
        name="poc-list"
    ),
    path(
        "projects/<int:project_id>/eligible-auditors/",
        EligibleAuditorListView.as_view(),
        name="eligible-auditors"
    ),
]