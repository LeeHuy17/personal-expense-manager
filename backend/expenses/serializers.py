from rest_framework import serializers
from .models import ChiPhi, ThuNhap, Loai

# Serializer cho Module Chi tiêu (Module chính)
class ChiPhiSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChiPhi
        fields = '__all__'

    # Yêu cầu 3: Validation số tiền chi phí > 0
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Số tiền chi tiêu phải lớn hơn 0.")
        return value

# Serializer cho Module Thu nhập (Sprint 1)
class ThuNhapSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThuNhap
        fields = '__all__'

    # Yêu cầu 3: Validation số tiền thu nhập > 0
    def validate_soLuong(self, value):
        if value <= 0:
            raise serializers.ValidationError("Số tiền thu nhập phải lớn hơn 0.")
        return value

# Serializer cho Module Loại/Danh mục (Khắc phục lỗi ImportError)
class LoaiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loai
        fields = '__all__'