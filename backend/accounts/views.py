from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from .serializers import RegisterSerializer 
from django.contrib.auth.models import User

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User created successfully",
                "username": user.username,
                "email": user.email
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        print(f"📧 Email nhận được: {email}")
        print(f"🔐 Password nhận được: {password}")
        
        # Kiểm tra dữ liệu đầu vào
        if not email or not password:
            return Response({
                "error": "Email và mật khẩu là bắt buộc"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Tìm user bằng email
            user = User.objects.get(email=email)
            print(f"✅ Tìm thấy user: {user.username} (email: {user.email})")
        except User.DoesNotExist:
            print(f"❌ Không tìm thấy user với email: {email}")
            return Response({
                "error": "Email hoặc mật khẩu không đúng"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Kiểm tra mật khẩu
        if not user.check_password(password):
            print(f"❌ Mật khẩu không đúng cho user: {user.username}")
            return Response({
                "error": "Email hoặc mật khẩu không đúng"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        print(f"✅ Đăng nhập thành công cho user: {user.username}")
        
        # Trả về token (sử dụng token từ authtoken nếu có, hoặc trả về thông tin user)
        response_data = {
            "message": "Đăng nhập thành công",
            "username": user.username,
            "email": user.email,
            "id": user.id
        }
        
        # Nếu rest_framework.authtoken được cài, tạo token
        try:
            token = Token.objects.get(user=user)
        except Token.DoesNotExist:
            token = Token.objects.create(user=user)
        
        response_data["access"] = token.key
        
        return Response(response_data, status=status.HTTP_200_OK)