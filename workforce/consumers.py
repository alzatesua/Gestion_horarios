# workforce/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from datetime import datetime
from django.utils import timezone  # 👈 añadido para timestamps de ping/pong

STATUS_KEY = "workforce:statuses"  # dict {userId: {...}}

def _get_all():
    return cache.get(STATUS_KEY, {})

def _set_all(data):
    cache.set(STATUS_KEY, data, None)

class RealtimeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.role = None
        self.userId = None  # 👈 por seguridad
        await self.accept()
        # aceptamos la conexión de una vez; el rol se define luego con identify_*

    async def disconnect(self, code):
        # Si era un agente, lo quitamos del listado y avisamos a los líderes
        if getattr(self, "userId", None) and self.role == "agent":
            data = _get_all()
            if self.userId in data:
                data.pop(self.userId, None)
                _set_all(data)
                await self.channel_layer.group_send(
                    "leaders",
                    {
                        "type": "broadcast.json",
                        "payload": {
                            "type": "user_disconnected",
                            "userId": self.userId,
                        },
                    },
                )

        # Si era líder, lo sacamos del grupo de líderes
        if self.role == "leader":
            await self.channel_layer.group_discard("leaders", self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
        except Exception:
            return

        t = data.get("type")

        # 💓 1) Mantener viva la conexión: manejar "ping" del frontend
        if t == "ping":
            # Si ya conocemos al agente, podemos actualizar su lastUpdate
            if self.role == "agent" and self.userId:
                db = _get_all()
                cur = db.get(self.userId, {})
                cur.update({
                    "lastUpdate": data.get("timestamp") or datetime.utcnow().isoformat()
                })
                db[self.userId] = cur
                _set_all(db)

            # Responder con un "pong" para que el cliente sepa que el WS sigue vivo
            await self.send_json({
                "type": "pong",
                "serverTime": timezone.now().isoformat(),
            })
            return  # 👈 importante: no seguir procesando este mensaje

        # 🧾 2) Identificar líder
        if t == "identify_leader":
            self.role = "leader"
            await self.channel_layer.group_add("leaders", self.channel_name)
            return

        # 🧾 3) Identificar agente
        elif t == "identify_agent":
            self.role = "agent"
            self.userId = data.get("userId")
            estado = {
                "userId": data.get("userId"),
                "nombre": data.get("nombre"),
                "cargo": data.get("cargo"),
                "area": data.get("area"),
                "estado": "disponible",
                "lastUpdate": datetime.utcnow().isoformat(),
            }
            db = _get_all()
            db[self.userId] = estado
            _set_all(db)
            await self._broadcast_all_leaders({"type": "user_connected", **estado})
            return

        # 🧾 4) Petición de todos los estados (para panel líder)
        elif t == "request_all_status":
            db = _get_all()
            await self.send_json({"type": "all_status", "users": list(db.values())})
            return

        # 🧾 5) Cambio de estado
        elif t == "estado_cambio":
            userId = data.get("userId")
            db = _get_all()
            cur = db.get(userId, {})
            cur.update({
                "userId": userId,
                "nombre": data.get("nombre", cur.get("nombre")),
                "cargo": data.get("cargo", cur.get("cargo")),
                "area": data.get("area", cur.get("area")),
                "estado": data.get("estado", cur.get("estado", "disponible")),
                "lastUpdate": data.get("timestamp") or datetime.utcnow().isoformat(),
            })
            db[userId] = cur
            _set_all(db)
            await self._broadcast_all_leaders({"type": "estado_cambio", **cur})
            return

        # Si llega otro tipo que no conocemos, lo ignoramos
        # (puedes loggear si quieres debug)
        # print("Mensaje WS desconocido:", data)

    async def _broadcast_all_leaders(self, payload):
        await self.channel_layer.group_send(
            "leaders",
            {
                "type": "broadcast.json",
                "payload": payload,
            },
        )

    async def broadcast_json(self, event):
        await self.send_json(event["payload"])

    async def send_json(self, obj):
        await self.send(text_data=json.dumps(obj))
