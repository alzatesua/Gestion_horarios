# workforce/views_estados.py
from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Asesor, EstadoTipo, EstadoConfigAsesor, JornadaEstado, AsignacionHorario, JornadaLaboral
from .serializers import (
    EstadoTipoSerializer, EstadoConfigAsesorSerializer, JornadaEstadoSerializer, JornadaLaboralSerializer 
)
from .services import (
    transicionar_estado, limite_minutos_resuelto, tiempo_usado_hoy_min,
    color_resuelto, _hoy_range
)
from rest_framework import status



class EstadoTipoViewSet(viewsets.ModelViewSet):
    queryset = EstadoTipo.objects.all().order_by("orden", "nombre")
    serializer_class = EstadoTipoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        activo = self.request.query_params.get("activo")
        if activo in ("true", "false", "1", "0"):
            qs = qs.filter(activo=activo in ("true", "1"))
        return qs  # ✅ ESTA LÍNEA ES FUNDAMENTAL


# views.py

# workforce/views_estados.py
from django.db.models import Prefetch

class EstadoConfigAsesorViewSet(viewsets.ModelViewSet):
    """
    Vista para gestionar configuraciones de estados por asesor.
    Si no se envía 'limite_minutos', se tomará automáticamente desde
    EstadoTipo.limite_minutos_default gracias al método save() del modelo.
    """
    queryset = (
        EstadoConfigAsesor.objects
        .select_related('asesor', 'estado')
        .all()
    )
    serializer_class = EstadoConfigAsesorSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filtra por id externo del asesor (?asesor=24)
        asesor_ext = self.request.query_params.get('asesor')
        if asesor_ext and str(asesor_ext).isdigit():
            qs = qs.filter(asesor__id_asesor=int(asesor_ext))

        # Filtra por PK interno del asesor (?asesor_pk=1)
        asesor_pk = self.request.query_params.get('asesor_pk')
        if asesor_pk and str(asesor_pk).isdigit():
            qs = qs.filter(asesor_id=int(asesor_pk))

        # Filtra por id de estado (?estado_id=3)
        estado_id = self.request.query_params.get('estado_id')
        if estado_id and str(estado_id).isdigit():
            qs = qs.filter(estado_id=int(estado_id))

        # Filtra por activo (?activo=true)
        activo = self.request.query_params.get('activo')
        if activo in ('true', 'false', '1', '0'):
            qs = qs.filter(activo=activo in ('true', '1'))

        return qs


