import { showToast } from '../utils/toast';
import { checkAuthentication } from '../main';
import { ExpenseManager } from '../ExpenseManager';

const manager = new ExpenseManager();

/**
 * Xử lý sự kiện đăng nhập
 * Flow: Đăng nhập thành công -> Lưu token -> Mở Dashboard -> Đóng Modal
 */
const handleLogin = async (e: Event) => {
    e.preventDefault(); // Chặn load lại trang

    // Lấy giá trị từ input
    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation cơ bản
    if (!email || !password) {
        showToast('Vui lòng điền email và mật khẩu', 'error');
        return;
    }

    // Disable button trong lúc đang gửi
    const submitBtn = document.getElementById('do-login-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';

    try {
        const response = await fetch('http://127.0.0.1:8000/api/accounts/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.access);
            
            // Đăng nhập xong là Load dữ liệu ngay!
            await manager.loadData(); 

            // Sau đó mới ẩn Modal và hiện Dashboard
            document.getElementById('modal-overlay')?.classList.add('hidden');
            document.getElementById('main-dashboard')?.classList.remove('hidden');
        }
            } catch (error) {
                console.error('Lỗi kết nối:', error);
                showToast('Không thể kết nối tới server. Vui lòng thử lại sau!', 'error');
            } finally {
                // Khôi phục button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        };

/**
 * Xử lý sự kiện "Quên mật khẩu"
 * (Optional - có thể bỏ nếu chưa implement)
 */
const handleForgotPassword = async (e: Event) => {
    e.preventDefault();

    const emailInput = document.getElementById('forgot-email') as HTMLInputElement;
    const email = emailInput.value.trim();

    if (!email) {
        showToast('Vui lòng nhập email', 'error');
        return;
    }

    const submitBtn = document.getElementById('do-forgot-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';

    try {
        const response = await fetch('http://127.0.0.1:8000/api/accounts/forgot-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showToast('Email khôi phục mật khẩu đã được gửi. Kiểm tra hộp thư của bạn!', 'success');
            emailInput.value = '';
        } else {
            const errorData = await response.json();
            showToast('Email không được tìm thấy', 'error');
        }
    } catch (error) {
        console.error('Lỗi kết nối:', error);
        showToast('Không thể kết nối tới server', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

// Export
export { handleLogin, handleForgotPassword };