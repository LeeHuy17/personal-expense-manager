from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.authtoken.models import Token
from .serializers import RegisterSerializer 
from .models import PasswordResetRequest
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta

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
            user = User.objects.filter(email=email).first()
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
            "id": user.id,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
        
        # Nếu rest_framework.authtoken được cài, tạo token
        try:
            token = Token.objects.get(user=user)
        except Token.DoesNotExist:
            token = Token.objects.create(user=user)
        
        response_data["access"] = token.key
        
        return Response(response_data, status=status.HTTP_200_OK)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Vui lòng nhập email"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Create or update PasswordResetRequest record for real-time sync
            expires_at = timezone.now() + timedelta(hours=24)
            reset_request, created = PasswordResetRequest.objects.update_or_create(
                email=email,
                defaults={
                    'user': user,
                    'token': token,
                    'uid': uid.decode() if isinstance(uid, bytes) else uid,
                    'is_ready_to_reset': False,
                    'expires_at': expires_at
                }
            )
            print(f"✅ PasswordResetRequest created/updated: {reset_request}")
            
            # Link trỏ về Backend API - khi user click, sẽ mark as ready, frontend detect via polling
            reset_link = f"http://127.0.0.1:8000/api/accounts/mark-reset-ready/{uid.decode() if isinstance(uid, bytes) else uid}/{token}/"
            
            # --- PHẦN GỬI EMAIL HTML THẬT ---
            subject = 'Khôi phục mật khẩu - Personal Expense Manager'
            html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                    <h2 style="color: #ea580c; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
                    <p>Chào <strong>{user.username}</strong>,</p>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiến hành:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #ea580c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
                    </div>
                    <p style="font-size: 13px; color: #666;">Link này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999; text-align: center;">Đội ngũ JQKA - Personal Expense Manager</p>
                </div>
            """
            text_content = strip_tags(html_content) # Bản dự phòng nếu mail client không hỗ trợ HTML

            # Gửi mail dùng EmailMultiAlternatives (cho phép gửi HTML)
            msg = EmailMultiAlternatives(
                subject, 
                text_content, 
                settings.DEFAULT_FROM_EMAIL, 
                [email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()

            return Response({"message": "Email khôi phục đã được gửi thành công!"}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Bảo mật: Trả về 200 để tránh bị dò quét email tồn tại
            return Response({"message": "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link khôi phục."}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"❌ Lỗi gửi mail: {e}")
            return Response({"error": "Lỗi server khi gửi mail"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        API để đặt lại mật khẩu mới
        Cần các tham số: uid, token, new_password, confirm_password
        """
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Validation cơ bản
        if not all([uid, token, new_password, confirm_password]):
            return Response({
                "error": "Thiếu thông tin: uid, token, new_password, confirm_password"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Kiểm tra mật khẩu trùng khớp
        if new_password != confirm_password:
            return Response({
                "error": "Mật khẩu mới và xác nhận mật khẩu không trùng khớp"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Kiểm tra độ dài mật khẩu (tối thiểu 6 ký tự)
        if len(new_password) < 6:
            return Response({
                "error": "Mật khẩu phải có ít nhất 6 ký tự"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Giải mã uid để lấy user id
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Kiểm tra token có hợp lệ không
            if not default_token_generator.check_token(user, token):
                return Response({
                    "error": "Token không hợp lệ hoặc đã hết hạn"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Đặt mật khẩu mới
            user.set_password(new_password)
            user.save()
            
            print(f"✅ Mật khẩu đã được đặt lại cho user: {user.username}")
            
            return Response({
                "message": "Mật khẩu đã được đặt lại thành công",
                "username": user.username,
                "email": user.email
            }, status=status.HTTP_200_OK)
            
        except (TypeError, ValueError, User.DoesNotExist):
            return Response({
                "error": "Không thể xác nhận người dùng"
            }, status=status.HTTP_400_BAD_REQUEST)


class UserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.order_by('date_joined')
        data = [
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
            }
            for user in users
        ]
        return Response(data, status=status.HTTP_200_OK)


class UserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        if request.user.id == int(user_id):
            return Response({
                'error': 'Không thể xóa chính bạn.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, pk=user_id)
        user.delete()
        return Response({'message': 'Người dùng đã bị xóa thành công.'}, status=status.HTTP_200_OK)

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)

        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        if 'is_staff' in request.data:
            user.is_staff = bool(request.data.get('is_staff'))

        user.save()

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
        }, status=status.HTTP_200_OK)


class CheckResetStatusView(APIView):
    """
    Endpoint cho Frontend polling: check nếu user đã click reset link
    🔄 Real-time Sync: Frontend gọi mỗi 3-5 giây để check is_ready_to_reset
    
    GET /api/accounts/check-reset-status/?email=user@example.com
    Response: {
        "is_ready_to_reset": false,
        "token": "abc123...",
        "uid": "MTI=",
        "message": "Waiting for email confirmation"
    }
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        email = request.query_params.get('email')
        
        if not email:
            return Response({
                "error": "Vui lòng cung cấp email parameter"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            reset_request = PasswordResetRequest.objects.get(email=email)
            
            # Check nếu token đã hết hạn
            if reset_request.is_expired():
                return Response({
                    "is_ready_to_reset": False,
                    "message": "Link reset password đã hết hạn. Vui lòng gửi lại yêu cầu.",
                    "error": "expired"
                }, status=status.HTTP_200_OK)
            
            # Ready để reset password
            if reset_request.is_ready_to_reset:
                return Response({
                    "is_ready_to_reset": True,
                    "token": reset_request.token,
                    "uid": reset_request.uid,
                    "message": "✅ Link xác nhận đã được click! Form reset password sẵn sàng."
                }, status=status.HTTP_200_OK)
            
            # Vẫn đang chờ user click email
            return Response({
                "is_ready_to_reset": False,
                "message": "⏳ Đang chờ xác nhận từ email..."
            }, status=status.HTTP_200_OK)
            
        except PasswordResetRequest.DoesNotExist:
            return Response({
                "is_ready_to_reset": False,
                "message": "Không tìm thấy yêu cầu reset password. Vui lòng gửi lại."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"❌ Error checking reset status: {e}")
            return Response({
                "error": "Lỗi server"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkResetReadyView(APIView):
    """
    Endpoint mà user click từ email link
    Đánh dấu PasswordResetRequest.is_ready_to_reset = True
    Sau đó return HTML response hoặc redirect user
    
    GET /api/accounts/mark-reset-ready/{uid}/{token}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, uid, token):
        try:
            # Tìm reset request bằng token
            reset_request = PasswordResetRequest.objects.get(token=token)
            
            # Verify token hợp lệ
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            if not default_token_generator.check_token(user, token):
                html_content = """
                    <html>
                        <head>
                            <meta charset="utf-8">
                            <style>
                                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
                                .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                .error { color: #dc2626; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1 class="error">❌ Link không hợp lệ</h1>
                                <p>Token reset password không hợp lệ hoặc đã hết hạn.</p>
                                <p><a href="/">← Quay lại ứng dụng</a></p>
                            </div>
                        </body>
                    </html>
                """
                return HttpResponse(html_content, status=400, content_type='text/html; charset=utf-8')
            
            # Mark as ready - frontend sẽ detect và show reset form
            reset_request.mark_as_ready()
            print(f"✅ PasswordResetRequest marked as ready for {reset_request.email}")
            
            # Return success HTML response
            html_content = """
                <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
                            .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                            .success { color: #10b981; }
                            .info { color: #666; margin: 20px 0; }
                            a { color: #ea580c; text-decoration: none; font-weight: bold; }
                            a:hover { text-decoration: underline; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="success">✅ Link xác nhận thành công!</h1>
                            <p class="info">Quayy lại ứng dụng, bạn sẽ thấy form đặt lại mật khẩu đã hiển thị.</p>
                            <p><strong>Nếu không tự động hiển thị form, vui lòng refresh trang (F5)</strong></p>
                            <hr>
                            <p><a href="/">← Quay lại ứng dụng</a></p>
                        </div>
                    </body>
                </html>
            """
            return HttpResponse(html_content, status=200, content_type='text/html; charset=utf-8')
            
        except (TypeError, ValueError, User.DoesNotExist, PasswordResetRequest.DoesNotExist) as e:
            print(f"❌ Error marking reset ready: {e}")
            html_content = """
                <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
                            .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                            .error { color: #dc2626; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="error">❌ Lỗi xảy ra</h1>
                            <p>Yêu cầu reset password không tìm thấy hoặc đã hết hạn.</p>
                            <p><a href="/">← Quay lại ứng dụng</a></p>
                        </div>
                    </body>
                </html>
            """
            return HttpResponse(html_content, status=400, content_type='text/html; charset=utf-8')