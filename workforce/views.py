from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.http import require_GET
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.http import JsonResponse
from .models import Solicitud, AsignacionHorario, AsignacionHorario
from .serializers import SolicitudSerializer, AsignacionHorarioSerializer
from .utils import require_app_secret, csv_response

from django.utils import timezone
from rest_framework.decorators import api_view
from datetime import date

STATUS_KEY = "workforce:statuses"


class SolicitudesList(APIView):
    def get(self, request):
        ok, resp = require_app_secret(request)
        if not ok:
            return resp

        qs = Solicitud.objects.all().order_by('-id')

        estado = request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)

        id_sede = request.query_params.get('id_sede')
        if id_sede:
            try:
                qs = qs.filter(id_sede=int(id_sede))
            except (TypeError, ValueError):
                return Response({'detail': 'id_sede debe ser entero'}, status=400)

        return Response(SolicitudSerializer(qs, many=True).data)


    def post(self, request):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        ser = SolicitudSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        s = ser.save()
        return Response(SolicitudSerializer(s).data, status=status.HTTP_201_CREATED)


class AprobarSolicitud(APIView):
    def post(self, request, id):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        try:
            s = Solicitud.objects.get(pk=id)
        except Solicitud.DoesNotExist:
            return Response({'detail': 'No encontrada'}, status=404)
        
        s.estado = 'Aprobado'
        s.save()
        return Response(SolicitudSerializer(s).data)


class RechazarSolicitud(APIView):
    def post(self, request, id):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        razon = (request.data or {}).get('motivo_rechazo') or (request.data or {}).get('razon')
        if not razon:
            return Response({'detail': 'Falta motivo_rechazo'}, status=400)
        
        try:
            s = Solicitud.objects.get(pk=id)
        except Solicitud.DoesNotExist:
            return Response({'detail': 'No encontrada'}, status=404)
        
        s.estado = 'Rechazado'
        s.razonRechazo = razon
        s.save()
        return Response(SolicitudSerializer(s).data)


# 🔥 NUEVAS VISTAS PARA HORARIOS


class HorariosList(APIView):
    """
    GET: Lista horarios (filtrable por lider_id, asesor_id)
    POST: Crear nuevo horario
    """
    def get(self, request):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        qs = AsignacionHorario.objects.all()
        
        # 🔑 Filtrar por líder
        lider_id = request.query_params.get('lider_id')
        if lider_id:
            qs = qs.filter(lider_id=lider_id)
        
        # Filtrar por asesor
        asesor_id = request.query_params.get('asesor_id')
        if asesor_id:
            qs = qs.filter(asesor_id=asesor_id)
        
        # Filtrar por rango de fechas
        fecha_inicio = request.query_params.get('fecha_inicio')
        if fecha_inicio:
            qs = qs.filter(fecha_inicio__gte=fecha_inicio)
        
        fecha_fin = request.query_params.get('fecha_fin')
        if fecha_fin:
            qs = qs.filter(fecha_fin__lte=fecha_fin)
        
        return Response(AsignacionHorarioSerializer(qs, many=True).data)

    def post(self, request):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        ser = AsignacionHorarioSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        a = ser.save()
        return Response(AsignacionHorarioSerializer(a).data, status=status.HTTP_201_CREATED)


