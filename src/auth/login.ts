import { showToast } from '../utils/toast';

/**
 * Xử lý sự kiện đăng nhập
 * Flow: Đăng nhập thành công -> Lưu token -> Mở Dashboard -> Đóng Modal
 */
export const handleLogin = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🔑 Login button clicked");

    // Lấy giá trị từ input
    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    console.log("📧 Email:", email);

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
        console.log("📤 Gửi request POST tới: http://127.0.0.1:8000/api/accounts/login/");
        
        const response = await fetch('http://127.0.0.1:8000/api/accounts/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log("📥 Response status:", response.status);

        if (response.ok) {
            const data = await response.json();

            // 1. Lưu thông tin quan trọng vào LocalStorage
            localStorage.setItem('accessToken', data.access || ''); 
            localStorage.setItem('username', data.username);
            localStorage.setItem('isLoggedIn', 'true');
            
            // 2. Thông báo cho người dùng
            showToast(`✅ Đăng nhập thành công! Chào ${data.username}`, 'success');
            
            // 3. Xử lý giao diện: Ẩn Modal
            const modal = document.getElementById('modal-overlay');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            
            // 4. Làm mới trang
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } else {
            // Xử lý khi đăng nhập thất bại
            const errorData = await response.json();
            console.error('Login error:', errorData);
            
            const msg = errorData.error || '❌ Email hoặc mật khẩu không đúng';
            showToast(msg, 'error');
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
    e.stopPropagation();
    
    console.log("🔑 Forgot Password button clicked");
    
    const emailInput = document.querySelector('#forgot-email') as HTMLInputElement;
    const email = emailInput?.value?.trim();

    console.log("📧 Email nhập:", email);
    
    if (!email) {
        showToast("Vui lòng nhập email!", "error");
        return;
    }

    const submitBtn = document.getElementById('do-forgot-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang xử lý...';

    try {
        console.log("📤 Gửi request POST tới:", 'http://127.0.0.1:8000/api/accounts/forgot-password/');
        
        const response = await fetch('http://127.0.0.1:8000/api/accounts/forgot-password/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        console.log("📥 Response status:", response.status);
        
        const data = await response.json();
        console.log("📥 Response data:", data);
        
        if (response.ok) {
            showToast("✅ Đã gửi email khôi phục! Vui lòng kiểm tra inbox", "success");
        } else {
            showToast(data.error || "Có lỗi xảy ra", "error");
        }
    } catch (error) {
        console.error("❌ Lỗi kết nối server:", error);
        showToast("❌ Lỗi kết nối server", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

/**
 * Xử lý sự kiện "Đặt lại mật khẩu"
 * Được gọi từ onclick handler trên nút #do-reset-btn
 */
export const handleResetPasswordClick = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🔐 Reset Password button clicked");
    
    // Lấy các giá trị từInput
    const newPassword = (document.getElementById('reset-password') as HTMLInputElement)?.value || '';
    const confirmPassword = (document.getElementById('reset-password-confirm') as HTMLInputElement)?.value || '';
    const uid = (document.getElementById('reset-uid') as HTMLInputElement)?.value || '';
    const token = (document.getElementById('reset-token') as HTMLInputElement)?.value || '';

    console.log("📋 Data:", { 
        uidLength: uid.length, 
        tokenLength: token.length, 
        passwordLength: newPassword.length 
    });

    // Validation cơ bản
    if (!uid || !token) {
        showToast("❌ URL không hợp lệ. Vui lòng kiểm tra lại link trong email", "error");
        return;
    }

    if (!newPassword || !confirmPassword) {
        showToast("😕 Vui lòng điền đầy đủ mật khẩu", "error");
        return;
    }

    if (newPassword.length < 6) {
        showToast("🔐 Mật khẩu phải có ít nhất 6 ký tự", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("❌ Mật khẩu xác nhận không khớp!", "error");
        return;
    }

    // Disable button trong lúc đang gửi
    const submitBtn = document.getElementById('do-reset-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang xử lý...';

    try {
        console.log("📤 Gửi request POST tới: http://127.0.0.1:8000/api/accounts/reset-password/");
        console.log("📋 Body:", { 
            uid: uid.substring(0, 10) + '...', 
            token: token.substring(0, 10) + '...', 
            new_password: '***' 
        });
        
        const response = await fetch('http://127.0.0.1:8000/api/accounts/reset-password/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                uid: uid,
                token: token,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        console.log("📥 Response status:", response.status);
        
        const data = await response.json();
        console.log("📥 Response data:", data);

        if (response.ok) {
            showToast("✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", "success");
            
            // Chuyển hướng về trang chủ/login sau 2 giây
            setTimeout(() => {
                console.log("🔄 Redirecting to home page...");
                window.location.href = '/';
            }, 2000);
        } else {
            const errorMsg = data.error || data.detail || "Link đã hết hạn hoặc không hợp lệ";
            console.error("❌ Reset error:", errorMsg);
            showToast(`❌ ${errorMsg}`, "error");
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    } catch (error) {
        console.error("❌ Lỗi reset mật khẩu:", error);
        showToast("❌ Lỗi kết nối server", "error");
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};