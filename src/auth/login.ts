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
            
            console.log("✅ LocalStorage updated:", {
                accessToken: !!data.access,
                username: data.username,
                isLoggedIn: localStorage.getItem('isLoggedIn')
            });
            
            // 2. Thông báo cho người dùng
            showToast(`✅ Đăng nhập thành công! Chào ${data.username}`, 'success');
            
            // 3. Xử lý giao diện: Ẩn Modal
            const modal = document.getElementById('modal-overlay');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                console.log("✅ Modal closed");
            }
            
            // 4. Reload page to reinitialize everything with new token
            setTimeout(() => {
                console.log("🌐 Redirecting to / with new token");
                
                // Force browser to NOT use cache - add timestamp to URL
                const redirectUrl = window.location.origin + '?v=' + Date.now();
                console.log("🔄 Force reload with URL:", redirectUrl);
                
                // Use location.href with cache-busting parameter
                window.location.href = redirectUrl;
            }, 800);

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
 * 🔄 REAL-TIME SYNC: Polling function để lắng nghe khi user click email link
 * Frontend sẽ check mỗi 3 giây xem reset request đã ready chưa
 * Khi user click email link → Backend set is_ready_to_reset = true → Frontend detect → Show reset form ON CURRENT PAGE
 */
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const startPollingResetStatus = (email: string) => {
    console.log("🔄 [POLLING] Bắt đầu polling để check reset status...");
    
    // Show waiting message
    const statusEl = document.getElementById('reset-status-info');
    if (statusEl) {
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #ea580c;">
                <span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span>
                <span>Đang chờ xác nhận từ email... (mở email và click link để tiếp tục)</span>
            </div>
        `;
    }
    
    // Start polling every 3 seconds
    let pollCount = 0;
    let toastShown = false; // Flag to ensure toast shows only once
    const maxPolls = 480; // 480 * 3s = 24 minutes timeout
    
    pollingInterval = setInterval(async () => {
        pollCount++;
        console.log(`🔄 [POLLING] Lần ${pollCount} - Checking reset status...`);
        
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/accounts/check-reset-status/?email=${encodeURIComponent(email)}`);
            const data = await response.json();
            
            console.log("✅ [POLLING] Response:", data);
            
            // Check nếu user đã click email link
            if (data.is_ready_to_reset && data.token && data.uid) {
                console.log("🎉 [POLLING] User đã click link! Mark as ready.");
                clearInterval(pollingInterval!);
                pollingInterval = null;
                
                // Show reset form with uid/token
                showResetForm(data.uid, data.token);
                if (!toastShown) {
                    showToast("✅ " + data.message, "success");
                    toastShown = true;
                }
                return;
            }
            
            // Check nếu token hết hạn
            if (data.error === 'expired') {
                console.log("❌ [POLLING] Token đã hết hạn");
                clearInterval(pollingInterval!);
                pollingInterval = null;
                showToast(data.message, "error");
                return;
            }
            
            // Timeout sau 24 phút
            if (pollCount >= maxPolls) {
                console.log("❌ [POLLING] Timeout - bỏ polling");
                clearInterval(pollingInterval!);
                pollingInterval = null;
                showToast("⏱️ Hết thời gian chờ. Vui lòng gửi lại yêu cầu.", "error");
                return;
            }
            
        } catch (error) {
            console.error("❌ [POLLING] Lỗi khi polling:", error);
        }
    }, 3000); // Poll every 3 seconds
};

/**
 * Stop polling nếu user cancel hoặc timeout
 */
export const stopPollingResetStatus = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("🛑 [POLLING] Dừng polling");
    }
};

/**
 * Helper: Show reset form với uid/token
 */
const showResetForm = (uid: string, token: string) => {
    // Import hàm showResetTab từ ui-logic
    try {
        const showResetTab = (window as any).showResetTab;
        if (showResetTab) {
            showResetTab();
        }
    } catch (e) {
        console.log("showResetTab không tìm thấy, làm cách khác");
    }
    
    // Set UID và Token
    (document.getElementById('reset-uid') as HTMLInputElement).value = uid;
    (document.getElementById('reset-token') as HTMLInputElement).value = token;
    
    // Show reset form directly
    const resetForm = document.getElementById('reset-form-container');
    if (resetForm) {
        resetForm.classList.remove('hidden');
        resetForm.style.setProperty('display', 'flex', 'important');
    }
    
    // Hide other forms
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const authTabsContainer = document.getElementById('auth-tabs-container');
    
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.add('hidden');
    if (authTabsContainer) authTabsContainer.classList.add('hidden');
    
    // Update status message
    const statusEl = document.getElementById('reset-status-info');
    if (statusEl) {
        statusEl.textContent = "✅ Link xác nhận thành công! Vui lòng nhập mật khẩu mới.";
        statusEl.style.color = "#10b981";
        statusEl.style.setProperty('display', 'block', 'important');
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
            
            // 🔄 START POLLING - Lắng nghe khi user click email link
            console.log("🔄 Bắt đầu polling để detect khi user click email...");
            startPollingResetStatus(email);
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