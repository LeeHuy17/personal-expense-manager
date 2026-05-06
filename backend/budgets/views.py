from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Budget
from expenses.models import Loai
from .serializers import BudgetSerializer

class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Chỉ lấy ngân sách của user hiện tại
        return Budget.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Tự động gán user đang đăng nhập vào ngân sách
        serializer.save(user=self.request.user)

    # API con để lấy danh sách danh mục là "Chi phí" (Expense)
    @action(detail=False, methods=['get'])
    def expense_categories(self, request):
        categories = Loai.objects.filter(user=request.user, type='expense')
        # Format lại dữ liệu trả về cho frontend dễ dùng
        data = [{'id': c.loaiId, 'name': c.tenLoai} for c in categories]
        return Response(data)