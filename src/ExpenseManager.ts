// Định nghĩa kiểu dữ liệu cho một khoản chi (Interface)
interface Expense {
    id?: number;
    title: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
}

export class ExpenseManager {
    private expenses: Expense[] = [];
    private apiUrl = 'http://127.0.0.1:8000/api/expenses/'; // URL API Django của bạn

    constructor() {
        this.toggleView();
    }

    // 1. hàm để điều khiển ẩn/hiện các phần giao diện
    private toggleView(): void {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const landingPage = document.getElementById('landing-page'); // ID của trang giới thiệu
        const dashboardPage = document.getElementById('dashboard-page'); // ID của trang quản lý

        if (isLoggedIn && dashboardPage && landingPage) {
            landingPage.classList.add('hidden');
            dashboardPage.classList.remove('hidden');
            this.loadData(); // Chỉ load dữ liệu khi đã xác định là Dashboard
        } else if (landingPage && dashboardPage) {
            landingPage.classList.remove('hidden');
            dashboardPage.classList.add('hidden');
        }
    }
    /**
     * PHƯƠNG THỨC PUBLIC: Tải dữ liệu từ Backend
     * Đổi từ private thành public để file login.ts có thể gọi sau khi đăng nhập
     */
    public async loadData(): Promise<void> {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
            console.error("Không tìm thấy Token. Vui lòng đăng nhập lại.");
            return;
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Gửi Token JWT để xác thực
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.expenses = await response.json();
                this.renderExpenses(); // Vẽ dữ liệu ra màn hình sau khi tải xong
                console.log("Dữ liệu đã được tải: ", this.expenses);
            } else if (response.status === 401) {
                alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                // Có thể thêm logic logout ở đây
            }
        } catch (error) {
            console.error("Lỗi khi loadData:", error);
        }
    }

    /**
     * Vẽ danh sách chi tiêu ra HTML
     */
    private renderExpenses(): void {
        const container = document.getElementById('expense-list-container');
        if (!container) return;

        if (this.expenses.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 py-10">Chưa có dữ liệu chi tiêu nào.</p>`;
            return;
        }

        container.innerHTML = this.expenses.map(exp => `
            <div class="flex items-center justify-between p-4 mb-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-orange-200 transition-all">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                        <i data-lucide="shopping-bag" class="w-5 h-5 text-orange-600"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-900 dark:text-white">${exp.title}</h4>
                        <p class="text-xs text-slate-400">${exp.date} • ${exp.category}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-bold text-slate-900 dark:text-white">-${exp.amount.toLocaleString()}đ</span>
                </div>
            </div>
        `).join('');
        
        // Nếu dùng Lucide Icons, cần chạy lệnh createIcons sau khi render
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Thêm một khoản chi mới
     */
    public async addExpense(newData: Expense): Promise<boolean> {
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newData)
            });

            if (response.ok) {
                await this.loadData(); // Tải lại danh sách sau khi thêm thành công
                return true;
            }
            return false;
        } catch (error) {
            console.error("Lỗi thêm chi tiêu:", error);
            return false;
        }
    }
}