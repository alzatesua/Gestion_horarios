# workforce/services.py
from django.db import transaction
from django.utils import timezone
from datetime import date
from .models import Asesor, EstadoTipo, EstadoConfigAsesor, JornadaEstado

def _hoy_range(tz=None):
    now = timezone.localtime() if tz is None else timezone.now().astimezone(tz)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timezone.timedelta(days=1)
    return start, end

def tiempo_usado_hoy_min(asesor, estado):
    start, end = _hoy_range()
    qs = JornadaEstado.objects.filter(
        asesor=asesor, estado=estado, inicio__lt=end
    ).filter(
        # tramo que cae en el día
    )
    total = 0
    for j in qs:
        i = max(j.inicio, start)
        f = min(j.fin or timezone.now(), end)
        if f > i:
            total += int((f - i).total_seconds() // 60)
    return total

def limite_minutos_resuelto(asesor, estado):
    """
    Devuelve el límite efectivo de minutos para un asesor dado un estado:
    - Si hay configuración de asesor → usa el límite del EstadoTipo asociado
    - Si no, usa el límite por defecto del EstadoTipo
    """
    cfg = EstadoConfigAsesor.objects.filter(asesor=asesor, estado=estado, activo=True).select_related("estado").first()
    if cfg:
        # 🔹 Ya no existe cfg.limite_minutos
        return cfg.estado.limite_minutos_default
    return estado.limite_minutos_default


def color_resuelto(asesor, estado):
    try:
        cfg = EstadoConfigAsesor.objects.get(asesor=asesor, estado=estado)
        return cfg.color_hex_override or estado.color_hex
    except EstadoConfigAsesor.DoesNotExist:
        return estado.color_hex


@transaction.atomic
def transicionar_estado(asesor: Asesor, estado_slug: str, meta=None):
    slug = (estado_slug or "").strip().lower()
    try:
        estado = EstadoTipo.objects.get(slug=slug, activo=True)
    except EstadoTipo.DoesNotExist:
        raise ValueError(f"Estado '{slug}' no existe o está inactivo")

    # Cerrar estado abierto anterior
    abierto = JornadaEstado.objects.filter(asesor=asesor, fin__isnull=True).first()
    if abierto and abierto.estado == estado:
        # Ya está en el mismo estado
        return abierto, False

    if abierto:
        abierto.fin = timezone.now()
        abierto.calcular_duracion()  # <-- NUEVO cálculo automático

    # Crear nuevo estado
    nuevo = JornadaEstado.objects.create(
        asesor=asesor,
        estado=estado,
        inicio=timezone.now(),
        meta=meta or {}
    )
    return nuevo, True

    return nuevo, True