class AsesorEstadosViewSet(viewsets.GenericViewSet):
    """
    Endpoints por asesor:
      - GET  /asesores/{asesor_id}/estados/
      - POST /asesores/{asesor_id}/transiciones/
      - GET  /asesores/{asesor_id}/status/
      - GET  /asesores/{asesor_id}/jornada/?date=YYYY-MM-DD
    """
    queryset = Asesor.objects.all()
    lookup_field = "id_asesor"        # campo del modelo
    lookup_url_kwarg = "asesor_id"    # nombre del kwarg en la URL

    def get_object(self):
        asesor_id = self.kwargs.get(self.lookup_url_kwarg)
        obj, _ = Asesor.objects.get_or_create(id_asesor=asesor_id)
        return obj

    @action(detail=True, methods=["get"], url_path="estados")
    def estados(self, request, *args, **kwargs):
        asesor = self.get_object()
        estados = EstadoTipo.objects.filter(activo=True).order_by("orden", "slug")
        data = []
        for e in estados:
            limite = limite_minutos_resuelto(asesor, e)
            usado = tiempo_usado_hoy_min(asesor, e)
            restante = None if limite is None else max(0, limite - usado)
            data.append({
                "slug": e.slug,
                "nombre": e.nombre,
                "color": color_resuelto(asesor, e),
                "icon": e.icon,
                "orden": e.orden,
                "limite_minutos": limite,
                "usado_minutos_hoy": usado,
                "restante_minutos_hoy": restante,
            })
        return Response(data)

    @action(detail=True, methods=["post"], url_path="transiciones")
    def transiciones(self, request, *args, **kwargs):
        asesor = self.get_object()
        slug = request.data.get("estado")
        meta = request.data.get("meta") or {}
        if not slug:
            return Response({"detail": "estado (slug) requerido"}, status=400)
        try:
            j, created = transicionar_estado(asesor, slug, meta)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        return Response(JornadaEstadoSerializer(j).data, status=201 if created else 200)

    @action(detail=True, methods=["get"], url_path="status")
    def status(self, request, *args, **kwargs):
        asesor = self.get_object()
        abierto = (JornadaEstado.objects
                   .filter(asesor=asesor, fin__isnull=True)
                   .select_related("estado")
                   .first())
        if not abierto:
            return Response({"estado": None})
        return Response({
            "estado": abierto.estado.slug,
            "nombre": abierto.estado.nombre,
            "color": color_resuelto(asesor, abierto.estado),
            "inicio": abierto.inicio,
        })

    @action(detail=True, methods=["get"], url_path="jornada")
    def jornada(self, request, *args, **kwargs):
        asesor = self.get_object()
        date_param = request.query_params.get("date")
        if date_param:
            y, m, d = map(int, date_param.split("-"))
            start = timezone.make_aware(datetime(y, m, d, 0, 0, 0))
            end = start + timedelta(days=1)
        else:
            start, end = _hoy_range()

        # SOLO registros que iniciaron ese día
        logs = (JornadaEstado.objects
                .filter(asesor=asesor)
                .filter(inicio__gte=start, inicio__lt=end)
                .select_related("estado")
                .order_by("inicio"))

        total_seg = 0
        rows = []
        now = timezone.now()
        for j in logs:
            i = j.inicio
            f = j.fin or now
            seg = max(0, int((f - i).total_seconds()))
            total_seg += seg
            rows.append({
                "id": j.id,
                "estado": j.estado.slug,
                "nombre": j.estado.nombre,
                "color": color_resuelto(asesor, j.estado),
                "inicio": j.inicio.isoformat(),
                "fin": j.fin.isoformat() if j.fin else None,
                "segundos": seg,
            })

        return Response({
            "asesor_id": asesor.id_asesor,
            "fecha": start.date().isoformat(),
            "total_seg": total_seg,
            "items": rows,
        })

    @action(detail=True, methods=["get"], url_path="historial")
    def historial(self, request, *args, **kwargs):
        """
        Devuelve las transiciones de estado del asesor con duraciones y diferencias.
        /asesores/{asesor_id}/historial/?date=YYYY-MM-DD
        """
        
        asesor = self.get_object()
        date_param = request.query_params.get("date")
        if date_param:
            y, m, d = map(int, date_param.split("-"))
            start = timezone.make_aware(datetime(y, m, d))
            end = start + timedelta(days=1)
        else:
            start, end = _hoy_range()

        logs = (JornadaEstado.objects
                .filter(asesor=asesor, inicio__lt=end)
                .filter(Q(fin__gt=start) | Q(fin__isnull=True))
                .select_related("estado")
                .order_by("inicio"))

        data = []
        for j in logs:
            local_inicio = timezone.localtime(j.inicio)
            local_fin = timezone.localtime(j.fin) if j.fin else None

            data.append({
                "estado": j.estado.nombre,
                "slug": j.estado.slug,
                "inicio": local_inicio.strftime("%Y-%m-%d %H:%M:%S"),
                "fin": local_fin.strftime("%Y-%m-%d %H:%M:%S") if local_fin else None,
                "duracion_seg": j.duracion_seg,
                "limite_minutos": j.limite_minutos,
                "diferencia_minutos": j.diferencia_minutos,
                "color": color_resuelto(asesor, j.estado),
            })

        return Response({
            "asesor_id": asesor.id_asesor,
            "fecha": start.date().isoformat(),
            "transiciones": data
        })



# workforce/views.py
import json
import logging
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from workforce.models import AsignacionHorario

logger = logging.getLogger(__name__)


