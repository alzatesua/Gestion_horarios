# workforce/utils.py
import csv
from io import StringIO
from django.http import HttpResponse
from django.conf import settings

def require_app_secret(request):
    # En prod exigimos el mismo header que manda tu front
    if settings.DEBUG:
        return True, None
    expected = getattr(settings, 'APP_SECRET', '')
    got = request.headers.get('X-Distritec-App', '')
    if expected and got == expected:
        return True, None
    return False, HttpResponse({'detail': 'No autorizado'}, status=403)

def csv_response(filename, rows, headers):
    out = StringIO()
    writer = csv.DictWriter(out, fieldnames=headers)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    resp = HttpResponse(out.getvalue(), content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
