from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated

from .models import ChiPhi, ThuNhap, Loai, User
from .serializers import ChiPhiSerializer, ThuNhapSerializer, LoaiSerializer
from .services.ai_service import get_ai_advice 


# ==============================
# 💸 CHI PHÍ
# ==============================
class ChiPhiViewSet(viewsets.ModelViewSet):
    serializer_class = ChiPhiSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChiPhi.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==============================
# 💰 THU NHẬP
# ==============================
class ThuNhapViewSet(viewsets.ModelViewSet):
    serializer_class = ThuNhapSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ThuNhap.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==============================
# 🏷️ LOẠI (CATEGORY)
# ==============================
class LoaiViewSet(viewsets.ModelViewSet):
    serializer_class = LoaiSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Loai.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ==============================
# 🤖 AI ADVICE API
# ==============================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_advice(request):
    try:
        user = User.objects.get(username="caokien2")  # 👈 tạm thời hardcode, sau này lấy từ request.user

        incomes = ThuNhap.objects.filter(user=user).values()
        expenses = ChiPhi.objects.filter(user=user).values()

        advice = get_ai_advice(list(incomes), list(expenses))

        return Response({
            "status": "success",
            "data": {
                "advice": advice
            }
        })

    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)