from django.urls import path
from .views import employee_list, login, me, register, logout
from .views import employee_list, login
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', login, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', me, name='me'),
    path('register/', register, name='register'),
    path('logout/', logout, name='logout'),
    path('employees/', employee_list, name='employee-list'),
]