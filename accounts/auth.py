import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from collections import namedtuple

SimpleUser = namedtuple("SimpleUser", ["id","username","rol"])

class JWTAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth = authentication.get_authorization_header(request).decode("utf-8")
        if not auth or not auth.startswith(self.keyword):
            return None
        token = auth.split(" ", 1)[1].strip()
        try:
            data = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("token expirado")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("token inválido")

        if data.get("type") != "access":
            raise exceptions.AuthenticationFailed("token inválido")
        user = SimpleUser(id=data.get("sub"), username=data.get("username"), rol=data.get("rol"))
        return (user, None)
