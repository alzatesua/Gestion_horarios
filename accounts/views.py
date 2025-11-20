# accounts/views.py
import logging
import bcrypt
import jwt
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Usuario, Asesores, Pri, InfTrab, CargosDistritec
from .utils import make_tokens
from rest_framework import status
from django.db.models import Subquery, OuterRef
from core.dbrouters import InfAsesoresRouter  
from collections import OrderedDict
logger = logging.getLogger(__name__)
ALLOWED_ESTADOS = {1, 2, 4}

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = (request.data.get("usuario") or "").strip()
        password = (request.data.get("clave") or "")
        asesor_id_from_body = request.data.get("asesor_id")  # opcional: si lo envías desde el frontend

        logger.info(f"Intento de login: usuario='{username}'")

        if not username or not password:
            return Response({"detail": "usuario y clave requeridos"}, status=400)

        # 1) Usuario
        try:
            u = Usuario.objects.get(usuario__iexact=username)
            logger.info(f"Usuario encontrado: ID={u.id}, usuario={u.usuario}")
        except Usuario.DoesNotExist:
            return Response({"detail": "credenciales inválidas"}, status=401)

        # 2) Validar contraseña (bcrypt; normaliza $2y$ → $2b$)
        hash_bd = (u.clave or "").strip()
        if not hash_bd:
            return Response({"detail": "credenciales inválidas"}, status=401)

        hash_bd_bytes = hash_bd.encode("utf-8")
        if hash_bd_bytes.startswith(b"$2y$"):
            hash_bd_bytes = b"$2b$" + hash_bd_bytes[4:]

        try:
            ok = bcrypt.checkpw((password or "").encode("utf-8"), hash_bd_bytes)
        except Exception as e:
            logger.error(f"Error verificando contraseña: {e}")
            ok = False

        if not ok:
            return Response({"detail": "credenciales inválidas"}, status=401)

        # 3) Obtener ID_Asesor (SIN FK):
        #    a) si te pasan asesor_id (PK lógico de negocio en Asesores.ID_Asesor), úsalo
        #    b) si no, cae a la cédula (Usuario.cedula -> Asesores.Cedula)
        id_asesor = None
        if asesor_id_from_body:
            id_asesor = (
                Asesores.objects
                .filter(ID_Asesor=asesor_id_from_body)
                .values_list("ID_Asesor", flat=True)
                .first()
            )
            if id_asesor:
                logger.info(f"Asesor por ID_Asesor={asesor_id_from_body}")
            else:
                return Response({"detail": "asesor no encontrado"}, status=403)
        else:
            # fallback por cédula
            if not u.cedula:
                return Response({"detail": "usuario sin cédula configurada"}, status=403)

            id_asesor = (
                Asesores.objects
                .filter(Cedula=u.cedula)
                .values_list("ID_Asesor", flat=True)
                .first()
            )
            if id_asesor:
                logger.info(f"Asesor por Cedula={u.cedula} → ID_Asesor={id_asesor}")
            else:
                return Response({"detail": "asesor no encontrado"}, status=403)

        #Obtener informacion de la tabla principal
        pri = Pri.objects.filter(ID_Asesor=id_asesor).order_by("-ID_Pri").first()
        estado = pri.ID_Estado if pri else None

        #Obtener informacion de trabajo
        inf_trab = InfTrab.objects.filter(ID_Inf_trab=pri.ID_Inf_trab).order_by("-ID_Inf_trab").first()
        codigo_vendedor = inf_trab.Codigo_vendedor

        #Obtener cargo
        cargo_d = CargosDistritec.objects.filter(id_cargo=inf_trab.Cargo).order_by("-id_cargo").first()

        
        if estado is None:
            return Response({"detail": "usuario sin estado configurado"}, status=403)
        if estado not in ALLOWED_ESTADOS:
            return Response({"detail": "usuario inactivo o bloqueado", "estado": estado}, status=403)

        # 5) Tokens
        claims = {
            "sub": u.id,
            "username": u.usuario,
            "nombre": u.nombre,
            "rol": u.rol,
            "id_sede": pri.ID_Sede,
            "id_asesor": id_asesor,
            "codigo_vendedor":codigo_vendedor,
            "cargo": cargo_d.cargo,
        }
        access, refresh = make_tokens(claims)

        return Response({
            "access": access,
            "refresh": refresh,
            "user": {
                "id": u.id,
                "usuario": u.usuario,
                "nombre": u.nombre,
                "rol": u.rol,
                "id_sede": pri.ID_Sede,
                "estado": estado,
                "id_asesor": id_asesor,
                "codigo_vendedor":codigo_vendedor,
                "cargo": cargo_d.cargo,
        
            }
        }, status=200)


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = request.data.get("refresh")
        if not token:
            return Response({"detail": "refresh requerido"}, status=400)

        try:
            data = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if data.get("type") != "refresh":
                return Response({"detail": "token inválido"}, status=401)
        except jwt.ExpiredSignatureError:
            return Response({"detail": "refresh expirado"}, status=401)
        except jwt.InvalidTokenError:
            return Response({"detail": "token inválido"}, status=401)

        claims = {k: v for k, v in data.items() if k in {"sub", "username", "nombre", "rol", "sede", "id_asesor"}}
        access, _ = make_tokens(claims)
        return Response({"access": access})














