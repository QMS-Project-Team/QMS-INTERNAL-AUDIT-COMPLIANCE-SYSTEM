from django.urls import path,include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (TokenRefreshView)

from .views import MeView,LoginView,UserViewSet,DepartmentListView
router=DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),
    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("me/",
        MeView.as_view(),
        name="me"),
    path("",
        include(router.urls)
    ),
    path("departments/",
        DepartmentListView.as_view(),
        name="departments"
    ),
]