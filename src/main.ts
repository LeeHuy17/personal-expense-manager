import * as d3 from 'd3';
import { createIcons, icons } from 'lucide';
import { GoogleGenAI } from "@google/genai";
import './index.css';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

interface Category {
  name: string;
  icon: string;
  color: string;
}

class ExpenseManager {
  private transactions: Transaction[] = [];
  private categories: Category[] = [
    { name: 'Ăn uống', icon: 'utensils', color: '#f59e0b' },
    { name: 'Di chuyển', icon: 'car', color: '#3b82f6' },
    { name: 'Mua sắm', icon: 'shopping-bag', color: '#ec4899' },
    { name: 'Giải trí', icon: 'gamepad-2', color: '#a855f7' },
    { name: 'Nhà cửa', icon: 'home', color: '#10b981' },
    { name: 'Lương', icon: 'banknote', color: '#14b8a6' },
    { name: 'Khác', icon: 'plus', color: '#64748b' }
  ];
  private categoryBudgets: Record<string, number> = {};
  private goals: Goal[] = [];
  private monthlyBudget: number = 10000000; // Default 10M VND
  private isDarkMode: boolean = false;
  private isIncognito: boolean = false;
  private isLoggedIn: boolean = false;

  // Elements
  private landingView: HTMLElement;
  private dashboardView: HTMLElement;
  private balanceEl: HTMLElement;
  private incomeEl: HTMLElement;
  private expenseEl: HTMLElement;
  private listEl: HTMLElement;
  private formEl: HTMLFormElement;
  private chartContainer: HTMLElement;
  private searchInput: HTMLInputElement;
  private filterCategory: HTMLSelectElement;
  private budgetProgress: HTMLElement;
  private budgetPercent: HTMLElement;
  private budgetWarning: HTMLElement;
  private goalsList: HTMLElement;
  private aiAdviceContainer: HTMLElement;
  private trendChartContainer: HTMLElement;
  private budgetListEl: HTMLElement;
  private budgetModal: HTMLElement;
  private budgetForm: HTMLFormElement;
  private currentPage: number = 1;
  private itemsPerPage: number = 10;
  private sortBy: string = 'date-desc';
  private dateFrom: string = '';
  private dateTo: string = '';

  constructor() {
    this.landingView = document.getElementById('landing-view')!;
    this.dashboardView = document.getElementById('dashboard-view')!;
    this.balanceEl = document.getElementById('total-balance')!;
    this.incomeEl = document.getElementById('total-income')!;
    this.expenseEl = document.getElementById('total-expense')!;
    this.listEl = document.getElementById('transaction-list')!;
    this.formEl = document.getElementById('transaction-form') as HTMLFormElement;
    this.chartContainer = document.getElementById('chart-container')!;
    this.trendChartContainer = document.getElementById('trend-chart-container')!;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.filterCategory = document.getElementById('filter-category') as HTMLSelectElement;
    this.budgetProgress = document.getElementById('budget-progress')!;
    this.budgetPercent = document.getElementById('budget-percent')!;
    this.budgetWarning = document.getElementById('budget-warning')!;
    this.goalsList = document.getElementById('goals-list')!;
    this.aiAdviceContainer = document.getElementById('ai-advice-container')!;
    this.budgetListEl = document.getElementById('budget-list')!;
    this.budgetModal = document.getElementById('budget-modal')!;
    this.budgetForm = document.getElementById('budget-form') as HTMLFormElement;

    this.loadData();
    this.init();
    this.setupEventListeners();
    this.setupBudgetEvents();
    
    if (this.transactions.length === 0) {
      this.addMockData();
    }
    
    this.render();
    this.getAIAdvice();
    this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    this.toggleView();
  }

  private toggleView() {
    if (this.isLoggedIn) {
      this.landingView.classList.add('hidden');
      this.dashboardView.classList.remove('hidden');
      this.render();
    } else {
      this.landingView.classList.remove('hidden');
      this.dashboardView.classList.add('hidden');
    }
    localStorage.setItem('isLoggedIn', this.isLoggedIn.toString());
  }

  private init() {
    // Theme init
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    }

