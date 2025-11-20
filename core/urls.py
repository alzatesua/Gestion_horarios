# core/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from .views import frontend

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path('api/', include('workforce.urls')),
    re_path(r"^app(?:/.*)?$", frontend),
]

# ⬇️ sirve /static/... desde la carpeta "static" del proyecto
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.BASE_DIR / "static")
