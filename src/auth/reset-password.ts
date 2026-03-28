import { showToast } from '../utils/toast';

/**
 * Xử lý sự kiện đặt lại mật khẩu
 * Flow: Kiểm tra URL Parameters (uid, token) -> Hiển thị form reset -> Gửi mật khẩu mới -> Thông báo thành công
 */

// Lấy uid và token từ URL
export const getResetParamsFromURL = () => {
    // URL có định dạng: /reset-password/{uid}/{token}/
    const pathParts = window.location.pathname.split('/');
    
    // Tìm vị trí của 'reset-password' trong path
    const resetIndex = pathParts.indexOf('reset-password');
    
    if (resetIndex !== -1 && resetIndex + 2 < pathParts.length) {
        const uid = pathParts[resetIndex + 1];
        const token = pathParts[resetIndex + 2];
        return { uid, token };
    }
    
    return null;
};

/**
 * Hiển thị form reset password với uid và token
 * @param uid - User ID (base64 encoded)
 * @param token - Reset token
 */
export const showResetTab = (uid: string, token: string) => {
    // 1. Ẩn tất cả các form khác (Login, Register, Forgot)
    document.getElementById('login-form-container')?.classList.add('hidden');
    document.getElementById('register-form-container')?.classList.add('hidden');
    document.getElementById('forgot-form-container')?.classList.add('hidden');

    // 2. Hiện Form Reset
    const resetContainer = document.getElementById('reset-form-container');
    resetContainer?.classList.remove('hidden');

    // 3. Đổ dữ liệu uid/token vào input ẩn
    (document.getElementById('reset-uid') as HTMLInputElement).value = uid;
    (document.getElementById('reset-token') as HTMLInputElement).value = token;
    
    // 4. Cập nhật thông báo trạng thái
    const statusInfo = document.getElementById('reset-status-info');
    if (statusInfo) statusInfo.textContent = "✅ Link hợp lệ. Vui lòng nhập mật khẩu mới.";
};

/**
 * Hiển thị form reset password
 * Được gọi khi phát hiện URL reset-password
 */
export const showResetPasswordForm = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const resetForm = document.getElementById('reset-form-container');
    
    // Ẩn tất cả form khác
    loginForm?.classList.add('hidden');
    registerForm?.classList.add('hidden');
    forgotForm?.classList.add('hidden');
    
    // Hiển thị form reset
    resetForm?.classList.remove('hidden');
    
    // Ẩn tab auth (vì đây không phải là tab bình thường)
    const tabsContainer = document.querySelector('.flex.p-1.bg-slate-50');
    if (tabsContainer) {
        tabsContainer.classList.add('hidden');
    }
};

/**
 * Xử lý sự kiện đặt lại mật khẩu
 * Lấy uid/token từ hidden inputs thay vì parse URL
 */
export const handleResetPassword = async (e: Event) => {
    e.preventDefault();
    
    // Lấy uid và token từ hidden inputs
    const uid = (document.getElementById('reset-uid') as HTMLInputElement).value;
    const token = (document.getElementById('reset-token') as HTMLInputElement).value;
    
    if (!uid || !token) {
        showToast('❌ URL không hợp lệ. Vui lòng kiểm tra link trong email', 'error');
        return;
    }
    
    // Lấy giá trị từ input
    const passwordInput = document.getElementById('reset-password') as HTMLInputElement;
    const confirmInput = document.getElementById('reset-password-confirm') as HTMLInputElement;
    
    const newPassword = passwordInput.value;
    const confirmPassword = confirmInput.value;
    
    // Validation cơ bản
    if (!newPassword || !confirmPassword) {
        showToast('😕 Vui lòng điền đầy đủ mật khẩu', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('🔐 Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('⚠️ Mật khẩu không trùng khớp', 'error');
        return;
    }
    
    // Disable button trong lúc đang gửi
    const submitBtn = document.getElementById('do-reset-btn') as HTMLButtonElement;
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang xử lý...';
    
    try {
        console.log('📤 Gửi request POST tới:', 'http://127.0.0.1:8000/api/accounts/reset-password/');
        console.log('📋 Dữ liệu gửi:', { uid, token, new_password: newPassword });
        
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
        
        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Phản hồi từ server:', data);
            
            showToast(`✅ ${data.message || 'Mật khẩu đã được cập nhật!'}. Đang chuyển hướng đến đăng nhập...`, 'success');
            
            // Chuyển hướng về trang login sau 2 giây
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            const error = await response.json();
            console.error('❌ Lỗi từ server:', error);
            showToast(`❌ ${error.error || error.detail || 'Lỗi không xác định'}`, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    } catch (error) {
        console.error('❌ Lỗi reset mật khẩu:', error);
        showToast('❌ Lỗi kết nối. Vui lòng thử lại', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

/**
 * Kiểm tra xem chúng ta có phải ở trang reset password không
 * Nếu có thì hiển thị form reset
 */
export const initResetPasswordPage = () => {
    const params = getResetParamsFromURL();
    
    if (params) {
        const { uid, token } = params;
        
        // Ẩn landing, hiển thị modal auth
        const landingView = document.getElementById('landing-view');
        const dashboardView = document.getElementById('dashboard-view');
        const modalOverlay = document.getElementById('modal-overlay');
        
        if (landingView) landingView.classList.add('hidden');
        if (dashboardView) dashboardView.classList.add('hidden');
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            modalOverlay.classList.add('flex');
        }
        
        // Gọi showResetTab để setup form với uid/token
        showResetTab(uid, token);
    }
};

/**
 * Event listeners initialization
 */
export const setupResetPasswordListeners = () => {
    const resetBtn = document.getElementById('do-reset-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetPassword);
    }
};
