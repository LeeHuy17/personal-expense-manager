from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from shared_fund.models import FundInvitation, FundMember
from shared_fund.serializers.invitation_serializer import FundInvitationSerializer


class FundInvitationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FundInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FundInvitation.objects.filter(invitee=self.request.user, status=FundInvitation.STATUS_PENDING)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invitee != request.user:
            return Response({'detail': 'Bạn không có quyền chấp nhận lời mời này.'}, status=status.HTTP_403_FORBIDDEN)

        if invitation.status != FundInvitation.STATUS_PENDING:
            return Response({'detail': 'Lời mời này đã được xử lý.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create membership
        FundMember.objects.create(
            fund=invitation.fund,
            user=invitation.invitee,
            role=invitation.role
        )

        # Update invitation
        invitation.status = FundInvitation.STATUS_ACCEPTED
        invitation.responded_at = timezone.now()
        invitation.save()

        return Response({'detail': 'Đã chấp nhận lời mời tham gia quỹ.'})

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invitee != request.user:
            return Response({'detail': 'Bạn không có quyền từ chối lời mời này.'}, status=status.HTTP_403_FORBIDDEN)

        if invitation.status != FundInvitation.STATUS_PENDING:
            return Response({'detail': 'Lời mời này đã được xử lý.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation.status = FundInvitation.STATUS_REJECTED
        invitation.responded_at = timezone.now()
        invitation.save()

        return Response({'detail': 'Đã từ chối lời mời tham gia quỹ.'})