@api_view(['GET'])
def horario_actual_asesor(request, asesor_id):
    hoy = timezone.localdate()

    # 🔥 Traducción de día a español
    dia_en = hoy.strftime("%A").lower()
    dias_trad = {
        "monday": "lunes",
        "tuesday": "martes",
        "wednesday": "miercoles",
        "thursday": "jueves",
        "friday": "viernes",
        "saturday": "sabado",
        "sunday": "domingo",
    }
    dia_es = dias_trad.get(dia_en, dia_en)

    logger.debug(f"🕓 === [horario_actual_asesor] ===")
    logger.debug(f"➡️ Asesor ID: {asesor_id}")
    logger.debug(f"➡️ Fecha actual: {hoy} ({dia_es})")


    horarios = (
        AsignacionHorario.objects.using("database_HRS")
        .filter(
            asesor_id=asesor_id,
            fecha_inicio__lte=hoy,
            fecha_fin__gte=hoy,
        )
        .order_by("-creada_en")
    )

    for h in horarios:
        dias_raw = h.dias_semana
        if isinstance(dias_raw, list):
            dias_norm = [d.lower().strip() for d in dias_raw]
        else:
            try:
                dias_norm = [d.lower().strip() for d in json.loads(dias_raw)]
            except Exception:
                dias_norm = [x.strip().lower() for x in str(dias_raw).split(",")]

        logger.debug(f"📅 ID {h.id} → dias_semana={dias_norm}")
        if dia_es in dias_norm:
            logger.debug(f"✅ Coincide con el día actual ({dia_es}) → ID={h.id}")
            return Response({
                "fecha": str(hoy),
                "hora_entrada": h.hora_entrada.strftime("%H:%M:%S"),
                "hora_salida": h.hora_salida.strftime("%H:%M:%S"),
                "minutos_adicionales": h.minutos_adicionales,
                "dias_semana": dias_norm,
            })

    logger.debug("⚠️ No hay coincidencia exacta de día; devolviendo el más reciente disponible.")
    h = horarios.first()
    return Response({
        "fecha": str(hoy),
        "hora_entrada": h.hora_entrada.strftime("%H:%M:%S"),
        "hora_salida": h.hora_salida.strftime("%H:%M:%S"),
        "minutos_adicionales": h.minutos_adicionales,
        "dias_semana": h.dias_semana,
    })






# workforce/views_estados.py