class PersonasPorSedeView(APIView):
    # igual que LoginView, sin auth/perm si lo necesitas público
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        id_sede_raw = (request.data.get("id_sede") or "").strip()
        incluir_usuarios_login = bool(request.data.get("incluir_usuarios_login", False))

        logger.info(f"Consulta personas por sede: id_sede='{id_sede_raw}'")

        # 1) Validación de entrada
        if not id_sede_raw.isdigit():
            return Response({"detail": "id_sede es requerido y debe ser numérico"}, status=400)
        id_sede = int(id_sede_raw)

        # 2) IDs de asesores en esa sede (tabla puente Pri)
        asesor_ids = (
            Pri.objects
            .filter(ID_Sede=id_sede)
            .values_list("ID_Asesor", flat=True)
            .distinct()
        )

        if not asesor_ids:
            # Sin asesores en la sede; decide si devuelves 200 vacio o 404
            return Response({
                "id_sede": id_sede,
                "total_asesores": 0,
                "asesores": []
            }, status=200)

        asesor_ids = list(asesor_ids)
        logger.info(f"Asesores en sede {id_sede}: {len(asesor_ids)}")


        # 3) Último registro Pri por asesor (para traer estado y el ID_Inf_trab asociado)
        #    Ordenamos por ID_Asesor y -ID_Pri; nos quedamos con el primero de cada asesor
        pri_rows = (
            Pri.objects
            .filter(ID_Asesor__in=asesor_ids, ID_Sede=id_sede)
            .order_by("ID_Asesor", "-ID_Pri")
            .values("ID_Asesor", "ID_Pri", "ID_Estado", "ID_Inf_trab", "ID_Sede")
        )







        pri_por_asesor = OrderedDict()
        for row in pri_rows:
            if row["ID_Asesor"] not in pri_por_asesor:
                pri_por_asesor[row["ID_Asesor"]] = row

        pri_por_asesor = OrderedDict(
            (k, v) for k, v in pri_por_asesor.items()
            if v.get("ID_Estado") in ALLOWED_ESTADOS
        )

        inf_ids = [r["ID_Inf_trab"] for r in pri_por_asesor.values() if r["ID_Inf_trab"]]




        



        # 4) Batch de InfTrab y Cargos
        inf_map = {}
        if inf_ids:
            for it in (
                InfTrab.objects
                .filter(ID_Inf_trab__in=inf_ids)
                .values("ID_Inf_trab", "Codigo_vendedor", "Cargo")
            ):
                inf_map[it["ID_Inf_trab"]] = it

        cargo_ids = { (inf_map.get(r["ID_Inf_trab"]) or {}).get("Cargo") for r in pri_por_asesor.values() }
        cargo_ids = {cid for cid in cargo_ids if cid}  # quita None/0

        cargos_map = {}
        if cargo_ids:
            for c in CargosDistritec.objects.filter(id_cargo__in=cargo_ids).values("id_cargo", "cargo"):
                cargos_map[c["id_cargo"]] = c["cargo"]

        # 5) Datos básicos de Asesores
        asesores_rows = (
            Asesores.objects
            .filter(ID_Asesor__in=asesor_ids)
            .values("ID_Asesor", "Nombre", "Correo", "Cedula", "Telefono_personal")
        )
        asesores_map = {a["ID_Asesor"]: a for a in asesores_rows}

        # 6) (Opcional) Usuarios por sede (según usuario_login.ID_Sede)
        usuarios_login = []
        if incluir_usuarios_login:
            usuarios_login = list(
                Usuario.objects
                .filter(ID_Sede=id_sede)
                .values("id", "nombre", "usuario", "rol", "cedula")
            )

        # 7) Armar respuesta consolidada
        resultado = []
        for id_asesor, pri in pri_por_asesor.items():
            a = asesores_map.get(id_asesor, {})
            inf = inf_map.get(pri["ID_Inf_trab"]) if pri else None
            cargo_id = (inf or {}).get("Cargo")
            resultado.append({
                "id_asesor": id_asesor,
                "nombre": a.get("Nombre"),
                "correo": a.get("Correo"),
                "cedula": a.get("Cedula"),
                "telefono_personal": a.get("Telefono_personal"),
                "id_sede": pri.get("ID_Sede") if pri else id_sede,
                "estado": pri.get("ID_Estado") if pri else None,
                "id_pri": pri.get("ID_Pri") if pri else None,
                "id_inf_trab": pri.get("ID_Inf_trab") if pri else None,
                "codigo_vendedor": (inf or {}).get("Codigo_vendedor"),
                "cargo_id": cargo_id,
                "cargo": cargos_map.get(cargo_id),
            })

        payload = {
            "id_sede": id_sede,
            "total_asesores": len(resultado),
            "asesores": resultado,
        }
        if incluir_usuarios_login:
            payload.update({
                "total_usuarios_login": len(usuarios_login),
                "usuarios_login": usuarios_login,
            })

        return Response(payload, status=status.HTTP_200_OK)
