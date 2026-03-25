// D:\personal_expense_manager\src\auth\ui-logic.ts

export const showLoginTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    // Hiện Login, ẩn các cái khác
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    forgotForm?.classList.add('hidden');

    // Cập nhật Style cho Tab (Active)
    tabLogin?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabRegister?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabRegister?.classList.add('text-slate-400');
};

export const showRegisterTab = () => {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    // Hiện Register, ẩn Login
    registerForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');

    // Cập nhật Style cho Tab (Active)
    tabRegister?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabLogin?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-orange-600');
    tabLogin?.classList.add('text-slate-400');
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