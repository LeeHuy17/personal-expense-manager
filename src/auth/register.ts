import { showToast } from '../utils/toast';
import { showLoginTab } from './ui-logic';

export const handleRegister = async (e: Event) => {
    e.preventDefault(); // 🔒 Dòng này cực kỳ quan trọng - Chặn reload trang mặc định!
    
    console.log(">>> Đang gửi yêu cầu đăng ký..."); // Log để kiểm tra

    const nameInput = document.getElementById('reg-name') as HTMLInputElement;
    const emailInput = document.getElementById('reg-email') as HTMLInputElement;
    const passwordInput = document.getElementById('reg-password') as HTMLInputElement;
    const submitBtn = document.getElementById('do-register-btn') as HTMLButtonElement;

    const payload = {
        username: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
    };

    console.log("📦 Dữ liệu gửi đi:", payload);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý...';

    try {
        const response = await fetch('http://127.0.0.1:8000/api/accounts/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log("✅ Response từ Django:", data);

        if (response.ok) {
            showToast('✅ Đăng ký thành công! Vui lòng đăng nhập', 'success');
            console.log("Dữ liệu server trả về:", data);
            
            // 🔥 FIX: Xóa dữ liệu form sau khi đăng ký thành công
            nameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            
            // 🔥 FIX: Chuyển sang tab Login thay vì chỉ hiện alert
            showLoginTab();
        } else {
            console.error("❌ Lỗi từ Django:", data);
            const errorMsg = data.username?.[0] || data.email?.[0] || data.password?.[0] || 'Lỗi đăng ký';
            showToast(`❌ Lỗi: ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error("❌ Lỗi kết nối API:", error);
        showToast('❌ Không thể kết nối Backend', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng ký';
    }
};