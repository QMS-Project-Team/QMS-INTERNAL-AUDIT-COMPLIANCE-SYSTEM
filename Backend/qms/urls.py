from django.urls import path
from .views import framework_list
urlpatterns = [path('frameworks/', framework_list, name='framework-list')]
