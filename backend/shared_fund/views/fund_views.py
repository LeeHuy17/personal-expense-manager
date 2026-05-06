from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from shared_fund.models import SharedFund, FundMember, FundInvitation
from shared_fund.serializers.fund_serializer import SharedFundSerializer
from shared_fund.serializers.invitation_serializer import FundInvitationSerializer
from shared_fund.services.balance_service import calculate_fund_balances, calculate_settlement_plan

User = get_user_model()


class InviteMemberSerializer(serializers.Serializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    role = serializers.ChoiceField(choices=FundMember.ROLE_CHOICES, default=FundMember.ROLE_MEMBER)


class SharedFundViewSet(viewsets.ModelViewSet):
    serializer_class = SharedFundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SharedFund.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):   
        fund = serializer.save(owner=self.request.user)
        FundMember.objects.create(fund=fund, user=self.request.user, role=FundMember.ROLE_OWNER)

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        fund = self.get_object()
        if fund.owner != request.user:
            raise PermissionDenied('Chỉ owner mới được mời thành viên.')

        # --- BẮT ĐẦU DEBUG ---
        print("📥 Dữ liệu gửi từ Frontend:", request.data)
        
        serializer = InviteMemberSerializer(data=request.data)
        
        if not serializer.is_valid():
            print("❌ LỖI VALIDATION CHI TIẾT:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        target_user = serializer.validated_data['user']
        role = serializer.validated_data['role']

        if FundMember.objects.filter(fund=fund, user=target_user).exists():
            return Response({'detail': 'Thành viên đã có trong quỹ.'}, status=status.HTTP_400_BAD_REQUEST)

        if FundInvitation.objects.filter(fund=fund, invitee=target_user, status=FundInvitation.STATUS_PENDING).exists():
            return Response({'detail': 'Đã có lời mời đang chờ xử lý.'}, status=status.HTTP_400_BAD_REQUEST)

        FundInvitation.objects.create(
            fund=fund,
            inviter=request.user,
            invitee=target_user,
            role=role
        )
        return Response({'detail': 'Đã gửi lời mời tham gia quỹ.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='balances')
    def balances(self, request, pk=None):
        fund = self.get_object()
        if not FundMember.objects.filter(fund=fund, user=request.user).exists():
            raise PermissionDenied('Bạn không có quyền xem số dư của quỹ này.')

        balances = calculate_fund_balances(fund)
        return Response(balances)

    @action(detail=True, methods=['get'], url_path='settlement-plan')
    def settlement_plan(self, request, pk=None):
        fund = self.get_object()
        if not FundMember.objects.filter(fund=fund, user=request.user).exists():
            raise PermissionDenied('Bạn không có quyền xem kế hoạch thanh toán này.')

        plan = calculate_settlement_plan(fund)
        return Response(plan)


class AdminSharedFundListView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        owner_id = request.query_params.get('owner_id')
        funds = SharedFund.objects.all().order_by('owner__username', 'name')
        if owner_id:
            funds = funds.filter(owner__id=owner_id)

        data = [
            {
                'id': fund.id,
                'name': fund.name,
                'description': fund.description,
                'owner': fund.owner.username,
                'member_count': fund.members.count(),
                'created_at': fund.created_at.isoformat(),
                'updated_at': fund.updated_at.isoformat(),
            }
            for fund in funds
        ]
        return Response(data, status=status.HTTP_200_OK)


class AdminSharedFundDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def patch(self, request, fund_id):
        fund = SharedFund.objects.filter(id=fund_id).first()
        if not fund:
            return Response({'error': 'Quỹ chung không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        fund.name = request.data.get('name', fund.name)
        fund.description = request.data.get('description', fund.description)
        fund.save()

        return Response({
            'id': fund.id,
            'name': fund.name,
            'description': fund.description,
            'owner': fund.owner.username,
            'member_count': fund.members.count(),
            'created_at': fund.created_at.isoformat(),
            'updated_at': fund.updated_at.isoformat(),
        }, status=status.HTTP_200_OK)

    def delete(self, request, fund_id):
        fund = SharedFund.objects.filter(id=fund_id).first()
        if not fund:
            return Response({'error': 'Quỹ chung không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)
        fund.delete()
        return Response({'message': 'Quỹ chung đã được xóa.'}, status=status.HTTP_200_OK)
