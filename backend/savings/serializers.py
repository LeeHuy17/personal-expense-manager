from rest_framework import serializers
from .models import SavingsGoal

class SavingsGoalSerializer(serializers.ModelSerializer):
    # Dùng CurrentUserDefault để lấy user từ Token thay vì bắt client gửi lên
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    class Meta:
        model = SavingsGoal
        fields = '__all__' # Hoặc liệt kê: ['id', 'title', 'target_amount', 'current_amount', 'deadline']