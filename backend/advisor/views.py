import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.http import StreamingHttpResponse
from django.views.generic import TemplateView
from .services import (
    get_advisor_response,
    stream_advisor_response,
    get_daily_suggestion,
    load_chat_history,
)
from .serializers import ChatMessageSerializer


class AdvisorChatAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'text': 'Vui lòng nhập câu hỏi.'}, status=400)

        response_data = get_advisor_response(request.user, message)
        return Response(response_data)


class AdvisorStreamAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'text': 'Vui lòng nhập câu hỏi.'}, status=400)

        stream = stream_advisor_response(request.user, message)
        response = StreamingHttpResponse(stream, content_type='text/plain; charset=utf-8')
        response['Cache-Control'] = 'no-cache'
        return response


class DailySuggestionAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_daily_suggestion(request.user))


class ChatHistoryAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = load_chat_history(request.user)
        serializer = ChatMessageSerializer(history, many=True)
        return Response({'history': serializer.data})


class AdvisorPageView(TemplateView):
    template_name = 'advisor/chat_window.html'
