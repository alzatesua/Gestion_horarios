from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # request.user es el SimpleUser construido en JWTAuthentication
        return Response({
            "id": request.user.id,
            "usuario": request.user.username,
            "rol": request.user.rol,
        })
