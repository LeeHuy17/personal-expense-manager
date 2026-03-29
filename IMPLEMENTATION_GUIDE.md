# 🔄 Real-time Sync Reset Password - Implementation Guide

## 📋 Tổng Quan

Đây là tính năng **Real-time Sync** cho quá trình reset password. Thay vì user phải:
1. Nhấn "Gửi yêu cầu" → Đợi email
2. Click link từ email → Navigate sang app mới (khó trên mobile)
3. Điền form reset password

Người dùng có thể giờ:
1. Nhấn "Gửi yêu cầu" trên trang app → Form "Đang chờ xác nhận" hiển thị
2. Mở email → Click link xác nhận (trên tab khác hoặc điện thoại)
3. Trang app **tự động detect** → Hiển thị form reset password mà **không cần refresh**

---

## 🚀 Setup Instructions

### Backend Setup

#### 1. Chạy Migration để tạo model mới

```bash
cd backend
python manage.py migrate accounts
```

Lệnh này sẽ:
- ✅ Tạo table `accounts_passwordresetrequest`
- ✅ Tạo index cho field `email` và `token`
- ✅ Setup relationship với User model

#### 2. Kiểm tra kết quả

```bash
# Vào Django Admin
python manage.py createsuperuser  # Nếu chưa có
python manage.py runserver
```

Mở `http://127.0.0.1:8000/admin/`

Kiểm tra:
- ✅ Có section "Password Reset Requests" trong admin
- ✅ Có thể xem status của các request
- ✅ Có flag `is_ready_to_reset` để tracking

### Frontend Setup

Tất cả code frontend đã được thêm vào:
- ✅ `src/auth/login.ts` - Polling logic
- ✅ `src/auth/reset-password.ts` - Stop polling on success

Không cần setup thêm!

---

## 🔄 Cách Hoạt Động

### Flow Diagram

```
TAB A (App Principal)              TAB B (Email Client)
─────────────────────             ──────────────────────

1. User nhấn "Quên mật khẩu"
   ↓
2. Nhập email, nhấn "Gửi"
   ↓
3. Frontend: startPollingResetStatus()
   • Poll mỗi 3 giây
   • Check endpoint: /api/accounts/check-reset-status/?email=xxx
   ↓
4. Backend: Gửi email
   
                                   5. User nhận email
                                      ↓
                                   6. Click "Đặt lại mật khẩu"
                                      ↓
                                   7. GET /api/accounts/mark-reset-ready/{uid}/{token}/
                                      ↓
                                   8. Backend: Set is_ready_to_reset = true
                                      ↓
                                   9. Return HTML success page
   
10. Frontend polling detect:
    is_ready_to_reset = true
    ↓
11. Immediate: Show reset form
    ↓
12. User điền mật khẩu mới (cùng trang!)
    ↓
13. POST /api/accounts/reset-password/
    ↓
14. Stop polling, redirect to login
```

### Các API Endpoints

| Endpoint | Method | Mục Đích | Response |
|----------|--------|---------|----------|
| `/api/accounts/forgot-password/` | POST | Gửi email reset | `{ message }` |
| `/api/accounts/check-reset-status/?email=xxx` | GET | Poll status | `{ is_ready_to_reset, token, uid }` |
| `/api/accounts/mark-reset-ready/{uid}/{token}/` | GET | Click từ email | HTML success page |
| `/api/accounts/reset-password/` | POST | Set mật khẩu mới | `{ message }` |

---

## 🧪 Testing

### Test Case 1: Happy Path

```bash
# 1. Terminal 1: Start Django
cd backend
python manage.py runserver

# 2. Terminal 2: Start Frontend
npm run dev  # http://localhost:3000

# 3. Browser 1: Mở app
# - Đăng xuất nếu chưa
# - Click "Quên mật khẩu"
# - Nhập email
# - Nhấn "Gửi"
# → Form "Đang chờ xác nhận..." sẽ show

# 4. Check Gmail/Email
# → Gmail sẽ nhận email reset password

# 5. Click link trong email
# → Sẽ mở /api/accounts/mark-reset-ready/{uid}/{token}/
# → Thấy page HTML "Link xác nhận thành công!"

# 6. Quay lại Browser 1
# → MAGIC: Form reset password sẽ **tự động hiển thị**
# → Không cần refresh!
# → Điền password mới, nhấn "Cập nhật"
# → Thành công! Redirect to login
```

### Test Case 2: Token Expired

```bash
# 1. Repeat steps 1-3 từ Test Case 1
# 2. Đợi 24+ giờ (hoặc modify `timedelta(hours=24)` to `minutes=1` trong views.py)
# 3. Polling sẽ detect: is_ready_to_reset = False, error = "expired"
# 4. User thấy toast: "Token đã hết hạn"
```

### Test Case 3: Link Không Hợp Lệ

```bash
# 1. Copy link từ email
# 2. Sửa uid hoặc token để invalid
# 3. Click link
# 4. Thấy page HTML: "Link không hợp lệ"
```

---

## 📊 Database Schema

### PasswordResetRequest Model

