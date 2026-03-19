# 💰 Personal Expense Manager
## Cấu trúc các nhánh (Branching Strategy)
Dự án được quản lý theo các nhánh tính năng để đảm bảo tính ổn định:

- **main**: Nhánh chính, chứa mã nguồn đã ổn định và hoàn thành các Sprint.
- **feature/frontend-base**: Xây dựng giao diện khung (HTML/CSS), Layout và các trang danh sách.
- **feature/api-integration**: (Lee Huy) Kết nối Frontend với Backend API (Sử dụng Fetch API).
- **feature/statistics-report**: Xử lý logic tính toán và hiển thị biểu đồ thống kê tài chính.
- **feature/auth-system**: Hoàn thiện chức năng Đăng ký, Đăng nhập và phân quyền người dùng.

Website quản lý chi tiêu cá nhân phục vụ học tập theo mô hình Agile Scrum.

<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

---

## 📌 Giới thiệu

Ứng dụng giúp người dùng:

- Quản lý thu chi cá nhân
- Theo dõi lịch sử giao dịch
- Phân loại chi tiêu
- Hỗ trợ phân tích tài chính (định hướng tích hợp AI)

---

## 🛠️ Công nghệ sử dụng

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Vite (build & dev server)

### Backend (đang phát triển)
- Django
- REST API

### AI Integration (dự kiến)
- Google Gemini API

---

## ⚙️ Cài đặt & chạy local

### 1. Yêu cầu hệ thống

- Node.js (>= 18)

---

### 2. Cài đặt project

```bash
npm install
