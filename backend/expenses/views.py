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

    def perform_create(self, serializer):
        # BẮT BUỘC 3: Khi lưu, phải gán cứng user là người đang đăng nhập
        serializer.save(user=self.request.user)

class ChiPhiViewSet(viewsets.ModelViewSet):
    serializer_class = ChiPhiSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Tương tự: Bảo mật tuyệt đối dữ liệu chi phí
        return ChiPhi.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        # Tự động gán User khi lưu khoản chi mới
        serializer.save(user=self.request.user)

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