# Shared Fund (Quỹ Chung)

## 1. Tổng quan

`Shared Fund` là tính năng cho phép nhiều người dùng cùng quản lý chi tiêu chung trong một quỹ. Nó hỗ trợ:

- Tạo quỹ chung mới.
- Mời thành viên vào quỹ.
- Ghi nhận chi tiêu nhóm.
- Ghi nhận thanh toán giữa các thành viên.
- Tính toán cân bằng công nợ giữa thành viên.
- Hiển thị trạng thái quỹ ngay trong dashboard chính của SPA.

Tính năng này được triển khai song song ở hai mức:

- Backend API: `backend/shared_fund/`.
- Frontend dashboard SPA: `src/main.ts` + `index.html`.

## 2. Mô hình dữ liệu (Backend)

### 2.1 `SharedFund`

File: `backend/shared_fund/models/fund.py`

- `id`: AutoField, khóa chính.
- `name`: Tên quỹ.
- `description`: Mô tả quỹ.
- `owner`: Quan hệ ForeignKey tới người dùng (user) quản lý quỹ.
- `created_at`, `updated_at`: ngày tạo và cập nhật.

### 2.2 `FundMember`

File: `backend/shared_fund/models/member.py`

- `fund`: ForeignKey tới `SharedFund`.
- `user`: ForeignKey tới người dùng.
- `role`: `owner` hoặc `member`.
- `joined_at`: ngày tham gia.
- `unique_together`: mỗi user chỉ có một lần tham gia vào cùng quỹ.

### 2.3 `Expense`

File: `backend/shared_fund/models/expense.py`

- `fund`: Quan hệ với quỹ.
- `created_by`: Người nhập chi tiêu.
- `amount`: số tiền.
- `description`: ghi chú chi tiêu.
- `date`: ngày chi.

### 2.4 `Settlement`

File: `backend/shared_fund/models/settlement.py`

- `fund`: Quan hệ với quỹ.
- `from_user`: người thanh toán.
- `to_user`: người nhận.
- `amount`: giá trị thanh toán.
- `created_at`: thời điểm tạo.

### 2.5 `ExpenseSplit`

File: `backend/shared_fund/models/split.py` (không đọc chi tiết ở đây nhưng có sử dụng cho chia công nợ)

- Được dùng để ghi số tiền mỗi thành viên phải trả trên một chi tiêu.
- Dùng trong hàm tính công nợ.

## 3. API Backend

### 3.1 Route chính

File: `backend/shared_fund/urls.py`

- `GET /api/shared-fund/funds/`
- `POST /api/shared-fund/funds/`
- `GET /api/shared-fund/funds/{id}/`
- `POST /api/shared-fund/funds/{id}/invite/`
- `GET /api/shared-fund/funds/{id}/balances/`
- `GET /api/shared-fund/expenses/`
- `POST /api/shared-fund/expenses/`
- `GET /api/shared-fund/settlements/`
- `POST /api/shared-fund/settlements/`

### 3.2 Quyền hạn

- Tất cả endpoints đều yêu cầu `IsAuthenticated`.
- Người dùng chỉ được xem quỹ khi là thành viên quỹ.
- Chỉ `owner` của quỹ mới được mời thành viên mới.
- Chỉ thành viên quỹ mới được tạo chi tiêu hoặc ghi nhận thanh toán.

### 3.3 Tính năng đặc biệt

- `funds/{id}/invite/`: mời thành viên mới bằng `user` và `role`.
- `funds/{id}/balances/`: trả về danh sách cân đối công nợ giữa các thành viên.

## 4. Business logic cân bằng công nợ

File: `backend/shared_fund/services/balance_service.py`

- Tính tổng `paid` của từng thành viên theo `Expense.created_by`.
- Tính tổng `owed` của từng thành viên theo `ExpenseSplit.amount_owed`.
- `balance = paid - owed`.
- Kết quả trả về dạng mảng đã sort theo số dư giảm dần.

## 5. Serializer

### 5.1 SharedFundSerializer

File: `backend/shared_fund/serializers/fund_serializer.py`

- `owner`: hiển thị thông tin người tạo quỹ.
- `member_count`: số lượng thành viên.
- `members`: danh sách thành viên chi tiết.

### 5.2 ExpenseSerializer

File: `backend/shared_fund/serializers/expense_serializer.py`

- `splits`: dùng để chia số tiền chi tiêu giữa các user.
- Validate tổng `splits.amount_owed` phải bằng `amount`.
- `created_by` chỉ đọc, được gán tự động từ user hiện tại.

