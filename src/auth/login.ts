import { showToast } from '../utils/toast';

/**
 * Xử lý sự kiện đăng nhập
 * Flow: Đăng nhập thành công -> Lưu token -> Mở Dashboard -> Đóng Modal
 */
export const handleLogin = async (e: Event) => {
    e.preventDefault(); // Chặn load lại trang

    // Lấy giá trị từ input
    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation cơ bản
    if (!email || !password) {
        showToast('😕 Vui lòng điền email và mật khẩu', 'error');
        return;
    }

    // Disable button trong lúc đang gửi
    const submitBtn = document.getElementById('do-login-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang xử lý...';

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
            localStorage.setItem('isLoggedIn', 'true');
            
            showToast('✅ Đăng nhập thành công!', 'success');
            
            // Ẩn Modal và hiện Dashboard
            const modal = document.getElementById('modal-overlay');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            
            // Làm mới trang để dashboard load đúng
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            const errorData = await response.json();
            console.error('Login error:', errorData);
            showToast('❌ Email hoặc mật khẩu không đúng', 'error');
        }
    } catch (error) {
        console.error('❌ Lỗi kết nối:', error);
        showToast('❌ Không thể kết nối tới server. Vui lòng thử lại sau!', 'error');
    } finally {
        // Khôi phục button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

/**
 * Xử lý sự kiện "Quên mật khẩu"
 */
export const handleForgotPassword = async (e: Event) => {
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
            showToast('✅ Email khôi phục mật khẩu đã được gửi. Kiểm tra hộp thư!', 'success');
            emailInput.value = '';
        } else {
            const errorData = await response.json();
            showToast('❌ Email không được tìm thấy', 'error');
        }
    } catch (error) {
        console.error('Lỗi kết nối:', error);
        showToast('❌ Không thể kết nối tới server', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};