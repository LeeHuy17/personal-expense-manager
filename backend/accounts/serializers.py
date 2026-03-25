from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate_username(self, value):
        """Kiểm tra username đã tồn tại hay chưa"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username này đã được sử dụng!")
        return value

    def validate_email(self, value):
        """Kiểm tra email đã tồn tại hay chưa"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email này đã được sử dụng!")
        if not value:
            raise serializers.ValidationError("Email không được để trống!")
        return value

    def validate(self, data):
        """Kiểm tra password nếu có password_confirm"""
        password = data.get('password')
        password_confirm = data.pop('password_confirm', None)
        
        if password_confirm and password != password_confirm:
            raise serializers.ValidationError({
                "password": "Mật khẩu không khớp!"
            })
        
        if len(password) < 6:
            raise serializers.ValidationError({
                "password": "Mật khẩu phải từ 6 ký tự trở lên!"
            })
        
        return data

    def create(self, validated_data):
        """Tạo user với mật khẩu đã hash"""
        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            print(f"✅ User created successfully: {user.username} (ID: {user.id})")
            return user
        except IntegrityError as e:
            print(f"❌ IntegrityError khi tạo user: {str(e)}")
            raise serializers.ValidationError(f"Lỗi database: {str(e)}")
        except Exception as e:
            print(f"❌ Lỗi không xác định: {str(e)}")
            raise serializers.ValidationError(f"Lỗi không xác định: {str(e)}")