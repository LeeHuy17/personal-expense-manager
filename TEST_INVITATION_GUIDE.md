# Hướng dẫn Test Chức Năng Mời Tham Gia Quỹ (Invitation)

## Vấn đề Được Phát Hiện
- **Root Cause**: `shared_fund` URL không được mounted trong `backend/config/urls.py`
- **Fix**: Đã thêm `path('api/shared-fund/', include('shared_fund.urls'))` vào file config

## Các Bước Test

### 1. Prepare Database (Nếu chưa migrate)
```bash
cd backend
python manage.py migrate shared_fund
```

### 2. Kiểm Tra API Endpoints Hoạt Động

#### 2a. Tạo Quỹ (Login với User 1)
```
URL: POST http://127.0.0.1:8000/api/shared-fund/funds/
Headers: {
  "Authorization": "Token YOUR_TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "name": "Test Fund",
  "description": "Test fund for invitations"
}
Response: Fund object với ID
```

#### 2b. Mời User 2 Vào Quỹ
```
URL: POST http://127.0.0.1:8000/api/shared-fund/funds/{fund_id}/invite/
Headers: {
  "Authorization": "Token USER1_TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "user": 2,
  "role": "member"
}
Expected: {
  "detail": "Đã gửi lời mời tham gia quỹ."
}
```

#### 2c. Fetch Pending Invitations (Login với User 2)
```
URL: GET http://127.0.0.1:8000/api/shared-fund/invitations/
Headers: {
  "Authorization": "Token USER2_TOKEN",
  "Content-Type": "application/json"
}
Response: [
  {
    "id": 1,
    "fund": 1,
    "fund_name": "Test Fund",
    "inviter": 1,
    "inviter_name": "user1",
    "invitee": 2,
    "role": "member",
    "status": "pending",
    "created_at": "2026-04-23T00:11:00Z",
    "responded_at": null
  }
]
```

### 3. Test Từ Frontend

#### 3a. Login với User 1
1. Truy cập http://localhost:3000
2. Login với email: `user1@example.com`, password: `user1`

#### 3b. Tạo Quỹ Mới
1. Click "Mở rộng chức năng"
2. Scroll down tới "Tạo Quỹ Chung Mới"
3. Nhập: Name = "Test Fund", Description = "Test"
4. Click "Tạo Quỹ"

#### 3c. Mời Thành Viên
1. Select quỹ vừa tạo từ dropdown
2. Scroll down tới "Mời Thành Viên Vào Quỹ"
3. Nhập User ID: `2` (hoặc ID của user 2)
4. Select Role: "Member"
5. Click "Mời Thành Viên"

#### 3d. Logout & Login với User 2
1. Click icon user (top right)
2. Click "Đăng xuất"
3. Login với email: `user2@example.com`, password: `user2`

#### 3e. Kiểm Tra Notification
1. **Notification badge** phải hiển thị ở top banner (bell icon)
2. Click vào bell icon
3. Modal popup phải hiển thị:
   - "Lời mời tham gia quỹ: Test Fund"
   - Tên người mời: "user1"
   - Nút "Chấp nhận" (xanh)
   - Nút "Từ chối" (đỏ)

#### 3f. Chấp Nhận Lời Mời
1. Click nút "Chấp nhận"
2. Thông báo: "Đã chấp nhận lời mời tham gia quỹ."
3. Notification badge sẽ disappear
4. Quỹ sẽ hiển thị trong danh sách quỹ của user 2

## Debugging Tips

### Kiểm Tra Backend Logs
- Xem Django server output để tìm errors
- Nếu endpoint 404, kiểm tra URL path đúng không

### Kiểm Tra Browser Console
- Mở browser DevTools (F12)
- Tab "Console" để xem JavaScript errors
- Tab "Network" để xem API requests/responses

### Kiểm Tra localStorage
- Mở DevTools > "Application" tab
- Xem "localStorage" để kiểm tra token

### Check Database
```bash
python manage.py shell
from shared_fund.models import FundInvitation
FundInvitation.objects.all()  # Xem toàn bộ invitations
FundInvitation.objects.filter(invitee_id=2)  # Xem invitations của user 2
```

## Expected Output
Khi test thành công:
- ✅ User 1 có thể tạo quỹ
- ✅ User 1 có thể mời user 2
- ✅ FundInvitation được tạo trong database
- ✅ User 2 thấy notification badge
- ✅ User 2 có thể chấp nhận/từ chối
- ✅ Khi chấp nhận, FundMember được tạo
- ✅ Quỹ hiển thị trong danh sách của user 2
