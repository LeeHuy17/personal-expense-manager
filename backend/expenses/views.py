from django.db.models import ProtectedError
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ChiPhi, ThuNhap, Loai, Profile
from .serializers import ChiPhiSerializer, ThuNhapSerializer, LoaiSerializer

class ThuNhapViewSet(viewsets.ModelViewSet):
    serializer_class = ThuNhapSerializer
    # BẮT BUỘC 1: Phải có quyền IsAuthenticated để xác định request.user là ai
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # BẮT BUỘC 2: Chỉ lọc những bản ghi có user khớp với người đang gửi request
        user = self.request.user
        return ThuNhap.objects.filter(user=user).order_by('-date')

    def create(self, request, *args, **kwargs):
        print(f"[DEBUG] ThuNhapViewSet.create() - User: {request.user.username}, Data: {request.data}")
        try:
            serializer = self.get_serializer(data=request.data)
            print(f"[DEBUG] Serializer is_valid: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"[DEBUG] Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            print(f"[DEBUG] Successfully created ThuNhap: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"[DEBUG] Error creating ThuNhap: {e}")
            import traceback
            print(f"[DEBUG] Traceback: {traceback.format_exc()}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # BẮT BUỘC 3: Khi lưu, phải gán cứng user là người đang đăng nhập
        serializer.save(user=self.request.user)

class ChiPhiViewSet(viewsets.ModelViewSet):
    serializer_class = ChiPhiSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Tương tự: Bảo mật tuyệt đối dữ liệu chi phí
        user = self.request.user
        queryset = ChiPhi.objects.filter(user=user).order_by('-date')
        print(f"[DEBUG] ChiPhiViewSet.get_queryset() - User: {user.username}, Count: {queryset.count()}")
        return queryset

    def create(self, request, *args, **kwargs):
        print(f"[DEBUG] ChiPhiViewSet.create() - User: {request.user.username}, Data: {request.data}")
        try:
            serializer = self.get_serializer(data=request.data)
            print(f"[DEBUG] Serializer is_valid: {serializer.is_valid()}")
            if not serializer.is_valid():
                print(f"[DEBUG] Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            print(f"[DEBUG] Successfully created ChiPhi: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            print(f"[DEBUG] Error creating ChiPhi: {e}")
            import traceback
            print(f"[DEBUG] Traceback: {traceback.format_exc()}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # Tự động gán User khi lưu khoản chi mới
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        print(f"[DEBUG] ChiPhiViewSet.destroy() - User: {request.user.username}, PK: {kwargs.get('pk')}")
        try:
            instance = self.get_object()
            print(f"[DEBUG] Found ChiPhi instance: ID={instance.chiPhiId}, User={instance.user.username}")
            self.perform_destroy(instance)
            print(f"[DEBUG] Successfully deleted ChiPhi ID={instance.chiPhiId}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ChiPhi.DoesNotExist:
            print(f"[DEBUG] ChiPhi with PK={kwargs.get('pk')} not found for user {request.user.username}")
            return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"[DEBUG] Error deleting ChiPhi: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoaiViewSet(viewsets.ModelViewSet):
    queryset = Loai.objects.all()
    serializer_class = LoaiSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Loai.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"error": "Không thể xóa danh mục đã có giao dịch liên quan."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Bắt buộc có dòng này

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else ''
        return Response({
            'username': request.user.username,
            'email': request.user.email,
            'avatar_url': avatar_url,
        }, status=200)

    def post(self, request):
        avatar_file = request.FILES.get('avatar')
        if avatar_file:
            profile, _ = Profile.objects.get_or_create(user=request.user)
            profile.avatar = avatar_file
            profile.save()
            avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else ''
            return Response({
                "message": "Thành công",
                "avatar_url": avatar_url,
            }, status=200)
        return Response({"error": "Không có file"}, status=400)