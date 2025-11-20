from rest_framework import serializers
from .models import (
    Solicitud, AsignacionHorario, Asesor,
    EstadoTipo, EstadoConfigAsesor, JornadaEstado
)
import re
from typing import Optional, Dict
from django.apps import apps
from rest_framework import serializers
from .models import Asesor, EstadoTipo, EstadoConfigAsesor
from .models import Asesor, EstadoTipo, JornadaEstado, JornadaLaboral



# ------------------- Solicitudes / Horarios -------------------

class SolicitudSerializer(serializers.ModelSerializer):
    class Meta:
        model = Solicitud
        fields = '__all__'


class AsignacionHorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsignacionHorario
        fields = '__all__'
        read_only_fields = ['creada_en', 'actualizada_en']

    def validate(self, data):
        if data.get('fecha_fin') and data.get('fecha_inicio'):
            if data['fecha_fin'] < data['fecha_inicio']:
                raise serializers.ValidationError(
                    {'fecha_fin': 'La fecha fin debe ser posterior a la fecha inicio'}
                )
        return data


# ----------------------- Estados -----------------------
HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

class EstadoTipoSerializer(serializers.ModelSerializer):
    """Serializer simple para mostrar los datos del EstadoTipo."""
    class Meta:
        model = EstadoTipo
        fields = [
            "id", "slug", "nombre", "color_hex", "icon",
            "orden", "activo", "limite_minutos_default"
        ]

# serializers.py
# workforce/serializers.py
#-------------- CREACION DE CONFIGURACIONES DE HORARIOS ------------------------------

# ----- helpers de resolución (ahora apuntan a 'accounts') -----
def M_Asesores():
    return apps.get_model('accounts', 'Asesores')

def M_Pri():
    return apps.get_model('accounts', 'Pri')

def M_InfTrab():
    return apps.get_model('accounts', 'InfTrab')

def M_CargosDistritec():
    return apps.get_model('accounts', 'CargosDistritec')

# Ajusta a tus estados válidos
ALLOWED_ESTADOS = {1, 2, 3}

def datos_basicos_asesor(id_asesor: int, id_sede_preferida: Optional[int] = None) -> Dict:
    """
    Arma nombre, cargo (texto) e id_sede desde los modelos de la app 'accounts'.
    """
    Asesores = M_Asesores()
    Pri = M_Pri()
    InfTrab = M_InfTrab()
    CargosDistritec = M_CargosDistritec()

    nombre, cargo_txt, id_sede = "", "", None

    # 1) Nombre desde maestro (accounts.Asesores)
    fila_erp = (Asesores.objects
                .filter(ID_Asesor=id_asesor)
                .values("Nombre")
                .first())
    if fila_erp:
        nombre = (fila_erp.get("Nombre") or "").strip()

    # 2) Último PRI permitido (opcionalmente dentro de la sede preferida)
    pri_qs = Pri.objects.filter(ID_Asesor=id_asesor, ID_Estado__in=ALLOWED_ESTADOS)
    if id_sede_preferida:
        pri_qs = pri_qs.filter(ID_Sede=id_sede_preferida)

    pri = (pri_qs.order_by("-ID_Pri")
           .values("ID_Sede", "ID_Inf_trab")
           .first())

    if pri:
        id_sede = pri["ID_Sede"]
        inf_id = pri["ID_Inf_trab"]
        if inf_id:
            inf = (InfTrab.objects
                   .filter(ID_Inf_trab=inf_id)
                   .values("Cargo")
                   .first())
            if inf and inf.get("Cargo"):
                cargo_row = (CargosDistritec.objects
                             .filter(id_cargo=inf["Cargo"])
                             .values("cargo")
                             .first())
                if cargo_row:
                    cargo_txt = cargo_row.get("cargo") or ""

    return {"nombre": nombre, "cargo": cargo_txt, "id_sede": id_sede}


