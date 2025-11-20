from django.db import models

class Usuario(models.Model):                   
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255)
    usuario = models.CharField(max_length=100, unique=True)
    clave = models.CharField(max_length=255)
    rol = models.CharField(max_length=50)
    cedula = models.CharField(max_length=50, null=True, blank=True)
    ID_Sede = models.IntegerField(db_column='ID_Sede', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'usuario_login'            


class Pri(models.Model):
    ID_Pri = models.AutoField(primary_key=True, db_column='ID_Pri')
    ID_Asesor = models.IntegerField(db_column='ID_Asesor')   
    ID_Estado = models.IntegerField(db_column='ID_Estado')  
    ID_Inf_trab = models.IntegerField(db_column='ID_Inf_trab')  
    ID_Sede = models.IntegerField(db_column='ID_Sede')  

    class Meta:
        managed = False
        db_table = 'aa_prin'


class CargosDistritec(models.Model):
    id_cargo = models.AutoField(primary_key=True, db_column='ID_Cargo')
    cargo = models.CharField(max_length=50, db_column='Cargo', default='0')

    class Meta:
        managed = False
        db_table = 'cargos_distritec'

    def __str__(self):
        return self.cargo



class Asesores(models.Model):
    ID_Asesor         = models.AutoField(primary_key=True, db_column='ID_Asesor')
    Fecha_reg         = models.DateField(db_column='Fecha_reg', null=True, blank=True)
    Hora_reg          = models.TimeField(db_column='Hora_reg', null=True, blank=True)
    Nombre            = models.CharField(db_column='Nombre', max_length=100, null=True, blank=True)
    Tipo_Documento    = models.IntegerField(db_column='Tipo_Documento', null=True, blank=True)
    Cedula            = models.CharField(db_column='Cedula', max_length=20, null=True, blank=True)
    Direccion         = models.CharField(db_column='Direccion', max_length=255, null=True, blank=True)
    Correo            = models.CharField(db_column='Correo', max_length=100, null=True, blank=True)
    Fecha_nacimiento  = models.DateField(db_column='Fecha_nacimiento', null=True, blank=True)
    Ciudad            = models.IntegerField(db_column='Ciudad', null=True, blank=True)
    Departamento      = models.IntegerField(db_column='Departamento', null=True, blank=True)
    Edad              = models.IntegerField(db_column='Edad', null=True, blank=True)
    Fecha_Ingreso     = models.DateField(db_column='Fecha_Ingreso', null=True, blank=True)
    Telefono_personal = models.CharField(db_column='Telefono_personal', max_length=50, null=True, blank=True)
    Cantidad_de_Hijos = models.CharField(db_column='Cantidad_de_Hijos', max_length=2, null=True, blank=True)
    Tipo_de_Sangre    = models.IntegerField(db_column='Tipo_de_Sangre', null=True, blank=True)
    Genero            = models.IntegerField(db_column='Genero', null=True, blank=True)
    Escolaridad       = models.IntegerField(db_column='Escolaridad', null=True, blank=True)
    Estado_Civil      = models.IntegerField(db_column='Estado_Civil', null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'asesores' 

    def __str__(self):
        return f"{self.ID_Asesor} • {self.Nombre or ''}"


class InfTrab(models.Model):
    ID_Inf_trab = models.AutoField(primary_key=True, db_column='ID_Inf_trab')
    Codigo_vendedor = models.TextField(blank=True, null=True)
    Cargo = models.IntegerField(blank=True, null=True)
    Carnet = models.IntegerField(blank=True, null=True)
    Fecha_presente = models.DateField(blank=True, null=True)
    Talla = models.IntegerField(blank=True, null=True)
    ID_Area = models.IntegerField(blank=True, null=True)
    Telefono_corporativo = models.CharField(max_length=20, blank=True, null=True)
    correo_corporativo = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        managed = False  
        db_table = 'inf_trab'
     

