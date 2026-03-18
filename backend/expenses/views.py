from rest_framework import viewsets
from .models import ChiPhi, ThuNhap, Loai
from .serializers import ChiPhiSerializer, ThuNhapSerializer, LoaiSerializer

class ChiPhiViewSet(viewsets.ModelViewSet):
    queryset = ChiPhi.objects.all()
    serializer_class = ChiPhiSerializer

class ThuNhapViewSet(viewsets.ModelViewSet):
    queryset = ThuNhap.objects.all()
    serializer_class = ThuNhapSerializer

class LoaiViewSet(viewsets.ModelViewSet):
    queryset = Loai.objects.all()
    serializer_class = LoaiSerializer