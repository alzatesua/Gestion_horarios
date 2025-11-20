from django.urls import path
from .views import LoginView, RefreshView, PersonasPorSedeView
from .protected import MeView

urlpatterns = [
    path('login/',   LoginView.as_view(),   name='api_login'),
    path('refresh/', RefreshView.as_view(), name='api_refresh'),
    path('me/',      MeView.as_view(),      name='api_me'),   
    path('asesores/', PersonasPorSedeView.as_view(), name='asesores-list'),
]