class HorarioDetail(APIView):
    """
    GET: Detalle de un horario
    PUT: Actualizar horario
    DELETE: Eliminar horario
    """
    def get_object(self, pk):
        try:
            return AsignacionHorario.objects.get(pk=pk)
        except AsignacionHorario.DoesNotExist:
            return None

    def get(self, request, pk):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        horario = self.get_object(pk)
        if not horario:
            return Response({'detail': 'Horario no encontrado'}, status=404)
        
        return Response(AsignacionHorarioSerializer(horario).data)

    def put(self, request, pk):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        horario = self.get_object(pk)
        if not horario:
            return Response({'detail': 'Horario no encontrado'}, status=404)
        
        ser = AsignacionHorarioSerializer(horario, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        a = ser.save()
        return Response(AsignacionHorarioSerializer(a).data)

    def delete(self, request, pk):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        horario = self.get_object(pk)
        if not horario:
            return Response({'detail': 'Horario no encontrado'}, status=404)
        
        horario.delete()
        return Response({'detail': 'Horario eliminado correctamente'}, status=204)


# Mantener compatibilidad con AsignarHorario (POST)
class AsignarHorario(APIView):
    """Vista legacy - redirige a HorariosList.post()"""
    def post(self, request):
        ok, resp = require_app_secret(request)
        if not ok: return resp
        
        ser = AsignacionHorarioSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        a = ser.save()
        return Response(AsignacionHorarioSerializer(a).data, status=201)


@require_GET
def export_asesores(request):
    ok, resp = require_app_secret(request)
    if not ok: return resp
    
    estados = list((cache.get(STATUS_KEY, {}) or {}).values())
    headers = ['userId', 'nombre', 'cargo', 'area', 'estado', 'lastUpdate']
    return csv_response('asesores.csv', estados, headers)



from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from workforce.models import AsignacionHorario
import json
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
def horario_actual_asesor(request, asesor_id):
    """
    Devuelve el horario activo de hoy para el asesor indicado.
    """
    hoy = timezone.localdate()
    dia_actual = hoy.strftime("%A").lower()
    
    # ⚠️ IMPORTANTE: Sin acentos, como en tu BD
    dias_map = {
        "monday": "lunes",
        "tuesday": "martes",
        "wednesday": "miercoles",  # SIN acento
        "thursday": "jueves",
        "friday": "viernes",
        "saturday": "sabado",  # SIN acento
        "sunday": "domingo",
    }
    dia_es = dias_map.get(dia_actual, dia_actual)

    logger.info(f"🕓 Buscando horario para asesor {asesor_id} en {hoy} ({dia_es})")

    # Primero: Ver TODOS los horarios del asesor sin filtros de fecha
    todos = AsignacionHorario.objects.using("database_HRS").filter(
        asesor_id=str(asesor_id).strip()
    )
    logger.info(f"📊 Total de horarios del asesor (sin filtro fecha): {todos.count()}")
    
    for h in todos:
        logger.info(
            f"   ID {h.id}: "
            f"inicio={h.fecha_inicio}, "
            f"fin={h.fecha_fin}, "
            f"dias={h.dias_semana}"
        )

    # ✅ CORRECCIÓN: Usar Q() para manejar fecha_fin NULL
    horarios = (
        AsignacionHorario.objects.using("database_HRS")
        .filter(
            asesor_id=str(asesor_id).strip(),
            fecha_inicio__lte=hoy,
        )
        .filter(
            Q(fecha_fin__isnull=True) | Q(fecha_fin__gte=hoy)  # NULL o vigente
        )
        .order_by("-creada_en")
    )

    if not horarios.exists():
        logger.warning(f"⚠️ No hay horarios vigentes para asesor {asesor_id}")
        return Response({"horario": None, "mensaje": "No hay horarios asignados"})

    logger.info(f"📋 Encontrados {horarios.count()} horarios vigentes después del filtro")

    # Buscar coincidencia con el día actual
    for h in horarios:
        try:
            # Normalizar dias_semana a lista
            if isinstance(h.dias_semana, list):
                dias = h.dias_semana
            elif isinstance(h.dias_semana, str):
                try:
                    dias = json.loads(h.dias_semana)
                except json.JSONDecodeError:
                    # Si falla el parse, intentar split por comas
                    dias = [d.strip() for d in h.dias_semana.split(",")]
            else:
                dias = []

            # Normalizar a minúsculas
            dias_norm = [d.lower().strip() for d in dias]
            
            logger.debug(f"📅 ID {h.id}: dias_semana={dias_norm}")

            # ✅ Comparar día actual
            if dia_es in dias_norm:
                logger.info(f"✅ MATCH! Horario ID {h.id} incluye {dia_es}")
                
                return Response({
                    "fecha": str(hoy),
                    "dia": dia_es,
                    "hora_entrada": h.hora_entrada.strftime("%H:%M:%S") if h.hora_entrada else None,
                    "hora_salida": h.hora_salida.strftime("%H:%M:%S") if h.hora_salida else None,
                    "minutos_adicionales": h.minutos_adicionales or 0,
                    "dias_semana": h.dias_semana,
                    "horario_id": h.id,
                })

        except Exception as e:
            logger.error(f"❌ Error procesando horario ID {h.id}: {e}")
            continue

    # Si no hay coincidencia exacta
    logger.warning(f"⚠️ No hay horario para {dia_es}. Mostrando horarios activos.")
    
    data = [
        {
            "id": h.id,
            "fecha_inicio": str(h.fecha_inicio),
            "fecha_fin": str(h.fecha_fin) if h.fecha_fin else None,
            "hora_entrada": h.hora_entrada.strftime("%H:%M:%S") if h.hora_entrada else None,
            "hora_salida": h.hora_salida.strftime("%H:%M:%S") if h.hora_salida else None,
            "dias_semana": h.dias_semana,
        }
        for h in horarios
    ]
    
    return Response({
        "horario": None,
        "mensaje": f"No hay horario asignado para {dia_es}",
        "horarios_activos": data
    })