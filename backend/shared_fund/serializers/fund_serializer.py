from django.contrib.auth import get_user_model
from rest_framework import serializers
from shared_fund.models import SharedFund, FundMember

User = get_user_model()


class SharedFundSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField(read_only=True)
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = SharedFund
        fields = [
            'id', 'name', 'description', 'owner', 'member_count', 'members',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'member_count', 'members', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        return FundMemberSerializer(obj.members.all(), many=True).data


class FundMemberSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = FundMember
        fields = ['id', 'fund', 'user', 'user_id', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'user_id', 'joined_at']
