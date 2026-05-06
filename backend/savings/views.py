from rest_framework import viewsets
from .models import SavingsGoal
from .serializers import SavingsGoalSerializer
from rest_framework.permissions import IsAuthenticated

class SavingsGoalViewSet(viewsets.ModelViewSet):
    queryset = SavingsGoal.objects.all()
    serializer_class = SavingsGoalSerializer
    permission_classes = [IsAuthenticated] # Chỉ người đã đăng nhập mới xem được

    # Để chỉ lấy dữ liệu của user đang đăng nhập
    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)