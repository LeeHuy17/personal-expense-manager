# Test Real-time Invitation Notification

## Cài Đặt

### Backend
1. Django server đang chạy ở http://127.0.0.1:8000

### Frontend  
1. Vite dev server đang chạy ở http://localhost:3000
2. Frontend sẽ **auto-poll database mỗi 3 giây** để check invitations mới

## Test Steps

### 1. Mở 2 Browser Tabs

Tab 1 (User 1):
- URL: http://localhost:3000
- Login: email = `user1@example.com`, password = `user1`

Tab 2 (User 2):
- URL: http://localhost:3000  
- Login: email = `user2@example.com`, password = `user2`

### 2. Kiểm Tra DevTools Console

Mở **F12 > Console** trên cả 2 tabs.

User 2 tab sẽ thấy log:
```
✅ Starting invitation polling (every 3 seconds)
```

Mỗi 3 giây sẽ log:
```
ℹ️  Fetching invitations (polling)
```

### 3. Tạo Quỹ (Tab 1 - User 1)

1. Click "Mở rộng chức năng"
2. Scroll down tới "Tạo Quỹ Chung Mới"
3. Nhập:
   - Name: "Real-time Test Fund"
   - Description: "Test"
4. Click "Tạo Quỹ" → Thông báo: "Tạo quỹ thành công."

### 4. Mời User 2 (Tab 1 - User 1)

1. Select quỹ vừa tạo từ dropdown
2. Scroll down tới "Mời Thành Viên Vào Quỹ"
3. Nhập User ID: `2`
4. Select Role: "Member"
5. Click "Mời Thành Viên"
6. Thông báo: "Đã gửi lời mời thành viên."

### 5. Kiểm Tra Real-time Notification (Tab 2 - User 2)

**QUAN TRỌNG: Không reload page!**

Trong vòng **3 giây**, bạn sẽ thấy:

1. **Console Log:**
   ```
   Invitations count: 1
   ```

2. **UI Update:**
   - **Notification Badge** (bell icon) sẽ hiển thị số `1`
   - Badge màu sẽ nổi bật (badge-count style)

3. **Optional:** Click vào bell icon để mở modal xem chi tiết lời mời

### 6. Chấp Nhận Lời Mời (Tab 2 - User 2)

1. Click bell icon để mở modal notifications
2. Xem chi tiết lời mời:
   - Tiêu đề: "Lời mời tham gia quỹ: Real-time Test Fund"
   - Từ: "user1"
3. Click nút "Chấp Nhận"
4. Thông báo: "Đã chấp nhận lời mời tham gia quỹ."
5. Modal tự động đóng, badge biến mất

### 7. Kiểm Tra Membership (Tab 2 - User 2)

1. Scroll up tới danh sách "Quỹ Chung"
2. Quỹ "Real-time Test Fund" sẽ hiển thị trong danh sách
3. User 2 giờ là thành viên của quỹ

## Expected Behavior

✅ **Real-time Updates Without Page Reload**
- Khi User 1 gửi lời mời
- User 2 sẽ thấy notification **tự động update** trong **3 giây**
- Không cần reload page hay F5

✅ **Polling Logs**
- Mở DevTools Console
- Xem polling logs mỗi 3 giây
- Log sẽ stop khi logout

✅ **Multiple Invitations**
- Nếu User 1 gửi 2 lời mời
- Badge sẽ hiển thị "2"
- Modal sẽ list 2 lời mời

## Debugging

### Check Polling is Running
```javascript
// Paste in console:
console.log('Polling interval ID:', invitationPollingInterval);
```

### Manually Trigger Check
```javascript
// Paste in console:
loadInvitations();
```

### Stop Polling
```javascript
// Paste in console:
stopInvitationPolling();
```

### Check API Response
- Mở DevTools > Network tab
- Filter: "invitations"
- Xem requests mỗi 3 giây
- Kiểm tra response body

## Database Verification

```bash
cd backend
python manage.py shell

from shared_fund.models import FundInvitation
FundInvitation.objects.filter(invitee_id=2).values('fund__name', 'status', 'created_at')
# Output: [{'fund__name': 'Real-time Test Fund', 'status': 'pending', 'created_at': '2026-04-23 ...'}]
```

## Troubleshooting

### Badge không hiển thị?
1. Check Browser Console cho errors
2. Verify User 2 đã login thành công
3. Check polling logs mỗi 3 giây
4. Verify invitations API endpoint trả về data đúng

### Polling không start?
1. Check localStorage.getItem('isLoggedIn') = 'true'
2. Verify `startInvitationPolling()` được gọi
3. Xem console log "Starting invitation polling"

### API 404 Error?
1. Verify Django server running
2. Check URL: http://127.0.0.1:8000/api/shared-fund/invitations/
3. Verify token được gửi trong Authorization header
