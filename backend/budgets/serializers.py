from rest_framework import serializers
from .models import Budget
from expenses.models import Loai # Import model Loai của bạn

class BudgetSerializer(serializers.ModelSerializer):
    # Trả về thông tin chi tiết của danh mục thay vì chỉ cái ID
    category_name = serializers.CharField(source='category.tenLoai', read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Budget
        fields = ['id', 'user', 'category', 'category_name', 'amount', 'month', 'year']
        extra_kwargs = {'user': {'write_only': True}}