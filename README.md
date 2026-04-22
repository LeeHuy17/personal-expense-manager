# 💰 Quản lý Chi tiêu Thông minh (Backend & Core Logic)

Đây là nhánh **`developers`** - trung tâm tích hợp và kiểm thử các tính năng mới trước khi merge vào `main`.

## 🌳 Cấu trúc Nhánh & Tính năng
Dự án hiện đang được triển khai với các nhánh tính năng (feature branches) sau:

| Nhánh (Branch) | Chức năng chính | Trạng thái |
| :--- | :--- | :--- |
| `feature/user-avatar-upload` | Cập nhật & hiển thị ảnh đại diện người dùng | Đã hoàn thành |
| `feature/shared-fund` | Tạo và quản lý quỹ chung giữa các user | Đã hoàn thành |
| `feature/search-filter` | Lọc và tìm kiếm giao dịch thông minh | Đã hoàn thành |
| `feature/pagination` | Phân trang danh sách thu/chi | Đang phát triển |
| `feature/backend-ui` | Quản lý giao diện backend (Admin/Dashboard) | Đang phát triển |
| `feature/ai-advisor` | Tích hợp AI tư vấn tài chính | Đã hoàn thành |
| `feature/ai-integration` | Kết nối API AI Studio | Đã hoàn thành |
| `feature/category-management` | Quản lý danh mục thu/chi | Đã hoàn thành |
| `feature/expense-mgmt` | Quản lý các khoản chi tiêu | Đã hoàn thành |
| `feature/income-mgmt` | Quản lý các nguồn thu nhập | Đã hoàn thành |

---

## 🛠 Quy trình làm việc (Git Workflow)
1. **Pull mới nhất**: Luôn thực hiện `git pull origin developers` trước khi bắt đầu.
2. **Tạo nhánh**: Tạo nhánh mới từ `developers` với quy tắc `feature/<tên-chức-năng>`.
3. **Commit**: Ghi chú commit chi tiết theo chuẩn.
4. **Merge**: Sau khi hoàn thành và test, thực hiện Pull Request để merge vào nhánh `developers`.

## ⚙️ Hướng dẫn Cấu hình Backend (Local)
1. **Cài đặt môi trường**: `python -m venv venv` và kích hoạt.
2. **Cài đặt thư viện**: `pip install -r requirements.txt`.
3. **Database**: Đảm bảo MySQL đã chạy với schema `personal_expense_manager`.
4. **Chạy server**: `python manage.py runserver`.