class EstadoConfigAsesorSerializer(serializers.ModelSerializer):
    # ---- entrada (write) ----
    asesor = serializers.IntegerField(write_only=True)
    estado_id = serializers.PrimaryKeyRelatedField(
        source="estado",
        queryset=EstadoTipo.objects.all(),
        write_only=True
    )
    id_sede = serializers.IntegerField(write_only=True, required=False)

    # ---- salida (read) ----
    estado = EstadoTipoSerializer(read_only=True)

    asesor_id = serializers.IntegerField(source="asesor.id_asesor", read_only=True)
    asesor_nombre = serializers.CharField(source="asesor.nombre", read_only=True)
    asesor_cargo = serializers.CharField(source="asesor.cargo", read_only=True)
    asesor_sede = serializers.IntegerField(source="asesor.id_sede", read_only=True)

    # Campo calculado dinámicamente desde EstadoTipo

    limite_minutos = serializers.SerializerMethodField()




    class Meta:
        model = EstadoConfigAsesor
        fields = [
            "id",
            "asesor", "estado_id", "id_sede",
            "activo", "color_hex_override",
            "estado", "asesor_id", "asesor_nombre", "asesor_cargo", "asesor_sede",
            "limite_minutos",
        ]

    # ---------------------------------------------------------------------
    # ✅ Validaciones
    # ---------------------------------------------------------------------
    def validate_color_hex_override(self, v):
        """Valida formato #RRGGBB o #RGB."""
        if v in (None, ""):
            return ""
        v = v.strip()
        if not HEX_RE.match(v):
            raise serializers.ValidationError("Formato inválido. Usa #RRGGBB o #RGB.")
        return v.lower()

    # ---------------------------------------------------------------------
    # ✅ Campo dinámico (no se guarda en la DB)
    # ---------------------------------------------------------------------
    def get_limite_minutos(self, obj):
        """
        Devuelve el límite de minutos del estado asociado (workforce_estadotipo)
        usando la FK estado_id.
        """
        # Si el objeto ya tiene cargado el estado (por select_related)
        if hasattr(obj, "estado") and obj.estado:
            return obj.estado.limite_minutos_default

        # Si no, hace la consulta manual (FK)
        from .models import EstadoTipo
        try:
            estado = EstadoTipo.objects.only("limite_minutos_default").get(id=obj.estado_id)
            return estado.limite_minutos_default
        except EstadoTipo.DoesNotExist:
            return None
    # ---------------------------------------------------------------------
    # ✅ Creación
    # ---------------------------------------------------------------------
    def create(self, validated_data):
        """
        Crea o actualiza un registro de configuración de estado para un asesor.
        Si no se proporciona 'limite_minutos', no se guarda (usa el del estado base).
        """
        asesor_ext_id = validated_data.pop("asesor")
        id_sede_pref = validated_data.pop("id_sede", None)
        validated_data.pop("limite_minutos", None)  # No guardar manualmente

        # Obtener info básica del asesor desde otra fuente (opcional)
        datos = datos_basicos_asesor(asesor_ext_id, id_sede_preferida=id_sede_pref)
        if id_sede_pref:
            datos["id_sede"] = id_sede_pref

        asesor_obj, _ = Asesor.objects.update_or_create(
            id_asesor=asesor_ext_id,
            defaults={
                "nombre": datos.get("nombre", ""),
                "cargo": datos.get("cargo", ""),
                "id_sede": datos.get("id_sede"),
            },
        )

        return EstadoConfigAsesor.objects.create(asesor=asesor_obj, **validated_data)
#----------------------------------------------------------------------------------------------


class JornadaEstadoSerializer(serializers.ModelSerializer):
    # ⇨ Igual: trabaja con id_asesor
    asesor = serializers.SlugRelatedField(
        slug_field='id_asesor',
        queryset=Asesor.objects.all()
    )
    asesor_pk = serializers.IntegerField(source='asesor.id', read_only=True)

    estado = EstadoTipoSerializer(read_only=True)
    estado_id = serializers.PrimaryKeyRelatedField(
        queryset=EstadoTipo.objects.all(), write_only=True, source="estado"
    )

    duracion_seg = serializers.IntegerField(read_only=True)
    limite_minutos = serializers.IntegerField(read_only=True, allow_null=True)
    diferencia_minutos = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = JornadaEstado
        fields = [
            "id",
            "asesor", "asesor_pk",
            "estado", "estado_id",
            "inicio", "fin", "meta",
            "duracion_seg",
            "limite_minutos",
            "diferencia_minutos",
        ]
        extra_kwargs = {
            "fin": {"required": False, "allow_null": True},
            "meta": {"required": False},
        }

  

class JornadaLaboralSerializer(serializers.ModelSerializer):
    class Meta:
        model = JornadaLaboral
        fields = '__all__'
