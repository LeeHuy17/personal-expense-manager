// D:\personal_expense_manager\src\auth\ui-logic.ts

export const showLoginTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const resetForm = document.getElementById('reset-form-container');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authTabsContainer = document.getElementById('auth-tabs-container');

    // Hiện Login, ẩn các cái khác (bao gồm reset)
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    forgotForm?.classList.add('hidden');
    resetForm?.classList.add('hidden');

    // Hiển thị lại tab bar (trường hợp quay lại từ reset)
    authTabsContainer?.classList.remove('hidden');

    // Cập nhật Style cho Tab (Active)
    tabLogin?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabRegister?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabRegister?.classList.add('text-slate-400');
};

export const showRegisterTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const resetForm = document.getElementById('reset-form-container');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authTabsContainer = document.getElementById('auth-tabs-container');

    // Hiện Register, ẩn Login, Forgot và Reset
    registerForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');
    resetForm?.classList.add('hidden');

    // Hiển thị lại tab bar (trường hợp quay lại từ reset)
    authTabsContainer?.classList.remove('hidden');

    // Cập nhật Style cho Tab (Active)
    tabRegister?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabLogin?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabLogin?.classList.add('text-slate-400');
};

export const showForgotTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const resetForm = document.getElementById('reset-form-container');
    const authTabsContainer = document.getElementById('auth-tabs-container');

    // Hiện Forgot, ẩn các cái khác (bao gồm reset)
    forgotForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');
    registerForm?.classList.add('hidden');
    resetForm?.classList.add('hidden');

    // Hiển thị lại tab bar
    authTabsContainer?.classList.remove('hidden');
};

export const showResetTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const resetForm = document.getElementById('reset-form-container');
    const authTabsContainer = document.getElementById('auth-tabs-container');

    // Hiện Reset, ẩn các form khác
    resetForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');
    registerForm?.classList.add('hidden');
    forgotForm?.classList.add('hidden');

    // Ẩn tab bar (vì đây là mode reset riêng biệt)
    authTabsContainer?.classList.add('hidden');
};

// Hàm đóng/mở Modal nhanh
export const toggleAuthModal = (show: boolean) => {
    const overlay = document.getElementById('modal-overlay');
    if (show) {
        overlay?.classList.remove('hidden');
        overlay?.classList.add('flex');
    } else {
        overlay?.classList.add('hidden');
        overlay?.classList.remove('flex');
    }
};