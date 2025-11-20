# core/dbrouters.py

class InfAsesoresRouter:
    # modelos que van a la BD 'database1'
    route_models = {"usuario", "pri", "asesores", "inftrab", "cargosdistritec"}  # en minúsculas

    def db_for_read(self, model, **hints):
        return "database1" if model and model._meta.model_name in self.route_models else None

    def db_for_write(self, model, **hints):
        return "database1" if model and model._meta.model_name in self.route_models else None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if model_name in self.route_models:
            return db == "database1"
        return None


# core/dbrouters.py

class WorkforceRouter:
    route_models_hs = {
        "solicitud",
        "asignacionhorario",
        "asesor",
        "estadotipo",
        "estadoconfigasesor",
        "jornadaestado",
        "jornadalaboral",
    }

    def db_for_read(self, model, **hints):
        return "database_HRS" if model and model._meta.model_name in self.route_models_hs else None

    def db_for_write(self, model, **hints):
        return "database_HRS" if model and model._meta.model_name in self.route_models_hs else None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if model_name in self.route_models_hs:
            return db == "database_HRS"
        return None