### 5.3 SettlementSerializer

File: `backend/shared_fund/serializers/settlement_serializer.py`

- `from_user`: chỉ đọc.
- Validate `amount > 0`.

## 6. Frontend tích hợp

File chính: `src/main.ts`

### 6.1 API base

- `sharedFundApiBase = `${backendOrigin}/api/shared-fund/``
- `backendOrigin` lấy từ `VITE_BACKEND_URL` hoặc `VITE_API_BASE`.

### 6.2 Các chức năng chính

- `loadSharedFunds()`
  - Gọi `GET funds/`
  - Cập nhật danh sách quỹ và các option chọn quỹ.

- `createSharedFund(event)`
  - Gửi `POST funds/` với tên và mô tả.
  - Hiển thị thông báo và tải lại dữ liệu.

- `submitSharedFundExpense(event)`
  - Gửi `POST expenses/`.
  - Yêu cầu user chọn quỹ và thì thêm chi tiêu.

- `submitSharedFundSettlement(event)`
  - Gửi `POST settlements/`.
  - Yêu cầu user là thành viên quỹ và người nhận thuộc quỹ.

- `submitSharedFundInvite(event)`
  - Gửi `POST funds/{id}/invite/`.
  - Dùng để thêm thành viên vào quỹ hiện tại.

- `loadSelectedFundDetails(fundId)`
  - Gọi `GET funds/{id}/`, `expenses/?fund={id}`, `settlements/?fund={id}`, `funds/{id}/balances/`.
  - Hiển thị chi tiết quỹ đã chọn.

### 6.3 UI events

- `bindSharedFundEvents()` gán các event listener cho form và nút.
- `toggleSharedFundExpanded()` mở rộng hoặc thu gọn phần chi tiết.
- `openSharedFundPanel()` cuộn tới section và mở phần mở rộng khi nhấn nút.

### 6.4 Layout dashboard

File: `index.html`

- Section `#shared-fund-section` nằm trong cột phải của dashboard.
- Bao gồm: tạo quỹ, thống kê nhanh, danh sách quỹ, và phần mở rộng.
- Phần mở rộng (`#shared-fund-expanded-panel`) chứa:
  - chọn quỹ
  - thêm chi tiêu chung
  - thanh toán
  - mời thành viên
  - xem hoạt động (chi tiêu, thanh toán, công nợ)

## 7. Tương tác người dùng

- Người dùng có thể xem số quỹ chung hiện có và số thành viên nhanh.
- Tạo mới quỹ ngay trong dashboard.
- Mở rộng để thực hiện chi tiêu, thanh toán, và mời thành viên.
- Danh sách quỹ và hoạt động được tải lại khi nhấn nút `Làm mới`.

## 8. Đường dẫn liên quan

- `backend/backend/urls.py`
  - Cấu hình `path('api/shared-fund/', include('shared_fund.urls'))`
  - Cấu hình `path('shared-fund/', include('shared_fund.ui_urls'))`

- `index.html`
  - Section dashboard Shared Fund.
  - Button `header-shared-fund-btn`, `dashboard-shared-fund-btn`, `landing-shared-fund-btn` mở Shared Fund.

## 9. Hướng phát triển tiếp theo (Có thể mở rộng)

- Đồng bộ chi tiêu với `ExpenseSplit` chi tiết hơn.
- Thêm giao diện chọn nhiều thành viên trực quan.
- Hiển thị biểu đồ công nợ và lịch sử chi tiết hơn.
- Thêm trạng thái `pending` cho invite hoặc thanh toán.
- Tính toán lại công nợ tự động khi xóa chi tiêu/thanh toán.

---

## 10. File tham chiếu chính

- `backend/shared_fund/models/fund.py`
- `backend/shared_fund/models/member.py`
- `backend/shared_fund/models/expense.py`
- `backend/shared_fund/models/settlement.py`
- `backend/shared_fund/serializers/fund_serializer.py`
- `backend/shared_fund/serializers/expense_serializer.py`
- `backend/shared_fund/serializers/settlement_serializer.py`
- `backend/shared_fund/views/fund_views.py`
- `backend/shared_fund/views/expense_views.py`
- `backend/shared_fund/views/settlement_views.py`
- `backend/shared_fund/services/balance_service.py`
- `backend/shared_fund/urls.py`
- `backend/shared_fund/ui_urls.py`
- `src/main.ts`
- `index.html`