    // Category dropdown init
    this.updateCategoryDropdowns();
  }

  private setupEventListeners() {
    // Landing Page Listeners
    document.getElementById('get-started-btn')?.addEventListener('click', () => this.openAuthModal('register'));
    document.getElementById('landing-login-btn')?.addEventListener('click', () => this.openAuthModal('login'));
    document.getElementById('landing-home-btn')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('landing-logo')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('landing-features-btn')?.addEventListener('click', () => {
      document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('footer-home-btn')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('footer-features-btn')?.addEventListener('click', () => {
      document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('footer-login-btn')?.addEventListener('click', () => {
      this.openAuthModal('login');
    });

    document.getElementById('learn-more-btn')?.addEventListener('click', () => {
      document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    this.formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTransaction();
    });

    document.getElementById('clear-all')?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn xóa tất cả giao dịch?')) {
        this.transactions = [];
        this.saveData();
        this.render();
      }
    });

    this.searchInput.addEventListener('input', () => {
      this.currentPage = 1;
      this.renderList();
    });
    this.filterCategory.addEventListener('change', () => {
      this.currentPage = 1;
      this.renderList();
    });

    document.getElementById('filter-date-from')?.addEventListener('change', (e) => {
      this.dateFrom = (e.target as HTMLInputElement).value;
      this.currentPage = 1;
      this.renderList();
    });

    document.getElementById('filter-date-to')?.addEventListener('change', (e) => {
      this.dateTo = (e.target as HTMLInputElement).value;
      this.currentPage = 1;
      this.renderList();
    });

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
      this.sortBy = (e.target as HTMLSelectElement).value;
      this.renderList();
    });

    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderList();
      }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.getFilteredTransactions().length / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderList();
      }
    });

    // Input formatting
    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const contributeAmountInput = document.getElementById('contribute-amount') as HTMLInputElement;
    const goalTargetInput = document.getElementById('goal-target') as HTMLInputElement;

    [amountInput, contributeAmountInput, goalTargetInput].forEach(input => {
      input?.addEventListener('input', () => this.formatInput(input));
    });

    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('incognito-toggle')?.addEventListener('click', () => this.toggleIncognito());
    document.getElementById('ask-ai-btn')?.addEventListener('click', () => this.getAIAdvice());
    document.getElementById('header-add-btn')?.addEventListener('click', () => {
      this.formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const descInput = document.getElementById('desc') as HTMLInputElement;
      descInput.focus();
    });
    document.getElementById('fab-add')?.addEventListener('click', () => {
      this.formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const descInput = document.getElementById('desc') as HTMLInputElement;
      descInput.focus();
    });

    // Logo Menu Toggle
    const logoTrigger = document.getElementById('logo-menu-trigger');
    const logoMenu = document.getElementById('logo-menu');
    
    logoTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      logoMenu?.classList.toggle('opacity-0');
      logoMenu?.classList.toggle('invisible');
      logoMenu?.classList.toggle('translate-y-2');
    });

    document.addEventListener('click', () => {
      logoMenu?.classList.add('opacity-0', 'invisible');
      logoMenu?.classList.remove('translate-y-2');
    });

    // Menu Shortcuts
    document.querySelectorAll('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-scroll');
        const target = document.getElementById(targetId!);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Close menu
        logoMenu?.classList.add('opacity-0', 'invisible');
        logoMenu?.classList.remove('translate-y-2');
      });
    });

    document.getElementById('ai-advice-shortcut')?.addEventListener('click', () => {
      this.aiAdviceContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Close menu
      logoMenu?.classList.add('opacity-0', 'invisible');
      logoMenu?.classList.remove('translate-y-2');
    });

    // Auth listeners
    document.getElementById('dropdown-login-btn')?.addEventListener('click', () => this.openAuthModal('login'));
    document.getElementById('dropdown-register-btn')?.addEventListener('click', () => this.openAuthModal('register'));
    document.getElementById('dropdown-logout-btn')?.addEventListener('click', () => {
      this.isLoggedIn = false;
      this.showToast('Đã đăng xuất', 'warning');
      this.toggleView();
    });

    document.getElementById('dashboard-home-btn')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('header-home-link')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('dashboard-footer-home')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('dashboard-footer-stats')?.addEventListener('click', () => {
      document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('dashboard-footer-history')?.addEventListener('click', () => {
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('close-auth-modal')?.addEventListener('click', () => this.closeModals());
    document.getElementById('switch-to-register')?.addEventListener('click', () => this.switchAuthForm('register'));
    document.getElementById('switch-to-login')?.addEventListener('click', () => this.switchAuthForm('login'));
    document.getElementById('forgot-password-btn')?.addEventListener('click', () => this.switchAuthForm('forgot'));
    document.getElementById('back-to-login')?.addEventListener('click', () => this.switchAuthForm('login'));

    // Auth Tabs
    document.getElementById('tab-login')?.addEventListener('click', () => this.switchAuthForm('login'));
    document.getElementById('tab-register')?.addEventListener('click', () => this.switchAuthForm('register'));
    document.getElementById('tab-forgot')?.addEventListener('click', () => this.switchAuthForm('forgot'));

    // Modal listeners
    const overlay = document.getElementById('modal-overlay')!;
    const catModal = document.getElementById('category-modal')!;
    const goalModal = document.getElementById('goal-modal')!;
    const authModal = document.getElementById('auth-modal')!;

    document.getElementById('manage-categories-btn')?.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      catModal.classList.remove('hidden');
      this.renderCategoryManager();
    });

    document.getElementById('add-goal-btn')?.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      goalModal.classList.remove('hidden');
    });

    document.getElementById('close-category-modal')?.addEventListener('click', () => this.closeModals());
    document.getElementById('close-goal-modal')?.addEventListener('click', () => this.closeModals());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModals();
    });

    document.getElementById('save-category-btn')?.addEventListener('click', () => this.addCategory());
    document.getElementById('save-goal-btn')?.addEventListener('click', () => this.addGoal());
    document.getElementById('do-contribute-btn')?.addEventListener('click', () => this.contributeToGoal());
    document.getElementById('close-contribute-modal')?.addEventListener('click', () => this.closeModals());

    // Mock Auth button logic
    document.getElementById('do-login-btn')?.addEventListener('click', () => {
      const email = (document.getElementById('login-email') as HTMLInputElement).value;
      const password = (document.getElementById('login-password') as HTMLInputElement).value;
      
      if (!email || !password) {
        this.showToast('Vui lòng nhập đầy đủ email và mật khẩu', 'error');
        return;
      }

      this.isLoggedIn = true;
      this.showToast('Đăng nhập thành công!', 'success');
      this.closeModals();
      this.toggleView();
    });

    document.getElementById('do-register-btn')?.addEventListener('click', () => {
      const name = (document.getElementById('reg-name') as HTMLInputElement).value;
      const email = (document.getElementById('reg-email') as HTMLInputElement).value;
      const password = (document.getElementById('reg-password') as HTMLInputElement).value;

      if (!name || !email || !password) {
        this.showToast('Vui lòng điền đầy đủ thông tin', 'error');
        return;
      }

      this.isLoggedIn = true;
      this.showToast('Đăng ký tài khoản thành công!', 'success');
      this.closeModals();
      this.toggleView();
    });

    // Enter key support for login/register
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('do-login-btn')?.click();
    });
    document.getElementById('reg-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('do-register-btn')?.click();
    });
    document.getElementById('do-forgot-btn')?.addEventListener('click', () => {
      this.showToast('Yêu cầu khôi phục đã được gửi! (Dữ liệu mô phỏng)', 'warning');
      this.closeModals();
    });

    // Logout logic
    document.querySelectorAll('[data-lucide="log-out"]').forEach(btn => {
      btn.parentElement?.addEventListener('click', () => {
        this.isLoggedIn = false;
        this.showToast('Đã đăng xuất', 'warning');
        this.toggleView();
      });
    });

    // Transaction Type Toggle Logic
    const typeExpenseBtn = document.getElementById('type-expense-btn')!;
    const typeIncomeBtn = document.getElementById('type-income-btn')!;
    const typeInput = document.getElementById('type') as HTMLInputElement;

    const updateTypeToggle = (type: 'expense' | 'income') => {
      typeInput.value = type;
      if (type === 'expense') {
        typeExpenseBtn.className = 'flex-1 py-3 rounded-xl text-sm font-bold transition-all z-10 bg-white dark:bg-slate-900 shadow-sm text-rose-600 flex items-center justify-center gap-2';
        typeIncomeBtn.className = 'flex-1 py-3 rounded-xl text-sm font-bold transition-all z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center gap-2';
      } else {
        typeIncomeBtn.className = 'flex-1 py-3 rounded-xl text-sm font-bold transition-all z-10 bg-white dark:bg-slate-900 shadow-sm text-green-600 flex items-center justify-center gap-2';
        typeExpenseBtn.className = 'flex-1 py-3 rounded-xl text-sm font-bold transition-all z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center gap-2';
      }
    };

    typeExpenseBtn.addEventListener('click', () => updateTypeToggle('expense'));
    typeIncomeBtn.addEventListener('click', () => updateTypeToggle('income'));
    
    // Store update function for use in addTransaction
    (this as any).updateTypeToggle = updateTypeToggle;
  }

  private openAuthModal(form: 'login' | 'register' | 'forgot' = 'login') {
    const overlay = document.getElementById('modal-overlay')!;
    const authModal = document.getElementById('auth-modal')!;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    authModal.classList.remove('hidden');
    this.switchAuthForm(form);
    createIcons({ icons });
  }

  private switchAuthForm(form: 'login' | 'register' | 'forgot') {
    const loginForm = document.getElementById('login-form-container')!;
    const registerForm = document.getElementById('register-form-container')!;
    const forgotForm = document.getElementById('forgot-form-container')!;

    const tabLogin = document.getElementById('tab-login')!;
    const tabRegister = document.getElementById('tab-register')!;
    const tabForgot = document.getElementById('tab-forgot')!;

    const forms = [loginForm, registerForm, forgotForm];
    forms.forEach(f => {
      f.classList.add('hidden');
      f.classList.remove('animate-in', 'fade-in', 'slide-in-from-bottom-4');
    });

    const tabs = [tabLogin, tabRegister, tabForgot];
    tabs.forEach(t => {
      t.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200';
    });

    let target: HTMLElement;
    let activeTab: HTMLElement;

    if (form === 'login') {
      target = loginForm;
      activeTab = tabLogin;
    } else if (form === 'register') {
      target = registerForm;
      activeTab = tabRegister;
    } else {
      target = forgotForm;
      activeTab = tabForgot;
    }

    target.classList.remove('hidden');
    activeTab.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all z-10 bg-white dark:bg-slate-900 shadow-sm text-orange-600';

    // Trigger animation
    void (target as any).offsetWidth; 
    target.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom-4', 'duration-300');
  }

  private closeModals() {
    const overlay = document.getElementById('modal-overlay')!;
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    document.getElementById('category-modal')?.classList.add('hidden');
    document.getElementById('goal-modal')?.classList.add('hidden');
    document.getElementById('auth-modal')?.classList.add('hidden');
    document.getElementById('contribute-modal')?.classList.add('hidden');
  }

  private toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.render(true); // Re-render to update chart colors without alerts
  }

  private toggleIncognito() {
    this.isIncognito = !this.isIncognito;
    const values = document.querySelectorAll('.balance-value');
    values.forEach(v => v.classList.toggle('incognito-blur'));
    const icon = document.getElementById('incognito-icon')!;
    icon.setAttribute('data-lucide', this.isIncognito ? 'eye-off' : 'eye');
    createIcons({ icons });
  }

  private loadData() {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) this.transactions = JSON.parse(savedTransactions);

    const savedCategories = localStorage.getItem('categories');
    if (savedCategories) {
      const parsed = JSON.parse(savedCategories);
      // Migration check: if categories are strings, reset to default or map them
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        // Keep default categories if migration is needed
        localStorage.removeItem('categories');
      } else {
        this.categories = parsed;
      }
    }

    const savedBudgets = localStorage.getItem('categoryBudgets');
    if (savedBudgets) this.categoryBudgets = JSON.parse(savedBudgets);

    const savedGoals = localStorage.getItem('goals');
    if (savedGoals) this.goals = JSON.parse(savedGoals);
  }

  private saveData() {
    localStorage.setItem('transactions', JSON.stringify(this.transactions));
    localStorage.setItem('categories', JSON.stringify(this.categories));
    localStorage.setItem('categoryBudgets', JSON.stringify(this.categoryBudgets));
    localStorage.setItem('goals', JSON.stringify(this.goals));
  }

  private addCategory() {
    const input = document.getElementById('new-category-input') as HTMLInputElement;
    const iconInput = document.getElementById('new-category-icon') as HTMLSelectElement;
    const colorInput = document.getElementById('new-category-color') as HTMLInputElement;
    
    const name = input.value.trim();
    const icon = iconInput.value;
    const color = colorInput.value;

    if (!name) return;
    if (this.categories.some(c => c.name === name)) {
      this.showToast('Danh mục đã tồn tại', 'error');
      return;
    }

    this.categories.push({ name, icon, color });
    this.saveData();
    this.updateCategoryDropdowns();
    this.renderCategoryManager();
    input.value = '';
    this.showToast('Đã thêm danh mục mới', 'success');
  }

  public deleteCategory(name: string) {
    if (this.categories.length <= 1) {
      this.showToast('Phải có ít nhất một danh mục', 'error');
      return;
    }
    this.categories = this.categories.filter(c => c.name !== name);
    delete this.categoryBudgets[name];
    this.saveData();
    this.updateCategoryDropdowns();
    this.renderCategoryManager();
  }

  public setCategoryBudget(name: string, amount: number) {
    if (amount >= 0) {
      this.categoryBudgets[name] = amount;
      this.saveData();
      this.renderBudget();
    }
  }

  private updateCategoryDropdowns() {
    const catSelect = document.getElementById('category') as HTMLSelectElement;
    const filterSelect = document.getElementById('filter-category') as HTMLSelectElement;
    const budgetSelect = document.getElementById('budget-category') as HTMLSelectElement;

    const options = this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (catSelect) catSelect.innerHTML = options;
    if (filterSelect) filterSelect.innerHTML = `<option value="all">Tất cả danh mục</option>` + options;
    if (budgetSelect) budgetSelect.innerHTML = options;
  }

  private renderCategoryManager() {
    const list = document.getElementById('categories-list-manage')!;
    list.innerHTML = this.categories.map(c => `
      <div class="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-transparent dark:border-slate-700 hover:border-orange-100 transition-all">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background-color: ${c.color}15; color: ${c.color}">
              <i data-lucide="${c.icon}" class="w-5 h-5"></i>
            </div>
            <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${c.name}</span>
          </div>
          <button onclick="window.expenseManager.deleteCategory('${c.name}')" class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-xl transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
        <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm">
          <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Ngân sách:</label>
          <input type="text" 
            value="${new Intl.NumberFormat('vi-VN').format(this.categoryBudgets[c.name] || 0)}" 
            oninput="window.expenseManager.formatInput(this)"
            onchange="window.expenseManager.setCategoryBudget('${c.name}', window.expenseManager.parseFormattedNumber(this.value))"
            class="flex-1 bg-transparent border-none px-2 py-1 text-xs font-bold text-orange-600 outline-none"
          >
          <span class="text-[10px] text-slate-400 font-bold mr-1">đ</span>
        </div>
      </div>
    `).join('');
    createIcons({ icons });
  }

  private addGoal() {
    const nameInput = document.getElementById('goal-name') as HTMLInputElement;
    const targetInput = document.getElementById('goal-target') as HTMLInputElement;
    const deadlineInput = document.getElementById('goal-deadline') as HTMLInputElement;

    const name = nameInput.value;
    const target = this.parseFormattedNumber(targetInput.value);
    const deadline = deadlineInput.value;

    if (!name || isNaN(target) || !deadline) return;

    const goal: Goal = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      target,
      current: 0,
      deadline
    };

    this.goals.push(goal);
    this.saveData();
    this.renderGoals();
    this.closeModals();
    
    // Reset form
    nameInput.value = '';
    targetInput.value = '';
    deadlineInput.value = '';
  }

  private addTransaction() {
    const descInput = document.getElementById('desc') as HTMLInputElement;
    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const typeInput = document.getElementById('type') as HTMLInputElement;
    const categorySelect = document.getElementById('category') as HTMLSelectElement;

    const desc = descInput.value;
    const amount = this.parseFormattedNumber(amountInput.value);
    const type = typeInput.value as 'income' | 'expense';
    const category = categorySelect.value;

    if (!desc || isNaN(amount) || amount <= 0) return;

    const transaction: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      description: desc,
      amount,
      type,
      category,
      date: new Date().toISOString()
    };

    this.transactions.unshift(transaction);
    this.saveData();
    this.render();
    this.formEl.reset();
    (this as any).updateTypeToggle('expense');
    
    // Success feedback
    const btn = this.formEl.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = btn.textContent;
    btn.textContent = 'Đã lưu!';
    btn.classList.replace('bg-orange-600', 'bg-slate-900');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.replace('bg-slate-900', 'bg-orange-600');
    }, 1500);
  }

  private checkBudgetAlert() {
    const totalExpense = this.transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
      .reduce((acc, t) => acc + t.amount, 0);

    const percent = (totalExpense / this.monthlyBudget) * 100;
    if (percent > 90) {
      this.showToast('Cảnh báo: Bạn đã tiêu quá 90% ngân sách tháng này!', 'error');
    } else if (percent > 70) {
      this.showToast('Lưu ý: Bạn đã tiêu quá 70% ngân sách tháng này.', 'warning');
    }
  }

  private checkCategoryBudgetAlert(category: string) {
    const budget = this.categoryBudgets[category];
    if (!budget || budget <= 0) return;

    const totalExpense = this.transactions
      .filter(t => t.type === 'expense' && t.category === category && new Date(t.date).getMonth() === new Date().getMonth())
      .reduce((acc, t) => acc + t.amount, 0);

    if (totalExpense > budget) {
      this.showToast(`Cảnh báo: Bạn đã vượt ngân sách cho danh mục "${category}"!`, 'error');
    } else if (totalExpense > budget * 0.8) {
      this.showToast(`Lưu ý: Bạn đã tiêu hơn 80% ngân sách cho "${category}".`, 'warning');
    }
  }

  public deleteTransaction(id: string) {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('opacity-0', '-translate-x-8');
      setTimeout(() => {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveData();
        this.render();
      }, 300);
    } else {
      this.transactions = this.transactions.filter(t => t.id !== id);
      this.saveData();
      this.render();
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  }

  private setupBudgetEvents() {
    document.getElementById('manage-budget-btn')?.addEventListener('click', () => {
      this.budgetModal.classList.remove('hidden');
      this.populateBudgetCategorySelect();
    });

    document.getElementById('close-budget-modal')?.addEventListener('click', () => {
      this.budgetModal.classList.add('hidden');
    });

    this.budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const category = (document.getElementById('budget-category') as HTMLSelectElement).value;
      const amountStr = (document.getElementById('budget-amount') as HTMLInputElement).value;
      const amount = parseInt(amountStr.replace(/\D/g, '')) || 0;

      if (amount > 0) {
        this.categoryBudgets[category] = amount;
        this.saveData();
        this.render();
        this.budgetModal.classList.add('hidden');
        this.budgetForm.reset();
        this.showToast(`Đã thiết lập ngân sách cho ${category}`, 'success');
      }
    });

    const budgetAmountInput = document.getElementById('budget-amount') as HTMLInputElement;
    budgetAmountInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = target.value.replace(/\D/g, '');
      target.value = value ? parseInt(value).toLocaleString('vi-VN') : '';
    });
  }

  private populateBudgetCategorySelect() {
    const select = document.getElementById('budget-category') as HTMLSelectElement;
    if (select) {
      select.innerHTML = this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    const container = document.getElementById('toast-container')!;
    if (!container) return;
    
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-500',
      error: 'bg-rose-500',
      warning: 'bg-orange-500'
    };
    const iconsMap = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle'
    };

    toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300 z-[100]`;
    toast.innerHTML = `
      <i data-lucide="${iconsMap[type]}" class="w-5 h-5"></i>
      <p class="font-bold text-sm">${message}</p>
    `;
    container.appendChild(toast);
    createIcons({ icons });

    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-full');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  private render(skipAlerts: boolean = false) {
    this.renderSummary();
    this.renderList();
    this.renderChart();
    this.renderTrendChart();
    this.renderGoals();
    this.renderBudget();
    this.renderCategoryBudgets();
    if (!skipAlerts) {
      this.checkBudgets();
    }
    createIcons({ icons });
  }

  private checkBudgets() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    Object.entries(this.categoryBudgets).forEach(([category, amount]) => {
      const spent = this.transactions
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && t.category === category && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = (spent / amount) * 100;
      if (percent >= 100) {
        this.showToast(`Cảnh báo: Bạn đã vượt quá ngân sách cho ${category}!`, 'error');
      } else if (percent >= 80) {
        this.showToast(`Lưu ý: Bạn đã sử dụng ${Math.round(percent)}% ngân sách cho ${category}`, 'warning');
      }
    });
  }

  private renderCategoryBudgets() {
    if (!this.budgetListEl) return;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const budgetEntries = Object.entries(this.categoryBudgets);

    if (budgetEntries.length === 0) {
      this.budgetListEl.innerHTML = `
        <div class="py-4 text-center text-slate-400 text-xs font-medium">Chưa có ngân sách nào được thiết lập</div>
      `;
      return;
    }

    this.budgetListEl.innerHTML = budgetEntries.map(([category, amount]) => {
      const spent = this.transactions
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && t.category === category && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percent = Math.min((spent / amount) * 100, 100);
      const colorClass = percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-orange-500' : 'bg-emerald-500';

      return `
        <div class="space-y-2">
          <div class="flex justify-between items-end">
            <div>
              <p class="text-sm font-bold text-slate-900 dark:text-white">${category}</p>
              <p class="text-[10px] text-slate-400 font-medium">Đã dùng ${this.formatCurrency(spent)} / ${this.formatCurrency(amount)}</p>
            </div>
            <p class="text-xs font-black ${percent > 90 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}">${Math.round((spent / amount) * 100)}%</p>
          </div>
          <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full ${colorClass} transition-all duration-1000" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  private getCurrentBalance(): number {
    const income = this.transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = this.transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    return income - expense;
  }

  public formatInput(input: HTMLInputElement) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
      input.value = '';
      return;
    }
    input.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
  }

  public parseFormattedNumber(value: string): number {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }

  private renderSummary() {
    const income = this.transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const expense = this.transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;
    const safeToSpend = this.calculateSafeToSpend(balance);

    this.balanceEl.textContent = this.formatCurrency(balance);
    this.incomeEl.textContent = `+${this.formatCurrency(income)}`;
    this.expenseEl.textContent = `-${this.formatCurrency(expense)}`;
    
    const safeToSpendEl = document.querySelector('.text-orange-400.text-xs.font-medium span')!;
    if (safeToSpendEl) safeToSpendEl.textContent = `Hôm nay nên tiêu dưới ${this.formatCurrency(safeToSpend)}`;

    if (this.isIncognito) {
      [this.balanceEl, this.incomeEl, this.expenseEl, safeToSpendEl].forEach(el => el?.classList.add('incognito-blur'));
    }
  }

  private calculateSafeToSpend(balance: number): number {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1;
    
    const monthlyExpense = this.transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth())
      .reduce((acc, t) => acc + t.amount, 0);
    
    const remainingBudget = Math.max(0, this.monthlyBudget - monthlyExpense);
    return remainingBudget / daysLeft;
  }

  private renderBudget() {
    const totalExpense = this.transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
      .reduce((acc, t) => acc + t.amount, 0);

    const percent = Math.min(Math.round((totalExpense / this.monthlyBudget) * 100), 100);
    this.budgetPercent.textContent = `${percent}%`;
    this.budgetProgress.style.width = `${percent}%`;

    if (percent > 90) {
      this.budgetProgress.classList.replace('bg-orange-500', 'bg-rose-500');
      this.budgetWarning.textContent = 'Rủi ro cao! Hãy thắt chặt chi tiêu.';
      this.budgetWarning.className = 'text-[10px] font-medium text-rose-500 italic';
    } else if (percent > 70) {
      this.budgetProgress.classList.replace('bg-orange-500', 'bg-amber-500');
      this.budgetWarning.textContent = 'Sắp đạt giới hạn ngân sách.';
      this.budgetWarning.className = 'text-[10px] font-medium text-amber-500 italic';
    } else {
      this.budgetProgress.className = 'h-full bg-orange-500 transition-all duration-500';
      this.budgetWarning.textContent = 'Bạn đang chi tiêu trong tầm kiểm soát.';
      this.budgetWarning.className = 'text-[10px] font-medium text-green-500 italic';
    }
  }

  private renderGoals() {
    if (this.goals.length === 0) {
      this.goalsList.innerHTML = `<p class="text-xs text-slate-400 italic">Chưa có mục tiêu nào.</p>`;
      return;
    }

    this.goalsList.innerHTML = this.goals.map(g => {
      const progress = Math.min(Math.round((g.current / g.target) * 100), 100);
      return `
        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-orange-200 dark:hover:border-orange-900/30 transition-all group/goal">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">${g.name}</h4>
              <p class="text-[10px] font-medium text-slate-400">Hạn: ${new Date(g.deadline).toLocaleDateString('vi-VN')}</p>
            </div>
            <button onclick="window.expenseManager.openContributeModal('${g.id}')" class="p-2 bg-white dark:bg-slate-900 text-orange-600 rounded-xl shadow-sm hover:shadow-md hover:scale-110 transition-all">
              <i data-lucide="piggy-bank" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="space-y-2">
            <div class="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000" style="width: ${progress}%"></div>
            </div>
            <div class="flex justify-between text-[10px] font-black">
              <div class="flex flex-col">
                <span class="text-orange-600">${progress}%</span>
                <span class="text-slate-400 font-medium">Đã đạt</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-slate-900 dark:text-white">${this.formatCurrency(g.target)}</span>
                <span class="text-slate-400 font-medium">Mục tiêu</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    createIcons({ icons });
  }

  public openContributeModal(id: string) {
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return;

    const overlay = document.getElementById('modal-overlay')!;
    const contributeModal = document.getElementById('contribute-modal')!;
    
    // Set goal context
    contributeModal.setAttribute('data-goal-id', id);
    document.getElementById('contribute-goal-name')!.textContent = goal.name;
    
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    contributeModal.classList.remove('hidden');
  }

  private contributeToGoal() {
    const contributeModal = document.getElementById('contribute-modal')!;
    const id = contributeModal.getAttribute('data-goal-id');
    const amountInput = document.getElementById('contribute-amount') as HTMLInputElement;
    const amount = this.parseFormattedNumber(amountInput.value);

    if (!id || isNaN(amount) || amount <= 0) return;

    const currentBalance = this.getCurrentBalance();
    if (amount > currentBalance) {
      this.showToast('Số dư không đủ để góp quỹ!', 'error');
      return;
    }

    const goalIndex = this.goals.findIndex(g => g.id === id);
    if (goalIndex !== -1) {
      this.goals[goalIndex].current += amount;
      
      // Also add as an expense to reflect in balance
      const transaction: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        description: `Tiết kiệm cho: ${this.goals[goalIndex].name}`,
        amount,
        type: 'expense',
        category: 'Khác',
        date: new Date().toISOString()
      };
      this.transactions.unshift(transaction);
      
      this.saveData();
      this.render();
      this.closeModals();
      amountInput.value = '';
      
      if (this.goals[goalIndex].current >= this.goals[goalIndex].target) {
        this.showToast(`Chúc mừng! Bạn đã hoàn thành ước mơ "${this.goals[goalIndex].name}"!`, 'warning');
      } else {
        this.showToast(`Đã thêm ${this.formatCurrency(amount)} vào mục tiêu!`, 'warning');
      }
    }
  }

  private getFilteredTransactions(): Transaction[] {
    const searchTerm = this.searchInput.value.toLowerCase();
    const catFilter = this.filterCategory.value;

    let filtered = this.transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm) || t.category.toLowerCase().includes(searchTerm);
      const matchesCat = catFilter === 'all' || t.category === catFilter;
      
      let matchesDate = true;
      if (this.dateFrom) {
        matchesDate = matchesDate && new Date(t.date) >= new Date(this.dateFrom);
      }
      if (this.dateTo) {
        const toDate = new Date(this.dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(t.date) <= toDate;
      }

      return matchesSearch && matchesCat && matchesDate;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        case 'category': return a.category.localeCompare(b.category);
        default: return 0;
      }
    });

    return filtered;
  }

  private renderList() {
    const filtered = this.getFilteredTransactions();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    
    if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;
    if (totalPages === 0) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const paginated = filtered.slice(start, end);

    // Update Pagination Info
    const infoEl = document.getElementById('pagination-info')!;
    if (totalItems > 0) {
      infoEl.textContent = `Hiển thị ${start + 1} - ${Math.min(end, totalItems)} của ${totalItems} giao dịch`;
    } else {
      infoEl.textContent = `Không có giao dịch nào`;
    }

    // Update Page Numbers
    const pageNumbersEl = document.getElementById('page-numbers')!;
    pageNumbersEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        const btn = document.createElement('button');
        btn.className = `w-8 h-8 rounded-lg text-xs font-bold transition-all ${i === this.currentPage ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400'}`;
        btn.textContent = i.toString();
        btn.onclick = () => {
          this.currentPage = i;
          this.renderList();
        };
        pageNumbersEl.appendChild(btn);
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        const span = document.createElement('span');
        span.className = 'text-slate-300 px-1';
        span.textContent = '...';
        pageNumbersEl.appendChild(span);
      }
    }

    // Update Prev/Next buttons
    (document.getElementById('prev-page') as HTMLButtonElement).disabled = this.currentPage === 1;
    (document.getElementById('next-page') as HTMLButtonElement).disabled = this.currentPage === totalPages || totalPages === 0;

    if (paginated.length === 0) {
      this.listEl.innerHTML = `
        <div class="py-20 text-center text-slate-300 animate-in fade-in duration-700">
          <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <i data-lucide="search-x" class="w-10 h-10 opacity-20"></i>
          </div>
          <p class="font-medium text-slate-400">Không tìm thấy giao dịch nào...</p>
        </div>
      `;
      createIcons({ icons });
      return;
    }

    this.listEl.innerHTML = paginated.map((t, index) => {
      const categoryObj = this.categories.find(c => c.name === t.category) || { icon: 'tag', color: '#64748b' };
      return `
      <div data-id="${t.id}" class="p-6 flex items-center justify-between hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all group animate-in slide-in-from-bottom-4 fade-in duration-500" style="animation-delay: ${index * 30}ms">
        <div class="flex items-center gap-5">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style="background-color: ${categoryObj.color}15; color: ${categoryObj.color}">
            <i data-lucide="${categoryObj.icon}" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">${t.description}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style="background-color: ${categoryObj.color}15; color: ${categoryObj.color}">${t.category}</span>
              <span class="text-[10px] font-medium text-slate-400">${new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <p class="font-black text-lg balance-value ${t.type === 'income' ? 'text-green-600' : 'text-rose-600'}">
            ${t.type === 'income' ? '+' : '-'}${this.formatCurrency(t.amount)}
          </p>
          <button onclick="window.expenseManager.deleteTransaction('${t.id}')" class="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all rounded-xl opacity-0 group-hover:opacity-100">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `}).join('');
    
    if (this.isIncognito) {
      document.querySelectorAll('.balance-value').forEach(el => el.classList.add('incognito-blur'));
    }
    createIcons({ icons });
  }

  private renderChart() {
    const expenses = this.transactions.filter(t => t.type === 'expense');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (expenses.length === 0) {
      this.chartContainer.innerHTML = `
        <div id="no-data-chart" class="flex flex-col items-center text-slate-300 animate-in fade-in duration-1000">
          <i data-lucide="pie-chart" class="w-16 h-16 mb-4 opacity-20"></i>
          <p class="italic text-sm">Chưa có dữ liệu để phân tích</p>
        </div>
      `;
      return;
    }

    this.chartContainer.innerHTML = '';
    const categoryData = d3.rollups(
      expenses,
      v => d3.sum(v, d => d.amount),
      d => d.category
    ).map(([name, value]) => ({ name, value }));

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(this.chartContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const colors = [
      '#f97316', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
    ];

    const color = d3.scaleOrdinal<string>()
      .domain(categoryData.map(d => d.name))
      .range(colors);

    const pie = d3.pie<{ name: string; value: number }>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
      .innerRadius(radius * 0.65)
      .outerRadius(radius * 0.95)
      .cornerRadius(12)
      .padAngle(0.04);

    const arcHover = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 1.0)
      .cornerRadius(15)
      .padAngle(0.05);

    const arcs = svg.selectAll('arc')
      .data(pie(categoryData))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('fill', d => color(d.data.name))
      .attr('d', arc)
      .style('opacity', 0.8)
      .attr('class', 'cursor-pointer transition-all duration-500')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(500)
          .attr('d', arcHover)
          .style('opacity', 1)
          .attr('filter', 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(500)
          .attr('d', arc)
          .style('opacity', 0.8)
          .attr('filter', 'none');
      })
      .transition()
      .duration(1000)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) { return arc(i(t))!; };
      });

    const totalExpense = d3.sum(categoryData, d => d.value);

    // Add labels for better observation
    const labelArc = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    arcs.append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .attr('class', `text-[9px] font-bold ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`)
      .attr('text-anchor', d => (d.endAngle + d.startAngle) / 2 > Math.PI ? 'end' : 'start')
      .text(d => {
        const percent = (d.data.value / totalExpense) * 100;
        return percent > 5 ? `${d.data.name} (${percent.toFixed(0)}%)` : '';
      })
      .style('opacity', 0)
      .transition()
      .delay(1000)
      .duration(500)
      .style('opacity', 1);

    const centerGroup = svg.append('g').attr('class', 'pointer-events-none');
    
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.8em')
      .attr('class', `text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'fill-slate-500' : 'fill-slate-400'}`)
      .text('Chi tiêu');
    
    centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.6em')
      .attr('class', `text-xl font-black tracking-tight ${isDark ? 'fill-white' : 'fill-slate-900'}`)
      .text(this.formatCurrency(totalExpense));
  }

  private renderTrendChart() {
    const expenses = this.transactions.filter(t => t.type === 'expense');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (expenses.length === 0) {
      this.trendChartContainer.innerHTML = `<p class="text-xs text-slate-400 italic">Chưa đủ dữ liệu xu hướng</p>`;
      return;
    }

    this.trendChartContainer.innerHTML = '';
    
    // Group by date
    const dailyData = d3.rollups(
      expenses,
      v => d3.sum(v, d => d.amount),
      d => new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    ).map(([date, value]) => ({ date, value }))
     .sort((a, b) => {
       const [da, ma] = a.date.split('/').map(Number);
       const [db, mb] = b.date.split('/').map(Number);
       return ma !== mb ? ma - mb : da - db;
     });

    const width = this.trendChartContainer.clientWidth || 300;
    const height = 200;
    const margin = { top: 30, right: 30, bottom: 40, left: 60 };

    const svg = d3.select(this.trendChartContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
      .domain(dailyData.map(d => d.date))
      .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, (d3.max(dailyData, d => d.value) || 0) * 1.2])
      .range([height - margin.top - margin.bottom, 0]);

    // Add gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'trend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f97316')
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f97316')
      .attr('stop-opacity', 0);

    // Add area
    const area = d3.area<{ date: string; value: number }>()
      .x(d => x(d.date)!)
      .y0(height - margin.top - margin.bottom)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(dailyData)
      .attr('fill', 'url(#trend-gradient)')
      .attr('d', area)
      .style('opacity', 0)
      .transition()
      .duration(1500)
      .style('opacity', 1);

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid opacity-5')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(-(height - margin.top - margin.bottom)).tickFormat(() => ''));

    svg.append('g')
      .attr('class', 'grid opacity-5')
      .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(() => ''));

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr('class', `text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`)
      .selectAll('text')
      .attr('fill', isDark ? '#64748b' : '#94a3b8');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(Number(d) / 1000).toFixed(0)}k`))
      .attr('class', `text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`)
      .selectAll('text')
      .attr('fill', isDark ? '#64748b' : '#94a3b8');

    // Add line
    const line = d3.line<{ date: string; value: number }>()
      .x(d => x(d.date)!)
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const path = svg.append('path')
      .datum(dailyData)
      .attr('fill', 'none')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    // Line animation
    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path.attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeExpOut)
      .attr('stroke-dashoffset', 0);

    // Add dots with animation
    svg.selectAll('dot')
      .data(dailyData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.date)!)
      .attr('cy', d => y(d.value))
      .attr('r', 0)
      .attr('fill', '#f97316')
      .attr('stroke', isDark ? '#0f172a' : '#fff')
      .attr('stroke-width', 2)
      .attr('class', 'hover:r-8 transition-all cursor-pointer')
      .transition()
      .delay((d, i) => i * 100 + 1000)
      .duration(500)
      .attr('r', 5);

    // Add value labels on trend chart
    svg.selectAll('text-value')
      .data(dailyData)
      .enter()
      .append('text')
      .attr('x', d => x(d.date)!)
      .attr('y', d => y(d.value) - 15)
      .attr('text-anchor', 'middle')
      .attr('class', `text-[8px] font-black ${isDark ? 'fill-orange-400' : 'fill-orange-600'}`)
      .text(d => `${(d.value / 1000).toFixed(0)}k`)
      .style('opacity', 0)
      .transition()
      .delay((d, i) => i * 100 + 1500)
      .duration(500)
      .style('opacity', 1);
  }

  private async getAIAdvice() {
    this.aiAdviceContainer.innerHTML = `<p class="text-sm opacity-90 italic animate-pulse">Đang phân tích thói quen của bạn...</p>`;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Dựa trên lịch sử giao dịch sau, hãy phân tích và đưa ra:
        1. 3 lời khuyên tài chính ngắn gọn (dưới 15 từ mỗi câu).
        2. Một dự báo vui về ngày bạn sẽ "viêm màng túi" nếu không thay đổi.
        3. Một gợi ý cụ thể để cắt giảm chi tiêu dựa trên danh mục bạn tiêu nhiều nhất.
        
        Dữ liệu: ${JSON.stringify(this.transactions.slice(0, 30))}
        Số dư hiện tại: ${this.balanceEl.textContent}
        Ngân sách tháng: ${this.formatCurrency(this.monthlyBudget)}`,
        config: {
          systemInstruction: "Bạn là Song Tử, một chuyên gia tài chính hóm hỉnh và sắc sảo. Hãy trả lời bằng tiếng Việt, sử dụng các icon phù hợp. Định dạng câu trả lời rõ ràng với các gạch đầu dòng.",
        }
      });

      const response = await model;
      const text = response.text;
      
      this.aiAdviceContainer.innerHTML = `
        <div class="text-sm opacity-95 leading-relaxed space-y-3">
          ${text?.split('\n').filter(line => line.trim()).map(line => `
            <div class="flex gap-2">
              <span class="text-white/50">•</span>
              <p>${line.replace(/^\*|\-|\d\./, '').trim()}</p>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('AI Error:', error);
      this.aiAdviceContainer.innerHTML = `<p class="text-sm opacity-90 italic">Không thể kết nối với Song Tử lúc này. Hãy thử lại sau!</p>`;
    }
  }

  private addMockData() {
    const mockData: Transaction[] = [
      { id: '1', description: 'Lương tháng 3', amount: 25000000, type: 'income', category: 'Lương', date: '2026-03-01T08:00:00Z' },
      { id: '2', description: 'Ăn tối Sushi', amount: 850000, type: 'expense', category: 'Ăn uống', date: '2026-03-05T19:30:00Z' },
      { id: '3', description: 'Tiền nhà', amount: 5000000, type: 'expense', category: 'Nhà cửa', date: '2026-03-02T10:00:00Z' },
      { id: '4', description: 'Mua sắm Shopee', amount: 1200000, type: 'expense', category: 'Mua sắm', date: '2026-03-10T14:20:00Z' },
      { id: '5', description: 'Đổ xăng', amount: 500000, type: 'expense', category: 'Di chuyển', date: '2026-03-12T09:00:00Z' },
      { id: '6', description: 'Thưởng dự án', amount: 3000000, type: 'income', category: 'Lương', date: '2026-03-15T16:00:00Z' },
    ];
    this.transactions = mockData;
    this.saveData();
  }
}

declare global {
  interface Window {
    expenseManager: ExpenseManager;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.expenseManager = new ExpenseManager();
});
