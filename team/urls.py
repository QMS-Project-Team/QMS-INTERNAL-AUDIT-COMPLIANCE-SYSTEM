from django.urls import path

from .views import (
    employees,
    departments,
    projects
)


urlpatterns = [
    path('employees/', employees, name='team-employees'),
    path('departments/', departments, name='team-departments'),
    path('projects/', projects, name='team-projects'),
]