# Hướng Dẫn Sử Dụng Tính Năng Reset Password

## 📋 Tổng Quan
Hệ thống reset password hiện nay bao gồm:
1. **Trang Quên Mật Khẩu (Forgot Password)** - User nhập email để nhận link reset
2. **Trang Đặt Lại Mật Khẩu (Reset Password)** - User nhập mật khẩu mới sau khi nhấn link trong email

---

## 🏗️ Cấu Trúc Backend

### 1. ResetPasswordView (backend/accounts/views.py)
```python
class ResetPasswordView(APIView):
    """
    API để đặt lại mật khẩu mới
    Endpoint: POST /api/accounts/reset-password/
    
    Tham số cần gửi:
    {
        "uid": "encoded_user_id",
        "token": "reset_token",
        "new_password": "password123",
        "confirm_password": "password123"
    }
    
    Các kiểm tra:
    - uid, token, new_password, confirm_password không được rỗng
    - Mật khẩu mới và xác nhận phải trùng khớp
    - Mật khẩu tối thiểu 6 ký tự
    - Token phải hợp lệ (không hết hạn)
    """
```

### 2. URL Routes (backend/accounts/urls.py)
- POST `/api/accounts/reset-password/` → ResetPasswordView

---

## 🎨 Cấu Trúc Frontend

### 1. Giao Diện HTML (index.html)
- **Reset Form Container** (`#reset-form-container`)
  - Mật khẩu mới input (`#reset-password`)
  - Xác nhận mật khẩu input (`#reset-password-confirm`)
  - Nút gửi reset (`#do-reset-btn`)
  - Thông tin trạng thái (`#reset-status-info`)

### 2. Logic Frontend (src/auth/reset-password.ts)
```
Các hàm chính:
├─ getResetParamsFromURL()
│   └─ Lấy uid và token từ URL (/reset-password/{uid}/{token}/)
├─ showResetPasswordForm()
│   └─ Hiển thị form reset, ẩn form khác
├─ handleResetPassword(e)
│   └─ Xử lý sự kiện nhấn nút reset
├─ initResetPasswordPage()
│   └─ Khởi tạo trang reset nếu URL khớp
└─ setupResetPasswordListeners()
    └─ Thêm event listeners
```

---

## ✅ Quy Trình Sử Dụng

### Bước 1: User Quên Mật Khẩu
```
1. User nhấn "Quên mật khẩu?" trên trang đăng nhập
2. Nhập email của họ
3. Nhận email chứa link: http://localhost:5173/reset-password/{uid}/{token}/
```

### Bước 2: User Nhấn Link Reset
```
1. Hệ thống phát hiện URL chứa reset-password
2. Tự động ẩn Landing View
3. Hiển thị Modal Auth với biểu mẫu Reset Password
4. Xóa Tabs (vì không có tab cho form này)
```

### Bước 3: User Nhập Mật Khẩu Mới
```
1. Nhập "Mật khẩu mới"
2. Nhập "Xác nhận mật khẩu"
3. Nhấn nút "Đặt lại mật khẩu"
4. Gửi lên API: /api/accounts/reset-password/
5. API xác thực token, lưu mật khẩu mới
6. Chuyển hướng về trang login
```

---

## 🧪 Các Bước Test

### Bước 1: Chuẩn Bị Backend
```bash
cd backend

# Chạy server Django
python manage.py runserver
# Output: http://127.0.0.1:8000/
```

### Bước 2: Chuẩn Bị Frontend
```bash
cd .
npm install
npm run dev
# Output: http://localhost:5173/
```

### Bước 3: Tạo User Test
```bash
python manage.py createsuperuser
# Hoặc sử dụng endpoint POST /api/accounts/register/
```

### Bước 4: Test Forgot Password
```bash
# Gửi POST request tới:
# Endpoint: http://127.0.0.1:8000/api/accounts/forgot-password/
# Body:
{
    "email": "test@example.com"
}

# Kết quả: Email sẽ chứa link reset
# Link format: http://localhost:5173/reset-password/{uid}/{token}/

# Lưu ý: Mặc định Django không gửi email thực, hãy kiểm tra Django admin hoặc console
```

### Bước 5: Test Reset Password
```bash
# Copy link từ email test, hoặc tạo link thủ công:
# Tạo uid (base64 encode của user id): 
# python -c "from django.utils.http import urlsafe_base64_encode; from django.utils.encoding import force_bytes; print(urlsafe_base64_encode(force_bytes(1)))"

# Tạo token từ Django shell:
# python manage.py shell
# >>> from django.contrib.auth.models import User
# >>> from django.contrib.auth.tokens import default_token_generator
# >>> user = User.objects.get(id=1)
# >>> token = default_token_generator.make_token(user)
# >>> print(f"http://localhost:5173/reset-password/{uid}/{token}/")

# Mở link trong browser → Thấy form reset password

# Gửi form:
# - Mật khẩu mới: "newpassword123"
# - Xác nhận: "newpassword123"
# - Nhấn nút

# Kết quả: 
# ✅ Lời nhắn thành công
# → Chuyển hướng về trang login
# → Test đăng nhập với mật khẩu mới
```

---

## 🐛 Troubleshooting

### Vấn Đề 1: Form Reset không hiển thị
**Nguyên nhân:** URL không khớp định dạng
**Giải pháp:** 
```
- Kiểm tra URL có đúng định dạng: /reset-password/{uid}/{token}/
- Xem Browser Console có lỗi gì không
- Kiểm tra console.log đã chạy không
```

### Vấn Đề 2: Token không hợp lệ
**Nguyên nhân:** Token đã hết hạn (mặc định 24h)
**Giải pháp:**
```
- Yêu cầu link reset mới
- Hoặc cấu hình thời gian token lâu hơn trong settings.py:
  PASSWORD_RESET_TIMEOUT = 86400 * 3  # 3 ngày
```

### Vấn Đề 3: Email không gửi được
**Nguyên nhân:** chưa cấu hình email backend
**Giải pháp:** Backend chưa cấu hình gửi email thực, xem file test hoặc tích hợp Resend/SendGrid

---

## 📝 File Đã Tạo/Sửa

| File | Loại | Mô Tả |
|------|------|-------|
| `src/auth/reset-password.ts` | Tạo | Logic xử lý reset password frontend |
| `backend/accounts/views.py` | Sửa | Thêm ResetPasswordView API |
| `backend/accounts/urls.py` | Sửa | Thêm route reset-password |
| `index.html` | Sửa | Thêm form UI reset password |
| `src/main.ts` | Sửa | Import/Khởi tạo reset password logic |
| `src/auth/ui-logic.ts` | Sửa | Thêm hàm UI cho Reset tab |

---

## 🔐 Bảo Mật

✅ **Những điểm bảo mật đã implement:**
- ✔️ Token được mã hóa Django (default_token_generator)
- ✔️ User ID được base64 encode
- ✔️ Token có thời gian hết hạn
- ✔️ Validation mật khẩu tối thiểu 6 ký tự
- ✔️ Kiểm tra mật khẩu mới và xác nhận trùng khớp

⚠️ **Cần bổ sung:**
- Email backend cần cấu hình thực (Resend, SendGrid, Gmail SMTP)
- HTTPS trong production
- CSRF token trên frontend
- Rate limiting cho endpoint forgot-password
- Logging đầy đủ

---

## 📞 Hỗ Trợ Thêm

Nếu cần sửa đổi:
1. Thêm xác nhận OTP qua email
2. Câu hỏi bảo mật thay cho email
3. 2FA (Two-Factor Authentication)
4. Social login recovery
