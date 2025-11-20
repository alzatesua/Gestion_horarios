# workforce/models.py
from django.db import models
from django.utils import timezone



class Solicitud(models.Model):
    TIPO_CHOICES = [
        ('Cambio de horario', 'Cambio de horario'),
        ('Minutos adicionales', 'Minutos adicionales'),
    ]
    ESTADO_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('Aprobado', 'Aprobado'),
        ('Rechazado', 'Rechazado'),
    ]

    # 👇 NUEVOS CAMPOS (enteros, indexados)
    id_asesor = models.IntegerField(null=True, blank=True, db_index=True)
    id_sede   = models.IntegerField(null=True, blank=True, db_index=True)

    asesor = models.CharField(max_length=120)
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES)
    fechaSolicitud = models.DateField()
    nuevoHorario = models.CharField(max_length=32, blank=True, null=True)
    minutos = models.IntegerField(blank=True, null=True)
    fecha = models.DateField(blank=True, null=True)
    motivo = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES, default='Pendiente')
    razonRechazo = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'{self.tipo} - {self.asesor} ({self.estado})'



class AsignacionHorario(models.Model):
    lider_id = models.CharField(max_length=64, db_index=True)  
    asesor_id = models.CharField(max_length=64, db_index=True)  
    asesor_nombre = models.CharField(max_length=120, blank=True, null=True)  
    asesor_cargo = models.CharField(max_length=120, blank=True, null=True)  
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    hora_entrada = models.TimeField()
    hora_salida = models.TimeField()
    dias_semana = models.JSONField(default=list)  
    minutos_adicionales = models.IntegerField(default=0)
    motivo = models.TextField(blank=True, null=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creada_en']
        indexes = [
            models.Index(fields=['lider_id', '-creada_en']),
            models.Index(fields=['asesor_id']),
        ]

    def __str__(self):
        return f'Horario {self.asesor_nombre or self.asesor_id} ({self.fecha_inicio} - {self.fecha_fin or ""})'













#---------------------- Modelos de estados ----------------------------

# Si ya tienes tabla de asesores/usuarios, usa ForeignKey a ella.
# Aquí dejo un campo entero genérico para integrarlo fácil.
class Asesor(models.Model):
    id_asesor = models.IntegerField(unique=True, db_index=True)  # viene del ERP / login
    nombre = models.CharField(max_length=160, blank=True, default="")
    cargo = models.CharField(max_length=120, blank=True, default="")
    id_sede = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.id_asesor} - {self.nombre or 'Asesor'}"


class EstadoTipo(models.Model):
    """
    Catálogo maestro de estados posibles.
    slug: clave estable para integraciones (ingreso, disponible, break, almuerzo, reunion, formacion, salida)
    """
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    nombre = models.CharField(max_length=64)                   # etiqueta para UI
    color_hex = models.CharField(max_length=7, default="#6b7280")  # p.e. #10b981
    icon = models.CharField(max_length=64, blank=True, default="") # p.e. 'Clock', 'Coffee' (para frontend)
    orden = models.PositiveIntegerField(default=100)               # orden en UI
    activo = models.BooleanField(default=True)
    limite_minutos_default = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Límite diario por estado (minutos). Null = sin límite."
    )

    class Meta:
        ordering = ["orden", "slug"]

    def __str__(self):
        return self.nombre



class EstadoConfigAsesor(models.Model):
    asesor = models.ForeignKey('Asesor', on_delete=models.CASCADE, related_name="configs_estado")
    estado = models.ForeignKey('EstadoTipo', on_delete=models.CASCADE, related_name="configs_asesor")
    activo = models.BooleanField(default=True)
    color_hex_override = models.CharField(max_length=16, blank=True, null=True)

    class Meta:
        unique_together = [("asesor", "estado")]

    def __str__(self):
        return f"{self.asesor_id} -> {self.estado.slug}"

    @property
    def limite_minutos_resuelto(self):
        """Trae el límite directamente del EstadoTipo relacionado."""
        if self.estado and self.estado.limite_minutos_default is not None:
            return self.estado.limite_minutos_default
        return None





