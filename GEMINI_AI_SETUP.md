# 🤖 Hướng dẫn cấu hình Gemini AI Chat

## Tóm tắt thay đổi

Chức năng AI Chat đã được cập nhật để hỗ trợ:
- ✅ **Trò chuyện tự do** như Gemini - không bắt buộc phải hỏi về tài chính
- ✅ **Tư vấn tài chính thông minh** - tự động kích hoạt khi hỏi về chi tiêu
- ✅ **Phản hồi tự nhiên** - sử dụng Google Gemini API

## Bước 1: Tạo Gemini API Key (Miễn phí)

### Cách lấy API Key:
1. Truy cập: https://makersuite.google.com/app/apikey
2. Nhấn **"Create API key"**
3. Chọn **"Create new secret key in new project"**
4. Copy API key (giữ bí mật này!)

> **Lưu ý:** Google Gemini API có **tier miễn phí**:
> - 60 requests per minute
> - Hoàn toàn miễn phí cho các ứng dụng cá nhân

## Bước 2: Cấu hình Backend

### Tùy chọn A: Sử dụng `.env.local` (Khuyên dùng)

Tạo file `.env.local` trong thư mục `backend/`:

```ini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### Tùy chọn B: Sử dụng `.env`

Nếu không có `.env.local`, cập nhật file `.env`:

```ini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## Bước 3: Kiểm tra cài đặt

```bash
# Cài đặt dependency
pip install -r requirements.txt

# Chạy server
python manage.py runserver
```

## Cách sử dụng

### Trò chuyện tự do
```
User: "Xin chào, hôm nay thế nào?"
AI: "Xin chào! Tôi là trợ lý AI của bạn, hôm nay tôi đang sẵn sàng giúp đỡ bạn. Có gì tôi có thể giúp bạn không?"
```

### Tư vấn tài chính (tự động)
```
User: "Tôi chi tiêu quá nhiều"
AI: 📊 Hiển thị tóm tắt tài chính + lời khuyên
```

## Cấu hình nâng cao

### Thay đổi mô hình AI:
- `gemini-1.5-flash` (Nhanh, tiết kiệm, khuyên dùng)
- `gemini-1.5-pro` (Mạnh mẽ hơn, nhưng chậm hơn)

Cập nhật trong `.env.local`:
```ini
GEMINI_MODEL=gemini-2.5-flash
```

### Các mô hình có sẵn (2024):
- `gemini-2.5-flash` ✅ (Khuyên dùng - nhanh nhất, tốt nhất)
- `gemini-2.0-flash` ✅ (Ổn định, nhanh)
- `gemini-flash-latest` ✅ (Alias cho model flash mới nhất)
- `gemini-pro-latest` ✅ (Alias cho model pro mới nhất)

**Lưu ý:** Các model cũ như `gemini-pro`, `gemini-1.5-flash` đã không còn khả dụng.

## Khắc phục sự cố

### Lỗi: "GEMINI_API_KEY not configured"
→ Kiểm tra `.env.local` hoặc `.env` có chứa `GEMINI_API_KEY` không

### Lỗi: "API quota exceeded"
→ Chờ 1 phút (rate limit 60 req/min)

### Lỗi: "Invalid API key"
→ Kiểm tra lại API key từ https://makersuite.google.com/app/apikey

## Tính năng mới

| Tính năng | Trước | Sau |
|----------|------|-----|
| Chỉ trả lời về tài chính | ❌ | ✅ Trò chuyện tự do |
| Phản hồi lúc nào cũng là tư vấn | ✅ | ❌ Thông minh hơn |
| Sử dụng AI thực sự | ❌ | ✅ Google Gemini API |
| Hỗ trợ tiếng Việt | ✅ | ✅ Tốt hơn |

## Cấu trúc backend

```
ai/
├── services.py           # Xử lý logic AI
│  ├── _is_finance_question()      # Phát hiện câu hỏi tài chính
│  ├── _get_gemini_response()      # Gọi Gemini API
│  └── _get_financial_advice()     # Tư vấn tài chính
├── views.py              # API endpoint
└── urls.py               # Route /api/ai/chat/
```

## Tối ưu hiệu suất

1. **Caching**: Nên thêm cache cho phản hồi tài chính (5 phút)
2. **Rate limiting**: Giới hạn 10 requests/phút cho một người dùng
3. **Async**: Nên chuyển sang async views nếu có nhiều người dùng

---

📝 **Tác giả cập nhật**: GitHub Copilot  
📅 **Ngày cập nhật**: 2024  
✨ **Trạng thái**: Hoạt động tốt ✓
