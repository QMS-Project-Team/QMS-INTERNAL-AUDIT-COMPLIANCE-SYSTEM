from django.urls import path
from rest_framework_simplejwt.views import (TokenObtainPairView,TokenRefreshView)

from .views import MeView,LoginView

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
    path("me/",MeView.as_view(),name="me")
]