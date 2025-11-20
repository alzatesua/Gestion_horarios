# consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from urllib.parse import parse_qs
from django.utils import timezone

class SignalingConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        qs = parse_qs(self.scope.get("query_string", b"").decode())
        token_q = (qs.get("t") or [""])[0]

        hdrs = dict(self.scope.get("headers") or [])
        token_h = hdrs.get(b"x-distritec-app", b"").decode()

        if (token_q or token_h) != settings.APP_SHARED_SECRET:
            await self.close(code=4403)
            return

        self.room = self.scope["url_route"]["kwargs"]["room"]
        await self.channel_layer.group_add(self.room, self.channel_name)

        # marca de última actividad
        self.last_activity = timezone.now()

        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # 🔄 actualizamos la última actividad en cada mensaje
        from django.utils import timezone
        self.last_activity = timezone.now()

        msg_type = content.get("type")

        # 💓 PING desde el frontend → respondemos PONG
        if msg_type == "ping":
            await self.send_json({
                "type": "pong",
                "timestamp": timezone.now().isoformat()
            })
            return

        # resto de mensajes siguen funcionando igual
        await self.channel_layer.group_send(
            self.room,
            {"type": "signal.message", "payload": content}
        )

    async def signal_message(self, event):
        await self.send_json(event["payload"])