# workforce/models.py
class JornadaEstado(models.Model):
    asesor = models.ForeignKey('Asesor', on_delete=models.CASCADE)
    estado = models.ForeignKey('EstadoTipo', on_delete=models.CASCADE)
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    duracion_seg = models.IntegerField(default=0)
    limite_minutos = models.IntegerField(null=True, blank=True)
    diferencia_minutos = models.IntegerField(null=True, blank=True)

    def calcular_duracion(self):
        """Calcula duración y guarda diferencia de minutos vs límite."""
        if not self.fin:
            self.fin = timezone.now()
        duracion = int((self.fin - self.inicio).total_seconds())
        self.duracion_seg = duracion

        # 🔽 Importación LOCAL para evitar ciclo
        from .services import limite_minutos_resuelto

        limite = limite_minutos_resuelto(self.asesor, self.estado)
        self.limite_minutos = limite
        if limite is not None:
            usado_min = duracion // 60
            self.diferencia_minutos = limite - usado_min

        self.save(update_fields=['fin', 'duracion_seg', 'limite_minutos', 'diferencia_minutos'])



    



# workforce/models.py
from datetime import timedelta


class JornadaLaboral(models.Model):
    """
    Registra el inicio y fin real de la jornada del asesor y compara con el horario asignado.
    """
    asesor = models.ForeignKey('Asesor', on_delete=models.CASCADE, related_name='jornadas')
    fecha = models.DateField(default=timezone.localdate)
    inicio_real = models.DateTimeField(null=True, blank=True)
    fin_real = models.DateTimeField(null=True, blank=True)
    inicio_programado = models.TimeField(null=True, blank=True)
    fin_programado = models.TimeField(null=True, blank=True)

    diferencia_entrada_min = models.IntegerField(null=True, blank=True)  # +x = llegó tarde / -x = temprano
    diferencia_salida_min = models.IntegerField(null=True, blank=True)   # +x = se fue tarde / -x = salió antes

    estado_entrada = models.CharField(max_length=32, blank=True, null=True)  # 'Temprano', 'Tarde', 'A tiempo'
    estado_salida = models.CharField(max_length=32, blank=True, null=True)   # 'Temprano', 'Tarde', 'A tiempo'

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('asesor', 'fecha')]
        ordering = ['-fecha']
        indexes = [models.Index(fields=['asesor', '-fecha'])]

    def __str__(self):
        return f"Jornada {self.asesor} - {self.fecha}"

    # -----------------------------------------------------
    # 🧠 Métodos de utilidad
    # -----------------------------------------------------

    def calcular_diferencias(self):
        """
        Calcula las diferencias entre el horario real y el programado.
        """
        if not (self.inicio_programado and self.fin_programado and self.inicio_real and self.fin_real):
            return

        # Compara hora real vs programada
        entrada_prog = timezone.make_aware(
            timezone.datetime.combine(self.fecha, self.inicio_programado)
        )
        salida_prog = timezone.make_aware(
            timezone.datetime.combine(self.fecha, self.fin_programado)
        )

        # Diferencias en minutos
        self.diferencia_entrada_min = int((self.inicio_real - entrada_prog).total_seconds() // 60)
        self.diferencia_salida_min = int((self.fin_real - salida_prog).total_seconds() // 60)

        # Clasificación entrada
        if abs(self.diferencia_entrada_min) <= 2:
            self.estado_entrada = "A tiempo"
        elif self.diferencia_entrada_min > 2:
            self.estado_entrada = "Tarde"
        else:
            self.estado_entrada = "Temprano"

        # Clasificación salida
        if abs(self.diferencia_salida_min) <= 2:
            self.estado_salida = "A tiempo"
        elif self.diferencia_salida_min > 2:
            self.estado_salida = "Tarde"
        else:
            self.estado_salida = "Temprano"

        self.save(update_fields=[
            'diferencia_entrada_min', 'diferencia_salida_min',
            'estado_entrada', 'estado_salida'
        ])
