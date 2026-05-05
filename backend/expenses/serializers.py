from rest_framework import serializers
from datetime import date
from .models import ChiPhi, ThuNhap, Loai

# Serializer cho Module Chi tiêu (Module chính)
class ChiPhiSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChiPhi
        # Sử dụng danh sách fields cụ thể thay vì '__all__' để dễ kiểm soát
        fields = ['chiPhiId', 'amount', 'date', 'moTa', 'loai', 'user']
        
        # QUAN TRỌNG: Chặn Frontend tự gửi userId để tránh User A lưu chi phí cho User B
        read_only_fields = ['user', 'chiPhiId']

    # 1. Validation số tiền chi phí > 0
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Số tiền chi tiêu phải lớn hơn 0.")
        return value

    # 2. Validation ngày tháng (Đồng bộ với Thu nhập)
    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Ngày chi tiêu không được vượt quá ngày hiện tại!")
        return value

# Serializer cho Module Thu nhập (Đã cập nhật theo DB mới)
class ThuNhapSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThuNhap
        fields = ['incomeId', 'amount', 'date', 'moTa', 'loai', 'user']
        # Quan trọng: Không cho phép Frontend tự gửi userId lên để tránh giả mạo
        read_only_fields = ['user', 'incomeId'] 

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
        read_only_fields = ['user', 'loaiId']