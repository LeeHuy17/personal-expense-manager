from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from shared_fund.models import Settlement, FundMember
from shared_fund.serializers.settlement_serializer import SettlementSerializer


class SettlementViewSet(viewsets.ModelViewSet):
    serializer_class = SettlementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Settlement.objects.filter(fund__members__user=self.request.user).distinct().order_by('-created_at')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            queryset = queryset.filter(fund_id=fund_id)
        return queryset

    def perform_create(self, serializer):
        fund = serializer.validated_data.get('fund')
        to_user = serializer.validated_data.get('to_user')
        if not FundMember.objects.filter(fund=fund, user=self.request.user).exists():
            raise PermissionDenied('Bạn phải là thành viên của quỹ để thực hiện thanh toán.')
        if not FundMember.objects.filter(fund=fund, user=to_user).exists():
            raise PermissionDenied('Người nhận phải là thành viên của quỹ.')
        serializer.save(from_user=self.request.user)
