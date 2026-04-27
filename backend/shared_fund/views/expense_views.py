from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from shared_fund.models import Expense, FundMember
from shared_fund.serializers.expense_serializer import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Expense.objects.filter(fund__members__user=self.request.user).distinct().order_by('-date')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            queryset = queryset.filter(fund_id=fund_id)
        return queryset

    def perform_create(self, serializer):
        fund = serializer.validated_data.get('fund')
        if not FundMember.objects.filter(fund=fund, user=self.request.user).exists():
            raise PermissionDenied('Bạn phải là thành viên của quỹ để thêm khoản chi.')
        serializer.save(created_by=self.request.user)
