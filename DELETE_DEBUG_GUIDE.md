# 🗑️ Hướng Dẫn Debug Chức Năng Xóa Giao Dịch

## ✅ Những Thay Đổi Đã Được Thực Hiện

### 1. **Cập Nhật Transaction Interface**
```typescript
interface Transaction {
  id: string;
  incomeId?: number;  // 🔑 Primary key for income
  chiPhiId?: number;  // 🔑 Primary key for expense
  // ... other fields
}
```

### 2. **Cập Nhật fetchTransactions()**
- Hiện tại đã lưu trữ `incomeId` và `chiPhiId` vào object Transaction
- Đảm bảo ID khóa chính không bị mất

### 3. **Cập Nhật deleteTransaction() với Debug Logs**
- **DEBUG 1**: Kiểm tra ID có bị undefined
- **DEBUG 2**: Log URL và token trước khi gửi
- **DEBUG 3**: Log response status từ server
- **DEBUG 4**: Theo dõi quá trình tải lại dữ liệu
- **DEBUG 5**: Log chi tiết lỗi (status, data, message)

### 4. **Cập Nhật renderList()**
- Thêm console.log để in ID khi rendering
- Sử dụng đúng `t.incomeId` và `t.chiPhiId` thay vì `(t as any)`

---

## 🔍 Cách Debug Từng Bước

### **Bước 1: Mở Developer Tools (F12)**
- Nhấn `F12` để mở Developer Console
- Chuyển sang tab **Console** để xem logs
- Chuyển sang tab **Network** để xem API requests

### **Bước 2: Kiểm Tra Console Logs**
Khi bạn bấm nút xóa, hãy xem Console để kiếm các dòng:

```
🔍 [RENDER] Transaction - Type: income, Primary ID: 3, Display ID: 3
🔍 [DEBUG 1] ID nhận được: 3 | Type: income
🚀 [DEBUG 2] Gửi DELETE request tới: http://127.0.0.1:8000/api/incomes/3/
🔐 Token (first 20 chars): cc59c3b31ca9af8e26...
✅ [DEBUG 3] Phản hồi từ Server - Status: 204
🔄 [DEBUG 4] Đang tải lại dữ liệu từ API...
✅ [DEBUG 4] Tải lại UI hoàn tất
```

### **Bước 3: Kiểm Tra Network Tab**
Trong tab **Network**, tìm dòng DELETE:

| Điều Kiện | Ý Nghĩa | Cách Fix |
|-----------|---------|---------|
| **Không có dòng nào** | Callback onclick không hoạt động | Kiểm tra console lỗi, chắc chắn `window.expenseManager` tồn tại |
| **DELETE màu đỏ (404)** | URL sai hoặc ID sai | Kiểm tra DEBUG 2 logs, URL phải có trailing slash `/` |
| **DELETE màu đỏ (403)** | Token hết hạn hoặc sai quyền | Đăng nhập lại, kiểm tra DEBUG 2 token |
| **DELETE màu xanh (204)** nhưng DB vẫn còn | Backend accept nhưng không xóa | Kiểm tra `get_queryset()` ở backend, chắc chắn filter bởi user |

### **Bước 4: Các Lỗi Thường Gặp**

#### ❌ **Lỗi: "ID không hợp lệ! ID: undefined"**
```
Nguyên nhân: primaryId không được truyền vào renderList
Kiểm tra: Trong console, xem dòng 🔍 [RENDER] có Primary ID là gì?
Fix: Đảm bảo fetchTransactions() đã lưu incomeId/chiPhiId
```

#### ❌ **Lỗi: 404 Not Found**
```
Kiểm tra URL được log ở DEBUG 2
Sai: http://127.0.0.1:8000/api/expenses/5
Đúng: http://127.0.0.1:8000/api/expenses/5/
``` 

#### ❌ **Lỗi: 403 Forbidden**
```
Nguyên nhân: Token hết hạn
Fix: Đăng nhập lại
Kiểm tra: Token được log ở DEBUG 2
```

#### ❌ **Bấm xóa, mất khỏi UI, nhưng F5 hiện lại**
```
Nguyên nhân: DELETE request return 204 nhưng backend không thực sự xóa
Kiểm tra: 
  - Backend get_queryset() có filter bởi user không?
  - Database có thực sự xóa record không?
Cách test: Dùng SQL query xem record còn không
```

---

## 🛠️ Cách Test Nhanh

### **Test 1: Kiểm Tra Window Object**
Mở Console (F12) gắp typing:
```javascript
console.log(window.expenseManager)
```
Nếu in ra object lớn -> OK ✅
Nếu in ra undefined -> Lỗi ❌

### **Test 2: Kiểm Tra Transaction Data**
```javascript
// Trong ConsoleTab, type:
window.expenseManager.transactions // Xem tất cả transactions
window.expenseManager.transactions[0] // Xem transaction đầu tiên
```

Kết quả sẽ hiển thị:
```javascript
{
  id: "3",
  incomeId: 3,
  description: "Lương",
  amount: 15000000,
  type: "income",
  category: "Khác",
  date: "2026-04-01T00:00:00"
}
```

**Kiểm tra**: `incomeId` hay `chiPhiId` có giá trị không? ✅

### **Test 3: Gọi Delete Thủ Công**
```javascript
// Trong Console, type:
window.expenseManager.deleteTransaction(3, 'income')
```

Nhìn vào console logs để xem quá trình.

---

## 📝 Backend Kiểm Tra

Nếu tất cả logs trên frontend đều ✅ nhưng DB vẫn không xóa:

### **Kiểm Tra get_queryset() trong views.py**

```python
class ThuNhapViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # ✅ ĐÚNG: Filter bởi user
        return ThuNhap.objects.filter(user=self.request.user)
    
    # ❌ SAI: Không filter
    # queryset = ThuNhap.objects.all()
```

### **Test Backend API trực tiếp**

Mở terminal, gục:
```bash
curl -X DELETE http://127.0.0.1:8000/api/incomes/3/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

Nếu return 204 -> OK ✅
Nếu return 404 -> Kiểm tra ID, URL
Nếu return 403 -> Token sai hoặc hết hạn

---

## 📊 Quy Trình Debug Toàn Bộ

```
┌─────────────────────────────┐
│ 1. Bấm nút Xóa             │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Console: DEBUG 1 có ID?      │ ── Không? → Kiểm tra renderList
└──────────┬──────────────────┘    Có? → Tiếp
           │
           ▼
┌─────────────────────────────┐
│ Network: Có DELETE request?  │ ── Không? → onclick callback không work
└──────────┬──────────────────┘    Có? → Tiếp
           │
           ▼
┌─────────────────────────────┐
│ Network: Status code gì?     │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┬────────┐
    ▼             ▼        ▼
  404/403       204       ...
   (Lỗi)       (OK)
    │           │
    │       Bấm F5
    │           │
    │       Record biến mất? ✅
    │           │
    └───────────┘
```

---

## ✅ Checklist Trước Khi Deploy

- [ ] Console không có lỗi JavaScript
- [ ] Delete request trả về 204 (Network tab)
- [ ] Sau khi delete, data không load lại từ DB
- [ ] F5 confirm record thực sự xóa
- [ ] Test với cả income và expense
- [ ] Test khi token hết hạn (phải đăng nhập lại)

---

## 📞 Nếu Vẫn Lỗi

Hãy cung cấp:
1. Screenshot Console logs (tất cả dòng từ DEBUG 1-5)
2. Screenshot Network tab DELETE request
3. Response body của DELETE request
4. Screenshot backend logs (nếu có)

Sau đó mình sẽ giúp debug chi tiết hơn! 🚀
