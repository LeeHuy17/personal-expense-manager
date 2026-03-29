# 🔧 Fix Lỗi Kết Nối CORS - Hướng Dẫn Chi Tiết

## ❌ Lỗi Gặp Phải
```
GET /api/accounts/forgot-password/
HTTP 405 Method Not Allowed
```

---

## ✅ Những Gì Tôi Đã Fix

### 1. Backend (Django)
- ✅ Thêm `permission_classes = [AllowAny]` cho `ForgotPasswordView`
- ✅ Thêm import `send_mail` từ `django.core.mail`
- ✅ Cấu hình CORS đầy đủ:
  - `CORS_ALLOW_ALL_ORIGINS = True`
  - `CORS_ALLOW_METHODS` = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
  - `CORS_ALLOW_HEADERS` = đầy đủ các headers cần thiết
- ✅ Cấu hình Email Backend (Console cho DEV)
- ✅ REST_FRAMEWORK cho phép AllowAny permission

### 2. Frontend (TypeScript)
- ✅ Thêm import `showForgotTab` từ `ui-logic.ts`
- ✅ Thêm event listener cho nút "Quên mật khẩu?"
- ✅ Đảm bảo tất cả fetch requests dùng method 'POST'

---

## 🧪 Các Bước Test Lại

### Bước 1: Restart Django Server
```bash
cd backend

# Dừng server cũ (Ctrl+C)
# Chạy lại:
python manage.py runserver

# Output:
# Starting development server at http://127.0.0.1:8000/
# Quit the server with CONTROL-C
```

### Bước 2: Check Terminal Backend
Mở tab terminal khác, check Django đã chạy không:
```bash
curl http://127.0.0.1:8000/api/accounts/login/ -X OPTIONS -H "Origin: http://localhost:5173"
```
Output: Không bị 405 error → OK ✅

### Bước 3: Restart Vite Frontend (Nếu Cần)
```bash
# Dừng Vite cũ (Ctrl+C)
# Chạy lại:
npm run dev

# Output:
# VITE v5.0.0  ready in XX ms
# ➜  Local:   http://localhost:5173/
```

### Bước 4: Test Forgot Password Flow
1. Mở browser: `http://localhost:5173/`
2. Click "Đăng nhập" button
3. Click "Quên mật khẩu?" link
4. Nhập email có sẵn trong database
5. Click "Gửi yêu cầu"

**Expected:**
- ✅ Thấy toast "✅ Đã gửi email khôi phục!"
- ✅ Trong terminal Django, thấy email được print:
  ```
  --------
  Content-Type: text/plain; charset="utf-8"
  MIME-Version: 1.0
  Content-Transfer-Encoding: 7bit
  Subject: Khôi phục mật khẩu - Personal Expense Manager
  From: noreply@expense.com
  To: test@example.com
  Date: Wed, 26 Mar 2026 15:30:00 -0000
  Message-ID: <...>
  
  Nhấp vào link sau để đặt lại mật khẩu: 
  http://localhost:5173/reset-password/{uid}/{token}/
  --------
  ```

### Bước 5: Test Link Reset Password
1. Copy link từ console Django
2. Dán vào browser URL
3. Nhập mật khẩu mới (2 lần)
4. Click "Đặt lại mật khẩu"

**Expected:**
- ✅ Toast "✅ Mật khẩu đã được đặt lại thành công!"
- ✅ Chuyển hướng về trang login
- ✅ Đăng nhập được với mật khẩu mới

---

## 🐛 Nếu Vẫn Có Lỗi

### Lỗi 1: Vẫn là 405 Method Not Allowed
**Nguyên nhân:** Django chưa reload code
**Fix:**
```bash
# Dừng Django server (Ctrl+C)
# Chạy lại:
python manage.py runserver 0.0.0.0:8000
```

### Lỗi 2: CORS preflight failed
**Nguyên nhân:** Middleware không đúng thứ tự
**Check:**
```python
# backend/settings.py
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← MUST BE FIRST
    'django.middleware.security.SecurityMiddleware',
    # ... rest
]
```

### Lỗi 3: "Email không tồn tại"
**Nguyên nhân:** Email chưa có trong database
**Fix:** Tạo user test:
```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_user(username='test', email='test@example.com', password='123456')
>>> exit()
```

### Lỗi 4: Email không gửi được / không thấy email
**Lý do:** Dùng Console Email Backend (in ra terminal)
**Check:** Console Django có email không?
- Nếu có → OK, test theo hướng dẫn
- Nếu không → Kiểm tra `send_mail()` có gọi không

### Lỗi 5: "Token không hợp lệ hoặc đã hết hạn"
**Nguyên nhân:** Token hết hạn (24 giờ mặc định)
**Fix:** Lấy link reset mới hoặc mở sơm hơn

---

## 📊 File Đã Thay Đổi

| File | Loại | Chi Tiết |
|------|------|---------|
| `backend/accounts/views.py` | ✏️ Sửa | Thêm `permission_classes` + `send_mail` import |
| `backend/backend/settings.py` | ✏️ Sửa | CORS + Email + REST_FRAMEWORK config |
| `src/main.ts` | ✏️ Sửa | Thêm showForgotTab + event listener |
| `src/auth/reset-password.ts` | ✓ Không đổi | Code đã OK |
| `src/auth/login.ts` | ✓ Không đổi | Code đã OK |
| `index.html` | ✓ Không đổi | HTML đã OK |

---

## ✨ Tóm Tắt Fix

| Vấn đề | Nguyên Nhân | Fix |
|--------|-----------|-----|
| 405 GET Not Allowed | Không có permission_classes | ✔️ Thêm AllowAny |
| CORS Preflight Failed | Middleware không đúng thứ tự | ✔️ Xác nhận CorsMiddleware đầu tiên |
| Email không gửi | send_mail không import | ✔️ Thêm import |
| Nút forgot không hoạt động | Không có event listener | ✔️ Thêm listener trong main.ts |

---

## 🚀 Kết Quả Mong Đợi Sau Fix

✅ Forgot Password flow hoạt động end-to-end:
1. Click "Quên mật khẩu?" → Form hiển thị
2. Nhập email → Gửi request (POST /api/accounts/forgot-password/)
3. Django phản hồi 200 OK + email được gửi
4. Copy link reset → Mở browser
5. Nhập mật khẩu mới → Reset thành công
6. Login với mật khẩu mới → Success! 🎉

---

## 📞 Nếu Vẫn Có Vấn Đề

Hãy check:
1. **Browser Console** (F12): Có lỗi gì không?
2. **Terminal Django**: Có error logs không?
3. **Network Tab**: Request có gửi GET hay POST? Headers OK không?
4. **Settings.py**: CORS_ALLOW_ALL_ORIGINS = True?
