from django.urls import path

from . import views

urlpatterns = [
    path('login/', views.login),
    path('select-role/', views.select_role),
    path('logout/', views.logout),
]
