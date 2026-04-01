from rest_framework import serializers
from .models import ChiPhi, ThuNhap, Loai

# Serializer cho Module Chi tiêu (Module chính)
class ChiPhiSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChiPhi
        fields = '__all__'

    # Validation số tiền chi phí > 0
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Số tiền chi tiêu phải lớn hơn 0.")
        return value

# Serializer cho Module Thu nhập (Đã cập nhật theo DB mới)
class ThuNhapSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThuNhap
        fields = '__all__'
        # Quan trọng: Không cho phép Frontend tự gửi userId lên để tránh giả mạo
        read_only_fields = ['user'] 

    def validate_amount(self, value):
        # Chặn trường hợp nhập số âm hoặc bằng 0
        if value <= 0:
            raise serializers.ValidationError("Số tiền thu nhập phải lớn hơn 0!")
        return value

    def validate_date(self, value):
        from datetime import date
        # Chặn trường hợp chọn ngày ở tương lai (nếu nghiệp vụ không cho phép)
        if value > date.today():
            raise serializers.ValidationError("Ngày thu nhập không được ở tương lai!")
        return value

# Serializer cho Module Loại/Danh mục
class LoaiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loai
        fields = '__all__'