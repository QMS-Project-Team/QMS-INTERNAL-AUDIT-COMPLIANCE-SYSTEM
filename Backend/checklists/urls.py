from django.urls import path
from .views import checklist_list, checklist_detail, checklist_items
urlpatterns = [
    path('', checklist_list, name='checklist-list'),
    path('<int:pk>/', checklist_detail, name='checklist-detail'),
    path('<int:pk>/items/', checklist_items, name='checklist-items'),
]
