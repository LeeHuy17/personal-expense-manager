# 🚀 Quick Start - AI Chat Integration (Groq)

## ⚡ Chạy ngay (3 bước)

### 1️⃣ Lấy API Key miễn phí từ Groq
Truy cập: **https://console.groq.com/keys**
- Đăng ký tài khoản (miễn phí)
- Tạo API key mới
- Copy key (giữ bí mật)

### 2️⃣ Cấu hình
Tạo file `backend/.env.local`:
```ini
# Groq AI (Khuyên dùng - miễn phí hơn Gemini)
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-70b-versatile

# Gemini AI (Nếu muốn dùng thay thế)
# GEMINI_API_KEY=your_gemini_key_here
# GEMINI_MODEL=gemini-2.5-flash

# AI Provider (chọn 'groq' hoặc 'gemini')
AI_PROVIDER=groq
```

**Mô hình Groq:**
- `llama-3.1-70b-versatile` ✅ (Khuyên dùng - mạnh nhất)
- `llama-3.1-8b-instant` ✅ (Nhanh hơn, vẫn tốt)
- `mixtral-8x7b-32768` ✅ (Mixtral model)

### 3️⃣ Chạy
```bash
cd backend
python manage.py runserver
```

---

## ✨ Đó là tất cả!

Giờ chat AI của bạn sẽ:
- 💬 Trò chuyện tự do với Groq AI
- 💰 Tư vấn tài chính thông minh
- 🚀 Không lo quota như Gemini
- 💸 **Hoàn toàn miễn phí** với Groq

---

## 💰 Tại sao Groq tốt hơn Gemini?

| Tính năng | Groq | Gemini |
|----------|------|--------|
| **Quota** | ✅ Miễn phí | ❌ 429 errors |
| **Tốc độ** | ⚡⚡⚡ | ⚡⚡ |
| **Miễn phí** | ✅ Không giới hạn | ❌ Có giới hạn |
| **Setup** | ✅ Dễ dàng | ⚠️ Phức tạp |

---

## 🔄 Chuyển đổi giữa providers

Muốn dùng Gemini thay vì Groq?
```ini
# backend/.env.local
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
```

Muốn quay lại Groq?
```ini
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
```

---

## 📝 Ví dụ

### Chat thường:
```
User: "Xin chào"
AI: "Xin chào! Tôi là trợ lý AI của bạn..."
```

### Tư vấn tài chính:
```
User: "Tôi chi quá nhiều"
AI: 📊 Hiển thị tóm tắt chi tiêu + lời khuyên
```

---

## 🔗 Tài liệu đầy đủ

Xem: `GROQ_AI_SETUP.md` để biết thêm chi tiết

---

**Lưu ý:**
- 🔐 Không share API Key công khai
- 📊 Groq: Hoàn toàn miễn phí
- ✅ Không cần credit card

Vui lòng hoàn thành 3 bước trên để bắt đầu! 🎉

---

## 🔗 Tài liệu đầy đủ

Xem: `GEMINI_AI_SETUP.md` để biết thêm chi tiết

---

**Lưu ý:** 
- 🔐 Không share API Key
- 📊 Free tier: 60 requests/phút
- ✅ Không cần credit card

Vui lòng hoàn thành 3 bước trên để bắt đầu! 🎉
