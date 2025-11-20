# core/views.py
from django.http import HttpResponse
from django.conf import settings

def frontend(request):
    """
    Sirve el index.html del build de React (frontend).
    """
    try:
        with open(settings.FRONTEND_INDEX, encoding="utf-8") as f:
            return HttpResponse(f.read())
    except FileNotFoundError:
        return HttpResponse(
            "<h1>Build no encontrado</h1><p>Ejecuta <code>npm run build</code> en frontend/</p>",
            content_type="text/html",
            status=404,
        )