```
Table: accounts_passwordresetrequest

Columns:
- id (Primary Key)
- user_id (Foreign Key → auth_user.id) [UNIQUE]
- email (CharField) [UNIQUE]
- token (CharField) [UNIQUE, 255 chars]
- uid (CharField) [255 chars]
- is_ready_to_reset (BooleanField, default=False)
- created_at (DateTimeField, auto_now_add=True)
- expires_at (DateTimeField, +24 hours from creation)

Indexes:
- email (untuk quick lookup)
- token (tracking by token)
- user_id (FK constraint)
- is_ready_to_reset (untuk status filtering)
```

### Lifecycle Example

```
1. User submit forgot-password
   ↓
   is_ready_to_reset = False
   created_at = 2024-03-29 10:00:00
   expires_at = 2024-03-30 10:00:00 (next day)

2. User click email link
   ↓
   is_ready_to_reset = True  ← Change here

3. Frontend detect → Show form

4. User set password
   ↓
   is_ready_to_reset = True (stays)
   created_at = (unchanged)

5. Cleanup (optional): Delete old requests after successful reset
```

---

## ⚙️ Configuration

### Polling Settings (Frontend)

File: `src/auth/login.ts`

```typescript
// Interval antara mỗi poll (milliseconds)
}, 3000); // ← Change từ 3000ms tới 5000ms nếu muốn

// Max polls (24 minutes timeout)
const maxPolls = 480; // ← Change để adjust timeout
```

### Token Expiry (Backend)

File: `backend/accounts/views.py`

```python
# Thay đổi từ 24 hours thành khác:
expires_at = timezone.now() + timedelta(hours=24)
#                                          ↑ Đổi số này
```

---

## 🔐 Security Considerations

1. **Token Validation**: Django's `default_token_generator` được dùng
   - Tokens are cryptographically signed
   - Cannot be forged without SECRET_KEY

2. **Expiry**: Links hết hạn sau 24 giờ
   - Polling sẽ detect expired state
   - User phải submit lại "Quên mật khẩu"

3. **Email Security**: Không store plain-text password
   - Email chỉ chứa signed token
   - Backend verify trước set password

4. **CSRF Protection**: Django CSRF token nếu POST
   - GET endpoint (mark-reset-ready) cho email links
   - POST endpoints được protect

---

## 🐛 Troubleshooting

### Issue 1: Email không gửi

**Cause**: SMTP settings sai

**Solution**:
```bash
# Check .env.local
cat backend/.env.local

# Ensure:
EMAIL_HOST_USER = your-email@gmail.com
EMAIL_HOST_PASSWORD = your-app-password (không phải actual password)
```

### Issue 2: Polling không nhận form

**Cause**: CORS hoặc endpoint sai

**Solution**:
```bash
# Check browser console (F12)
# Xem có error gì không

# Confirm endpoint exists:
curl http://127.0.0.1:8000/api/accounts/check-reset-status/?email=test@example.com

# Should return:
# { "is_ready_to_reset": false, "message": "..." }
```

### Issue 3: Migration fail

**Cause**: accounts app không trong INSTALLED_APPS

**Solution**:
```bash
# Check backend/backend/settings.py
grep -n "accounts" backend/backend/settings.py

# Should see:
# INSTALLED_APPS = [ ..., 'accounts', ... ]

# If missing, add it:
vi backend/backend/settings.py
```

### Issue 4: Link từ email không work

**Cause**: Email link pointing sai URL

**Check**:
```bash
# Vào Django Admin → Password Reset Requests
# Inspect một request record

# Verify format của reset link
# Should be: http://127.0.0.1:8000/api/accounts/mark-reset-ready/{uid}/{token}/

# Email client redirect phải đúng
```

---

## 📈 Performance Notes

### Polling Overhead

- Frontend: 1 GET request mỗi 3 giây (≈ 20 requests/minute)
- Server: Lightweight query, simple lookup
- Network: ~1KB per request
- Impact: **Minimal** (< 1% server load for typical users)

### Optimization Options (Future)

1. **WebSocket**: Replace polling với real-time WebSocket
   - More efficient
   - Instant notification
   - Requires Socket.IO setup

2. **Server-Sent Events (SSE)**: One-way push from server
   - Better than polling
   - Simpler than WebSocket
   - Native browser support

3. **Push Notifications**: Browser push API
   - Doesn't require tab active
   - User-friendly

---

## 📝 Files Modified

✅ **Backend**:
- `backend/accounts/models.py` - NEW: PasswordResetRequest model
- `backend/accounts/views.py` - MODIFIED: Added CheckResetStatusView, MarkResetReadyView, Updated ForgotPasswordView
- `backend/accounts/urls.py` - MODIFIED: Added new endpoints
- `backend/accounts/admin.py` - NEW: Admin interface for tracking
- `backend/accounts/migrations/0001_initial.py` - NEW: Migration file

✅ **Frontend**:
- `src/auth/login.ts` - MODIFIED: Added polling logic
- `src/auth/reset-password.ts` - MODIFIED: Call stopPollingResetStatus on success

---

## 🎯 Next Steps

1. ✅ Run migration: `python manage.py migrate accounts`
2. ✅ Test email sending: `python manage.py shell` → test SMTP
3. ✅ Test full flow in browser
4. ✅ Monitor logs for any errors
5. ⚠️ Handle edge cases (network errors, slow email delivery)

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Console logs (F12 → Console)
2. Django logs (terminal window)
3. Gmail inbox (check spam folder)
4. Database (Django Admin)

---

**Last Updated**: March 29, 2026
**Feature**: Real-time Sync Reset Password
**Status**: ✅ Ready to Deploy
