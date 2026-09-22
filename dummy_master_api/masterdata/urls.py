from django.urls import path

from .views import (
    employee_list,
    department_list,
    project_list
)


urlpatterns = [
    path('employees/', employee_list, name='employee-list'),
    path('departments/', department_list, name='department-list'),
    path('projects/', project_list, name='project-list'),
]