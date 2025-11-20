# core/middleware.py
from django.conf import settings
from django.http import JsonResponse, HttpResponseForbidden, HttpResponse
import hmac


class AppOnlyMiddleware:
    """Protege las rutas /api/ exigiendo el header secreto."""

    API_PREFIXES = getattr(settings, "APP_API_PREFIXES", ("/api/",))
    ALLOWLIST_EXACT = {
        "/favicon.ico", "/robots.txt", "/healthz", "/readyz",
        "/manifest.json", "/asset-manifest.json", "/service-worker.js",
    }
    ALLOWLIST_PREFIXES = ("/static/", "/media/", "/frontend/",)
    ALLOWLIST_EXTS = (
        ".css", ".js", ".mjs", ".map",
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
        ".json", ".txt", ".webmanifest", ".woff", ".woff2", ".ttf",
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.shared_secret = getattr(settings, "APP_SHARED_SECRET", None)

    def __call__(self, request):
        path = request.path_info

        # --- Archivos estáticos y frontend ---
        if (
            path in self.ALLOWLIST_EXACT
            or path.startswith(self.ALLOWLIST_PREFIXES)
            or path.endswith(self.ALLOWLIST_EXTS)
        ):
            return self.get_response(request)

        # --- Permitir preflight (OPTIONS) ---
        if request.method == "OPTIONS":
            resp = HttpResponse(status=200)
            resp["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            resp["Access-Control-Allow-Headers"] = "content-type, x-distritec-app, authorization"
            resp["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            return resp

        # --- Proteger rutas de API ---
        if self._is_api_path(path):
            secret = request.headers.get("X-Distritec-App")

            # validar con HMAC
            if not (self.shared_secret and secret and hmac.compare_digest(secret, self.shared_secret)):
                if getattr(settings, "DEBUG", False):
                    print(f"[MIDDLEWARE] ❌ Header inválido o ausente en {path}")
                    return HttpResponseForbidden("No autorizado: falta o no coincide X-Distritec-App")
                return HttpResponseForbidden("No autorizado")

        # --- Continuar flujo normal ---
        return self.get_response(request)

    def _is_api_path(self, path):
        return any(path.startswith(prefix) for prefix in self.API_PREFIXES)
