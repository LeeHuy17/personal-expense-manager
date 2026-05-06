# 🔧 Khắc phục lỗi Gemini API

## ❌ Lỗi: "404 models/gemini-1.5-flash is not found"

### 🔍 Nguyên nhân
Model `gemini-1.5-flash` không tồn tại trong v1beta API của Google Generative AI hoặc chưa được hỗ trợ ở vùng của bạn.

### ✅ Giải pháp

**Cách 1: Thay đổi model (Khuyên dùng)**
```ini
# File: backend/.env.local
GEMINI_MODEL=gemini-pro
```

**Cách 2: Chờ hệ thống fallback tự động**
Mã code đã được cập nhật với fallback logic:
```
gemini-pro (thử đầu tiên)
    ↓ nếu thất bại
gemini-1.5-flash
    ↓ nếu thất bại
gemini-1.5-pro
```

---

## 📊 Bảng so sánh các model

| Model | Tốc độ | Chất lượng | Giá | Hỗ trợ |
|-------|--------|-----------|-----|--------|
| `gemini-pro` | ⚡⚡⚡ | ⭐⭐⭐⭐ | Miễn phí | ✅ Chắc chắn |
| `gemini-1.5-flash` | ⚡⚡ | ⭐⭐⭐⭐⭐ | Miễn phí | ❓ Phụ thuộc vùng |
| `gemini-1.5-pro` | ⚡ | ⭐⭐⭐⭐⭐⭐ | Miễn phí | ❓ Phụ thuộc vùng |

---

## 🔑 Các lỗi phổ biến

### 1. "API key invalid or incorrect"
**Nguyên nhân:** API key sai hoặc hết hạn  
**Giải pháp:**
```bash
# Lấy API key mới từ: https://makersuite.google.com/app/apikey
# Cập nhật file .env.local
```

### 2. "Quota exceeded"
**Nguyên nhân:** Vượt quá giới hạn free tier (60 requests/phút)  
**Giải pháp:**
```
- Chờ 1 phút
- Hoặc nâng cấp sang plan trả phí
```

### 3. "Model not found" (404)
**Nguyên nhân:** Model name không chính xác hoặc đã deprecated  
**Giải pháp:**
```ini
# Thử các model mới nhất (2024):
GEMINI_MODEL=gemini-2.5-flash           # ✅ Khuyên dùng - nhanh nhất
GEMINI_MODEL=gemini-2.0-flash           # ✅ Ổn định
GEMINI_MODEL=gemini-flash-latest        # ✅ Alias tự động cập nhật
GEMINI_MODEL=gemini-pro-latest          # ✅ Alias tự động cập nhật
```

**Model cũ không còn khả dụng:**
- ❌ `gemini-pro`
- ❌ `gemini-1.5-flash`
- ❌ `gemini-1.5-pro`

### 4. "Unauthorized" (401)
**Nguyên nhân:** Chưa cấu hình API key  
**Giải pháp:**
```ini
# backend/.env.local
GEMINI_API_KEY=your_api_key_here
```

---

## 🧪 Kiểm tra cấu hình

### Test API key:
```bash
cd backend
python -c "
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
import django
django.setup()
from django.conf import settings
print(f'✓ API Key configured: {bool(settings.GEMINI_API_KEY)}')
print(f'✓ Primary model: {settings.GEMINI_MODEL}')
print(f'✓ Fallback models: {settings.GEMINI_MODEL_FALLBACKS}')
"
```

### Test model availability:
```bash
python -c "
import google.generativeai as genai
API_KEY = 'your_api_key_here'
genai.configure(api_key=API_KEY)

models_to_test = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
for model_name in models_to_test:
    try:
        model = genai.GenerativeModel(model_name)
        print(f'✓ {model_name} is available')
    except Exception as e:
        print(f'✗ {model_name} error: {str(e)[:50]}')
"
```

---

## 🌍 Hỗ trợ theo vùng

| Vùng | gemini-pro | gemini-1.5-flash | gemini-1.5-pro |
|------|-----------|------------------|----------------|
| 🌐 Toàn cầu | ✅ | ⚠️ Limited | ⚠️ Limited |
| 🇻🇳 Việt Nam | ✅ | ⚠️ Check | ⚠️ Check |
| 🇺🇸 Mỹ | ✅ | ✅ | ✅ |

---

## 💡 Cách tốt nhất

1. **Bắt đầu với:** `gemini-pro`
2. **Nếu cần tốt hơn:** Thử `gemini-1.5-flash`
3. **Nếu vẫn lỗi:** Kiểm tra [Status Page Google AI](https://status.cloud.google.com/)

---

## 📝 File cấu hình

### Ví dụ `.env.local` đầy đủ
```ini
# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7
GEMINI_MODEL=gemini-pro

# (Optional) Email settings
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_password
DEFAULT_FROM_EMAIL=your_email@gmail.com
```

---

## 🚀 Restart server sau khi cấu hình
```bash
# Dừng server (Ctrl+C)
# Cập nhật .env.local
# Chạy lại
python manage.py runserver
```

---

## 📞 Liên hệ hỗ trợ

Nếu vẫn có vấn đề:
1. Kiểm tra lại API key từ: https://makersuite.google.com/app/apikey
2. Xem log lỗi: Terminal sẽ hiển thị chi tiết
3. Thử model khác trong list fallback
4. Kiểm tra kết nối internet

---

**Cập nhật lần cuối:** 2024  
**Status:** Active ✓  
**Support:** Gemini API v1beta
