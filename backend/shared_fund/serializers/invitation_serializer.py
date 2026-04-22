from rest_framework import serializers
from shared_fund.models import FundInvitation


class FundInvitationSerializer(serializers.ModelSerializer):
    fund_name = serializers.CharField(source='fund.name', read_only=True)
    inviter_name = serializers.CharField(source='inviter.username', read_only=True)

    class Meta:
        model = FundInvitation
        fields = [
            'id', 'fund', 'fund_name', 'inviter', 'inviter_name', 'invitee', 'role',
            'status', 'created_at', 'responded_at'
        ]
        read_only_fields = ['id', 'fund_name', 'inviter_name', 'created_at', 'responded_at']