def _calc_diff_and_label(real_dt, fecha, hora_prog):
    """
    Devuelve (diferencia_min, etiqueta) para entrada/salida.
    Positivo = tarde/después, Negativo = temprano/antes, 0 = a tiempo.
    """
    if not (real_dt and hora_prog):
        return None, None
    prog_dt = timezone.make_aware(datetime.combine(fecha, hora_prog), timezone.get_current_timezone())
    diff_min = int((real_dt - prog_dt).total_seconds() // 60)
    etiqueta = "A tiempo"
    if diff_min > 0:
        etiqueta = "Tarde"  # para entrada; para salida cambiaremos a "Después"
    elif diff_min < 0:
        etiqueta = "Temprano"  # para entrada; para salida cambiaremos a "Antes"
    return diff_min, etiqueta


def _obtener_horario_actual(asesor_id, hoy):
    return (AsignacionHorario.objects.using("database_HRS")
            .filter(asesor_id=str(asesor_id), fecha_inicio__lte=hoy, fecha_fin__gte=hoy)
            .order_by("-creada_en").first())


@api_view(["POST"])
def marcar_entrada(request, asesor_id):
    """
    Marca SOLO la ENTRADA del asesor.
    Si ya existe entrada hoy y no forzas, responde 409.
    """
    hoy = timezone.localdate()
    ahora = timezone.now()

    asesor = Asesor.objects.filter(id_asesor=asesor_id).first()
    if not asesor:
        return Response({"detail": "Asesor no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    jornada, created = JornadaLaboral.objects.using("database_HRS").get_or_create(
        asesor=asesor, fecha=hoy
    )

    if jornada.inicio_real and not request.query_params.get("forzar"):
        return Response(
            {"detail": "La entrada ya fue registrada hoy.", "inicio_real": jornada.inicio_real},
            status=status.HTTP_409_CONFLICT,
        )

    # Asigna entrada real
    jornada.inicio_real = ahora

    # Trae horario programado
    horario = _obtener_horario_actual(asesor_id, hoy)
    if horario:
        jornada.inicio_programado = horario.hora_entrada
        jornada.fin_programado = jornada.fin_programado or horario.hora_salida  # por si luego marca salida

    # Calcula diferencia/estado de ENTRADA
    diff_min, etiqueta = _calc_diff_and_label(jornada.inicio_real, hoy, jornada.inicio_programado)
    jornada.diferencia_entrada_min = diff_min
    jornada.estado_entrada = etiqueta  # "Temprano" / "Tarde" / "A tiempo"

    jornada.save(using="database_HRS")

    # Mensaje humano
    if diff_min is None:
        mensaje = "Entrada registrada."
    elif diff_min == 0:
        mensaje = "Llegó a tiempo."
    elif diff_min > 0:
        mensaje = f"Llegó tarde (+{diff_min} min)."
    else:
        mensaje = f"Llegó temprano ({diff_min} min)."

    return Response({
        "asesor_id": asesor_id,
        "asesor": getattr(asesor, "nombre", ""),
        "fecha": str(hoy),
        "inicio_real": jornada.inicio_real,
        "inicio_programado": jornada.inicio_programado,
        "diferencia_entrada_min": diff_min,
        "estado_entrada": etiqueta,
        "mensaje": mensaje,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["POST"])
def marcar_salida(request, asesor_id):
    """
    Marca SOLO la SALIDA del asesor.
    Requiere que ya exista 'inicio_real'.
    Si ya existe salida hoy y no forzas, responde 409.
    """
    hoy = timezone.localdate()
    ahora = timezone.now()

    asesor = Asesor.objects.filter(id_asesor=asesor_id).first()
    if not asesor:
        return Response({"detail": "Asesor no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    jornada = (JornadaLaboral.objects.using("database_HRS")
               .filter(asesor=asesor, fecha=hoy).first())
    if not jornada or not jornada.inicio_real:
        return Response(
            {"detail": "No hay entrada registrada hoy. Registre entrada primero."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if jornada.fin_real and not request.query_params.get("forzar"):
        return Response(
            {"detail": "La salida ya fue registrada hoy.", "fin_real": jornada.fin_real},
            status=status.HTTP_409_CONFLICT,
        )

    # Asigna salida real
    jornada.fin_real = ahora

    # Asegura horario programado
    if not (jornada.inicio_programado and jornada.fin_programado):
        horario = _obtener_horario_actual(asesor_id, hoy)
        if horario:
            jornada.inicio_programado = jornada.inicio_programado or horario.hora_entrada
            jornada.fin_programado = jornada.fin_programado or horario.hora_salida

    # Calcula diferencia/estado de SALIDA
    diff_min, etiqueta = _calc_diff_and_label(jornada.fin_real, hoy, jornada.fin_programado)
    # traducimos etiquetas de entrada a equivalentes de salida
    if etiqueta == "Temprano":
        etiqueta = "Antes"
    elif etiqueta == "Tarde":
        etiqueta = "Después"
    jornada.diferencia_salida_min = diff_min
    jornada.estado_salida = etiqueta  # "Antes" / "Después" / "A tiempo"

    jornada.save(using="database_HRS")

    # Mensaje humano
    if diff_min is None:
        mensaje = "Salida registrada."
    elif diff_min == 0:
        mensaje = "Salió a tiempo."
    elif diff_min > 0:
        mensaje = f"Salió después (+{diff_min} min)."
    else:
        mensaje = f"Salió antes ({diff_min} min)."

    return Response({
        "asesor_id": asesor_id,
        "asesor": getattr(asesor, "nombre", ""),
        "fecha": str(hoy),
        "fin_real": jornada.fin_real,
        "fin_programado": jornada.fin_programado,
        "diferencia_salida_min": diff_min,
        "estado_salida": etiqueta,
        "mensaje": mensaje,
    }, status=status.HTTP_200_OK)
