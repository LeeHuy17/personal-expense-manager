from rest_framework import viewsets, permissions
from .models import ChiPhi, ThuNhap, Loai
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
        return ChiPhi.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class LoaiViewSet(viewsets.ModelViewSet):
    queryset = Loai.objects.all()
    serializer_class = LoaiSerializer
    permission_classes = [permissions.IsAuthenticated]