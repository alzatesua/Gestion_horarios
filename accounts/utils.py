import jwt, datetime
from django.conf import settings

def _now():
    return datetime.datetime.utcnow()

def make_tokens(payload: dict):
    # payload mínimo común
    base = {"iat": _now(), "iss": "mi_api"}
    access_payload = {
        **base, **payload,
        "type": "access",
        "exp": _now() + datetime.timedelta(minutes=settings.JWT_ACCESS_MINUTES),
    }
    refresh_payload = {
        **base, "sub": payload.get("sub"),
        "type": "refresh",
        "exp": _now() + datetime.timedelta(days=settings.JWT_REFRESH_DAYS),
    }
    access  = jwt.encode(access_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    refresh = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return access, refresh
