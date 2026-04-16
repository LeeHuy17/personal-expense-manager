import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from .services import get_ai_advice


class ChatAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            payload = request.data
        except Exception:
            return Response({'text': 'Dữ liệu không hợp lệ.'}, status=400)

        message = (payload.get('message') or '').strip()
        if not message:
            return Response({'text': 'Vui lòng nhập câu hỏi.'}, status=400)

        response_data = get_ai_advice(request.user, message)
        return Response(response_data)
