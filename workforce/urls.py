from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SolicitudesList, AprobarSolicitud, RechazarSolicitud,
    HorariosList, HorarioDetail, AsignarHorario, export_asesores, horario_actual_asesor
)
from .views_estados import (
    EstadoTipoViewSet, EstadoConfigAsesorViewSet, AsesorEstadosViewSet, marcar_entrada, marcar_salida
)

app_name = "workforce"

router = DefaultRouter()
router.register(r"estados", EstadoTipoViewSet, basename="estado-tipo")
router.register(r"estado-config", EstadoConfigAsesorViewSet, basename="estado-config")

# 👇 acciones por asesor
asesor_states    = AsesorEstadosViewSet.as_view({"get": "estados"})
asesor_trans     = AsesorEstadosViewSet.as_view({"post": "transiciones"})
asesor_status    = AsesorEstadosViewSet.as_view({"get": "status"})
asesor_jornada   = AsesorEstadosViewSet.as_view({"get": "jornada"})
asesor_historial = AsesorEstadosViewSet.as_view({"get": "historial"})

urlpatterns = [
    # --- otros endpoints ---
    path("solicitudes/", SolicitudesList.as_view(), name="solicitudes-list"),
    path("solicitudes/<int:id>/aprobar/", AprobarSolicitud.as_view(), name="aprobar-solicitud"),
    path("solicitudes/<int:id>/rechazar/", RechazarSolicitud.as_view(), name="rechazar-solicitud"),
    path("horarios/", HorariosList.as_view(), name="horarios-list"),
    path("horarios/<int:pk>/", HorarioDetail.as_view(), name="horarios-detail"),
    path("horarios/asignar/", AsignarHorario.as_view(), name="asignar-horario"),
    path("export/asesores/", export_asesores, name="export-asesores"),

    # --- router principal ---
    path("", include(router.urls)),

    # --- rutas manuales de asesor ---
    path("asesores/<int:asesor_id>/estados/", asesor_states, name="asesor-estados"),
    path("asesores/<int:asesor_id>/transiciones/", asesor_trans, name="asesor-transiciones"),
    path("asesores/<int:asesor_id>/status/", asesor_status, name="asesor-status"),
    path("asesores/<int:asesor_id>/jornada/", asesor_jornada, name="asesor-jornada"),  # GET
    path("asesores/<int:asesor_id>/historial/", asesor_historial, name="asesor-historial"),
    path("asesores/<str:asesor_id>/horario-actual/", horario_actual_asesor, name="asesor-horario-actual"),

    path("asesores/<int:asesor_id>/jornada/entrada/", marcar_entrada, name="jornada-entrada"),
    path("asesores/<int:asesor_id>/jornada/salida/", marcar_salida, name="jornada-salida"),

]
