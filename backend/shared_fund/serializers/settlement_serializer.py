from rest_framework import serializers
from shared_fund.models import Settlement


class SettlementSerializer(serializers.ModelSerializer):
    from_user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Settlement
        fields = ['id', 'fund', 'from_user', 'to_user', 'amount', 'created_at']
        read_only_fields = ['id', 'from_user', 'created_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Số tiền thanh toán phải lớn hơn 0.')
        return value
