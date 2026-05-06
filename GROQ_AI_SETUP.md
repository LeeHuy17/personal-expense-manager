# 🚀 Groq AI Setup Guide

## 📋 Tổng quan

Hướng dẫn chi tiết để tích hợp Groq AI vào ứng dụng quản lý chi tiêu cá nhân. Groq cung cấp AI miễn phí không giới hạn quota.

## ⚙️ Cấu hình

### 1. Lấy API Key

1. Truy cập: **https://console.groq.com/keys**
2. Đăng ký tài khoản (miễn phí)
3. Tạo API key mới
4. Copy key (giữ bí mật)

### 2. Cấu hình file .env.local

Tạo file `backend/.env.local` với nội dung:

```ini
# Groq AI Configuration
GROQ_API_KEY=gsk_your_actual_api_key_here
GROQ_MODEL=llama-3.1-70b-versatile

# Fallback models (tự động dùng nếu model chính lỗi)
GROQ_MODEL_FALLBACKS=llama-3.1-8b-instant,mixtral-8x7b-32768

# AI Provider (chọn 'groq' hoặc 'gemini')
AI_PROVIDER=groq
```

### 3. Cài đặt dependencies

```bash
pip install groq==1.2.0
```

## 🤖 Mô hình Groq

| Model | Tốc độ | Chất lượng | Khuyến dùng |
|-------|--------|------------|-------------|
| `llama-3.1-70b-versatile` | ⚡⚡ | ⭐⭐⭐⭐⭐ | ✅ Mặc định |
| `llama-3.1-8b-instant` | ⚡⚡⚡ | ⭐⭐⭐⭐ | ✅ Fallback |
| `mixtral-8x7b-32768` | ⚡⚡ | ⭐⭐⭐⭐ | ✅ Fallback |

## 🔧 Cấu hình nâng cao

### Settings trong Django

```python
# backend/backend/settings.py

# Groq Configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.1-70b-versatile')
GROQ_MODEL_FALLBACKS = os.getenv('GROQ_MODEL_FALLBACKS', 'llama-3.1-8b-instant,mixtral-8x7b-32768').split(',')

# AI Provider
AI_PROVIDER = os.getenv('AI_PROVIDER', 'groq').lower()
```

### Fallback tự động

Hệ thống sẽ tự động thử các model theo thứ tự:
1. Model chính (`GROQ_MODEL`)
2. Model fallback (`GROQ_MODEL_FALLBACKS`)
3. Nếu tất cả fail → trả về lỗi

## 🧪 Test API

Chạy script test để kiểm tra:

```bash
python test_groq_models.py
```

Kết quả mong đợi:
```
🔑 API Key found: gsk_12345...
🧪 Testing llama-3.1-70b-versatile...
✅ llama-3.1-70b-versatile - WORKING
   Response: Hello! I'm here to help...
```

## 💰 So sánh với Gemini

| Tính năng | Groq | Gemini |
|----------|------|--------|
| **Quota** | ✅ Miễn phí | ❌ 429 errors |
| **Tốc độ** | ⚡⚡⚡ | ⚡⚡ |
| **Miễn phí** | ✅ Không giới hạn | ❌ Có giới hạn |
| **Setup** | ✅ Dễ dàng | ⚠️ Phức tạp |
| **Models** | ✅ Nhiều lựa chọn | ⚠️ Ít lựa chọn |

## 🔄 Chuyển đổi providers

### Dùng Groq (khuyên dùng):
```ini
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
```

### Dùng Gemini (nếu cần):
```ini
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## 🚨 Xử lý lỗi

### Lỗi thường gặp:

1. **"GROQ_API_KEY not found"**
   - Kiểm tra file `backend/.env.local` tồn tại
   - Đảm bảo `GROQ_API_KEY=` có giá trị

2. **"No model available"**
   - Kiểm tra API key hợp lệ
   - Thử model khác trong `GROQ_MODEL_FALLBACKS`

3. **"Rate limit exceeded"**
   - Groq ít khi có rate limit
   - Nếu có, đợi vài phút và thử lại

4. **"Network error"**
   - Kiểm tra kết nối internet
   - Groq có thể bị block ở một số khu vực

## 📊 Monitoring

### Logs trong Django:
```
[INFO] Groq API: Using model llama-3.1-70b-versatile
[INFO] Groq API: Response received successfully
[ERROR] Groq API: Model llama-3.1-70b-versatile failed, trying fallback...
```

### Debug mode:
Thêm vào settings để xem chi tiết:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'ai.services': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## 🔐 Bảo mật

- ✅ Không commit API key vào Git
- ✅ Sử dụng `.env.local` (đã có trong `.gitignore`)
- ✅ API key chỉ dùng server-side
- ✅ Không expose API key trong frontend

## 📈 Performance

- **Response time**: ~1-3 giây
- **Token limit**: 500 tokens/response
- **Temperature**: 0.7 (tự nhiên)
- **Max tokens**: 500 (đủ cho câu trả lời)

## 🎯 Tính năng AI

### Trò chuyện tự do:
- Hỏi đáp tự nhiên
- Nhớ context người dùng
- Trả lời bằng tiếng Việt

### Tư vấn tài chính:
- Tự động phát hiện câu hỏi tài chính
- Hiển thị tóm tắt chi tiêu
- Đưa ra lời khuyên phù hợp

## 📞 Support

Nếu gặp vấn đề:
1. Chạy `python test_groq_models.py`
2. Kiểm tra logs Django
3. Verify API key tại https://console.groq.com/keys

---

**🎉 Chúc mừng! Bạn đã setup Groq AI thành công!**