import * as d3 from 'd3';
import { createIcons, icons } from 'lucide';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import './index.css';
import './ai/ai_chat.css';
import './ai/ai_chat.js';
import { GoogleGenAI } from '@google/genai';
import { handleRegister } from './auth/register';
import { handleLogin, handleForgotPassword, handleResetPasswordClick } from './auth/login';
import { initResetPasswordPage, setupResetPasswordListeners } from './auth/reset-password';
import { showForgotTab, showLoginTab, showResetTab } from './auth/ui-logic';

const backendOrigin = (import.meta.env.VITE_BACKEND_URL as string) || (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:8000';
const sharedFundApiBase = `${backendOrigin.replace(/\/$/, '')}/api/shared-fund/`;

function updateSharedFundLinks() {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[data-shared-fund-link]');
    links.forEach((link) => {
        link.href = `${backendOrigin.replace(/\/$/, '')}/shared-fund/`;
    });
}

function getSharedFundHeaders(isJson = true) {
  const token = localStorage.getItem('accessToken') || '';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) {
    headers['Authorization'] = token.startsWith('Token ') || token.startsWith('Bearer ') ? token : `Token ${token}`;
  }
  return headers;
}

function showSharedFundNotice(message: string, type: 'success' | 'error' | 'info' = 'success') {
  const notice = document.getElementById('shared-fund-notice');
  if (!notice) return;
  notice.textContent = message;
  notice.className = `mt-6 rounded-3xl p-4 text-sm ${type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200' : type === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`;
  notice.classList.remove('hidden');
  window.setTimeout(() => notice.classList.add('hidden'), 4500);
}

let currentSharedFundId: number | null = null;
let currentSharedFundMembers: any[] = [];

// Notifications
let currentInvitations: any[] = [];
let invitationPollingInterval: any = null;
let lastInvitationCount: number = 0;

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Notifications functions
async function loadInvitations() {
  try {
    const invitations = await fetchSharedFundData('invitations/', { method: 'GET' });
    currentInvitations = invitations;
    updateNotificationBadge();
    
    // If there's a new invitation and modal is open, update it
    if (invitations.length > lastInvitationCount) {
      const modal = document.getElementById('notifications-modal');
      if (modal && !modal.classList.contains('hidden')) {
        renderNotificationsModal();
      }
    }
    lastInvitationCount = invitations.length;
    
    return invitations;
  } catch (error) {
    console.warn('Failed to load invitations:', error);
    return [];
  }
}

function startInvitationPolling() {
  if (invitationPollingInterval) {
    console.warn('Invitation polling already running');
    return;
  }
  
  console.log('Starting invitation polling (every 3 seconds)');
  invitationPollingInterval = setInterval(async () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      await loadInvitations();
    }
  }, 3000); // Poll every 3 seconds
}

function stopInvitationPolling() {
  if (invitationPollingInterval) {
    console.log('Stopping invitation polling');
    clearInterval(invitationPollingInterval);
    invitationPollingInterval = null;
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  const count = currentInvitations.length;
  if (badge) {
    badge.textContent = count.toString();
    badge.classList.toggle('hidden', count === 0);
  }
}

function renderNotificationsModal() {
  const list = document.getElementById('notifications-list');
  const noNotifications = document.getElementById('no-notifications');
  if (!list || !noNotifications) return;

  if (currentInvitations.length === 0) {
    list.innerHTML = '';
    noNotifications.classList.remove('hidden');
    return;
  }

  noNotifications.classList.add('hidden');
  list.innerHTML = currentInvitations.map(invitation => `
    <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <p class="text-sm font-bold text-slate-900 dark:text-white">
            Lời mời tham gia quỹ: ${invitation.fund_name}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Từ: ${invitation.inviter_name} • ${new Date(invitation.created_at).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <div class="flex gap-2">
          <button class="accept-invitation-btn px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors" data-invitation-id="${invitation.id}">
            Chấp nhận
          </button>
          <button class="reject-invitation-btn px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors" data-invitation-id="${invitation.id}">
            Từ chối
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.accept-invitation-btn').forEach(btn => {
    btn.addEventListener('click', handleAcceptInvitation);
  });
  document.querySelectorAll('.reject-invitation-btn').forEach(btn => {
    btn.addEventListener('click', handleRejectInvitation);
  });
}

async function handleAcceptInvitation(event: Event) {
  const button = event.target as HTMLButtonElement;
  const invitationId = button.getAttribute('data-invitation-id');
  if (!invitationId) return;

  try {
    await fetchSharedFundData(`invitations/${invitationId}/accept/`, { method: 'POST' });
    showSharedFundNotice('Đã chấp nhận lời mời tham gia quỹ.', 'success');
    await loadInvitations();
    renderNotificationsModal();
    await loadSharedFunds();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi chấp nhận lời mời.';
    showSharedFundNotice(message, 'error');
  }
}

async function handleRejectInvitation(event: Event) {
  const button = event.target as HTMLButtonElement;
  const invitationId = button.getAttribute('data-invitation-id');
  if (!invitationId) return;

  try {
    await fetchSharedFundData(`invitations/${invitationId}/reject/`, { method: 'POST' });
    showSharedFundNotice('Đã từ chối lời mời tham gia quỹ.', 'success');
    await loadInvitations();
    renderNotificationsModal();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi từ chối lời mời.';
    showSharedFundNotice(message, 'error');
  }
}

function scrollToSharedFundSection() {
  const section = document.getElementById('shared-fund-section');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function fetchSharedFundData(path: string, options: RequestInit = {}) {
  const request = await fetch(`${sharedFundApiBase}${path}`, {
    credentials: 'include',
    headers: getSharedFundHeaders(Boolean(options.body === undefined ? true : options.body)),
    ...options,
  });

  const contentType = request.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await request.json() : await request.text();

  if (!request.ok) {
    const message = payload?.detail || payload?.message || request.statusText || 'Lỗi khi kết nối quỹ chung.';
    throw new Error(message);
  }
  return payload;
}

function renderSharedFundSummary(funds: any[]) {
  const countEl = document.getElementById('shared-fund-count');
  const membersEl = document.getElementById('shared-fund-members');
  const totalEl = document.getElementById('shared-fund-total');
  if (countEl) countEl.textContent = `${funds.length}`;
  if (membersEl) {
    const memberCount = funds.reduce((total, fund) => total + (fund.member_count || 0), 0);
    membersEl.textContent = `${memberCount}`;
  }
  if (totalEl) totalEl.textContent = `${funds.length > 0 ? 'Hoạt động' : 'Chưa có'}`;
}

function renderSharedFundList(funds: any[]) {
  const list = document.getElementById('shared-fund-list');
  if (!list) return;
  if (!funds || funds.length === 0) {
    list.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có quỹ chung nào. Tạo quỹ mới để bắt đầu.</p>';
    renderSharedFundSummary([]);
    return;
  }

  list.innerHTML = funds.map((fund) => `
    <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h5 class="text-base font-bold text-slate-900 dark:text-white">${fund.name}</h5>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${fund.description || 'Chưa có mô tả'}</p>
        </div>
        <span class="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">${fund.member_count || 0} thành viên</span>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div>
          <p class="font-semibold text-slate-900 dark:text-white">${fund.owner}</p>
          <p>Chủ quỹ</p>
        </div>
        <div>
          <p class="font-semibold text-slate-900 dark:text-white">${new Date(fund.updated_at).toLocaleDateString('vi-VN')}</p>
          <p>Cập nhật</p>
        </div>
      </div>
    </div>
  `).join('');
  renderSharedFundSummary(funds);
}

async function loadSharedFunds(): Promise<any[]> {
  const list = document.getElementById('shared-fund-list');
  if (list) {
    list.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách quỹ...</p>';
  }

  try {
    const funds = await fetchSharedFundData('funds/', { method: 'GET' });
    renderSharedFundList(funds);
    setSharedFundSelectOptions(funds);
    return funds;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    if (list) {
      list.innerHTML = `<p class="text-sm text-rose-600 dark:text-rose-300">${message}</p>`;
    }
    showSharedFundNotice(message, 'error');
    return [];
  }
}

function setSharedFundSelectOptions(funds: any[]) {
  const select = document.getElementById('shared-fund-select') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '<option value="">-- Chọn quỹ --</option>' + funds.map(fund => `
      <option value="${fund.id}">${fund.name}</option>
    `).join('');
}

function renderSelectedFundSummary(fund: any) {
  const nameEl = document.getElementById('selected-fund-name');
  const ownerEl = document.getElementById('selected-fund-owner');
  const membersEl = document.getElementById('selected-fund-members');
  const updatedEl = document.getElementById('selected-fund-updated');
  const expenseCountEl = document.getElementById('selected-fund-expense-count');
  const balanceSummaryEl = document.getElementById('selected-fund-balance-summary');

  if (nameEl) nameEl.textContent = fund.name || 'Chưa chọn';
  if (ownerEl) ownerEl.textContent = fund.owner || '-';
  if (membersEl) membersEl.textContent = `${fund.member_count || 0}`;
  if (updatedEl) updatedEl.textContent = fund.updated_at ? new Date(fund.updated_at).toLocaleDateString('vi-VN') : '-';
  if (expenseCountEl) expenseCountEl.textContent = `${fund.expense_count || 0}`;
  if (balanceSummaryEl) balanceSummaryEl.textContent = fund.balance_summary || '0đ';
}

function setSharedFundMemberSelectors(members: any[]) {
  currentSharedFundMembers = members;
  const expenseSelect = document.getElementById('shared-fund-expense-members') as HTMLSelectElement | null;
  const settlementSelect = document.getElementById('shared-fund-settlement-to') as HTMLSelectElement | null;

  const options = members.map(member => `
    <option value="${member.user_id}">${member.user} (${member.role})</option>
  `).join('');

  if (expenseSelect) {
    expenseSelect.innerHTML = options;
    renderExpenseSplitDetails();
  }
  if (settlementSelect) settlementSelect.innerHTML = options;
}

function renderExpenseSplitDetails() {
  const splitTypeSelect = document.getElementById('shared-fund-expense-split-type') as HTMLSelectElement | null;
  const membersSelect = document.getElementById('shared-fund-expense-members') as HTMLSelectElement | null;
  const splitDetails = document.getElementById('shared-fund-split-details');
  if (!splitTypeSelect || !membersSelect || !splitDetails) return;

  const splitType = splitTypeSelect.value;
  const selectedMembers = Array.from(membersSelect.selectedOptions).map(option => ({
    user_id: Number(option.value),
    label: option.text,
  }));

  if (splitType === 'equal') {
    splitDetails.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Hệ thống sẽ tự động chia đều chi phí cho các thành viên đã chọn.</p>';
    return;
  }

  if (!selectedMembers.length) {
    splitDetails.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chọn thành viên để nhập chi tiết chia.</p>';
    return;
  }

  const label = splitType === 'percentage' ? 'Phần trăm (%)' : 'Số tiền (đ)';
  const placeholder = splitType === 'percentage' ? '0.0' : '0';

  splitDetails.innerHTML = `
    <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
      ${splitType === 'percentage' ? 'Nhập tỷ lệ phần trăm cho mỗi thành viên:' : 'Nhập số tiền chia cho mỗi thành viên:'}
    </p>
    <div class="space-y-3">
      ${selectedMembers.map(member => `
        <div class="grid grid-cols-[1fr_120px] gap-3 items-center">
          <div class="text-sm text-slate-900 dark:text-slate-100">${member.label}</div>
          <input
            type="number"
            step="0.01"
            min="0"
            data-split-user-id="${member.user_id}"
            placeholder="${placeholder}"
            class="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
      `).join('')}
    </div>
  `;
}

function renderSharedFundExpenses(expenses: any[]) {
  const container = document.getElementById('shared-fund-expenses-list');
  if (!container) return;
  if (!expenses.length) {
    container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có chi tiêu nào.</p>';
    return;
  }
  container.innerHTML = expenses.map(expense => `
      <div class="rounded-3xl bg-slate-100 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">${expense.description || 'Chi tiêu nhóm'}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${new Date(expense.date).toLocaleDateString('vi-VN')} • ${expense.created_by || 'Người dùng'}</p>
          </div>
          <p class="font-bold text-slate-900 dark:text-white">${Number(expense.amount).toLocaleString('vi-VN')}đ</p>
        </div>
      </div>
    `).join('');
}

function renderSharedFundSettlements(settlements: any[]) {
  const container = document.getElementById('shared-fund-settlements-list');
  if (!container) return;
  if (!settlements.length) {
    container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có thanh toán nào.</p>';
    return;
  }
  container.innerHTML = settlements.map(item => `
      <div class="rounded-3xl bg-slate-100 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800">
        <p class="font-semibold text-slate-900 dark:text-white">${item.from_user || 'Bạn'} → ${item.to_user || 'Thành viên'}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
        <p class="mt-2 font-bold text-slate-900 dark:text-white">${Number(item.amount).toLocaleString('vi-VN')}đ</p>
      </div>
    `).join('');
}

function renderSharedFundBalances(balances: any[]) {
  const container = document.getElementById('shared-fund-balances-list');
  if (!container) return;
  if (!balances.length) {
    container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu công nợ.</p>';
    return;
  }
  container.innerHTML = balances.map(item => `
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-4">
        <p class="font-semibold text-slate-900 dark:text-white">${item.username}</p>
        <p class="font-bold ${item.balance < 0 ? 'text-rose-600' : 'text-emerald-600'}">${Number(item.balance).toLocaleString('vi-VN')}đ</p>
      </div>
    `).join('');
}

async function loadSelectedFundDetails(fundId: number) {
  if (!fundId) return;
  currentSharedFundId = fundId;
  try {
    const fund = await fetchSharedFundData(`funds/${fundId}/`, { method: 'GET' });
    renderSelectedFundSummary({
      ...fund,
      expense_count: 0,
      balance_summary: 'Đang tải...',
    });
    setSharedFundMemberSelectors(fund.members || []);
    const [expenses, settlements, balances] = await Promise.all([
      fetchSharedFundData(`expenses/?fund=${fundId}`, { method: 'GET' }).catch(() => []),
      fetchSharedFundData(`settlements/?fund=${fundId}`, { method: 'GET' }).catch(() => []),
      fetchSharedFundData(`funds/${fundId}/balances/`, { method: 'GET' }).catch(() => []),
    ]);

    renderSharedFundExpenses(expenses);
    renderSharedFundSettlements(settlements);
    renderSharedFundBalances(balances);
    renderSelectedFundSummary({
      ...fund,
      expense_count: Array.isArray(expenses) ? expenses.length : 0,
      balance_summary: balances.reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0).toLocaleString('vi-VN') + 'đ',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải chi tiết quỹ.';
    showSharedFundNotice(message, 'error');
  }
}

async function submitSharedFundExpense(event: SubmitEvent) {
  event.preventDefault();
  if (!currentSharedFundId) {
    showSharedFundNotice('Vui lòng chọn quỹ trước khi thêm chi tiêu.', 'error');
    return;
  }
  const descInput = document.getElementById('shared-fund-expense-desc') as HTMLInputElement | null;
  const amountInput = document.getElementById('shared-fund-expense-amount') as HTMLInputElement | null;
  const dateInput = document.getElementById('shared-fund-expense-date') as HTMLInputElement | null;
  const membersSelect = document.getElementById('shared-fund-expense-members') as HTMLSelectElement | null;
  if (!descInput || !amountInput || !dateInput || !membersSelect) return;

  const amount = Number(amountInput.value);
  const description = descInput.value.trim();
  const date = dateInput.value;
  const splitTypeSelect = document.getElementById('shared-fund-expense-split-type') as HTMLSelectElement | null;
  const splitType = splitTypeSelect?.value || 'equal';
  const selected = Array.from(membersSelect.selectedOptions).map(option => Number(option.value));

  if (!amount || amount <= 0) {
    showSharedFundNotice('Số tiền phải lớn hơn 0.', 'error');
    return;
  }
  if (!selected.length) {
    showSharedFundNotice('Vui lòng chọn ít nhất một thành viên.', 'error');
    return;
  }

  let splits: any[] = [];
  if (splitType === 'equal') {
    const roundedShare = Math.floor((amount / selected.length) * 100) / 100;
    splits = selected.map((userId, index) => {
      const remainder = index === selected.length - 1 ? roundToTwo(amount - roundedShare * (selected.length - 1)) : roundedShare;
      return { user: userId, amount_owed: remainder };
    });
  } else {
    const splitInputs = Array.from(document.querySelectorAll<HTMLInputElement>('#shared-fund-split-details input[data-split-user-id]'));
    if (!splitInputs.length) {
      showSharedFundNotice('Vui lòng nhập chi tiết chia cho từng thành viên.', 'error');
      return;
    }
    splits = splitInputs.map(input => {
      const userId = Number(input.dataset.splitUserId);
      const value = Number(input.value);
      if (!userId || value <= 0) {
        throw new Error('Mỗi thành viên phải có giá trị chia hợp lệ.');
      }
      return splitType === 'percentage'
        ? { user: userId, percentage: roundToTwo(value) }
        : { user: userId, amount_owed: roundToTwo(value) };
    });
  }

  const payload = {
    fund: currentSharedFundId,
    amount,
    description,
    date,
    split_type: splitType,
    splits,
  };

  console.log('Expense payload:', payload);

  try {
    await fetchSharedFundData('expenses/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showSharedFundNotice('Chi tiêu đã được ghi nhận.', 'success');
    descInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
    membersSelect.selectedIndex = -1;
    await loadSelectedFundDetails(currentSharedFundId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi ghi chi tiêu.';
    showSharedFundNotice(message, 'error');
  }
}

async function submitSharedFundSettlement(event: SubmitEvent) {
  event.preventDefault();
  if (!currentSharedFundId) {
    showSharedFundNotice('Vui lòng chọn quỹ trước khi thanh toán.', 'error');
    return;
  }
  const toSelect = document.getElementById('shared-fund-settlement-to') as HTMLSelectElement | null;
  const amountInput = document.getElementById('shared-fund-settlement-amount') as HTMLInputElement | null;
  if (!toSelect || !amountInput) return;

  const toUser = Number(toSelect.value);
  const amount = Number(amountInput.value);
  if (!toUser) {
    showSharedFundNotice('Vui lòng chọn người nhận thanh toán.', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showSharedFundNotice('Số tiền phải lớn hơn 0.', 'error');
    return;
  }

  try {
    await fetchSharedFundData('settlements/', {
      method: 'POST',
      body: JSON.stringify({ fund: currentSharedFundId, to_user: toUser, amount }),
    });
    showSharedFundNotice('Thanh toán đã được ghi nhận.', 'success');
    amountInput.value = '';
    await loadSelectedFundDetails(currentSharedFundId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi ghi thanh toán.';
    showSharedFundNotice(message, 'error');
  }
}

async function submitSharedFundInvite(event: SubmitEvent) {
  event.preventDefault();
  if (!currentSharedFundId) {
    showSharedFundNotice('Vui lòng chọn quỹ trước khi mời thành viên.', 'error');
    return;
  }
  const userIdInput = document.getElementById('shared-fund-invite-user-id') as HTMLInputElement | null;
  const roleSelect = document.getElementById('shared-fund-invite-role') as HTMLSelectElement | null;
  if (!userIdInput || !roleSelect) return;

  const userId = Number(userIdInput.value);
  const role = roleSelect.value;
  if (!userId) {
    showSharedFundNotice('Vui lòng nhập user ID.', 'error');
    return;
  }

  try {
    await fetchSharedFundData(`funds/${currentSharedFundId}/invite/`, {
      method: 'POST',
      body: JSON.stringify({ user: userId, role }),
    });
    showSharedFundNotice('Đã gửi lời mời thành viên.', 'success');
    userIdInput.value = '';
    await loadInvitations(); // Reload invitations to update badge
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi mời thành viên.';
    showSharedFundNotice(message, 'error');
  }
}

function toggleSharedFundExpanded() {
  const panel = document.getElementById('shared-fund-expanded-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  const toggleBtn = document.getElementById('shared-fund-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = panel.classList.contains('hidden') ? 'Mở rộng chức năng' : 'Thu gọn chức năng';
  }
}

function bindSharedFundEvents() {
  document.getElementById('shared-fund-create-form')?.addEventListener('submit', createSharedFund);
  document.getElementById('refresh-shared-fund-btn')?.addEventListener('click', () => loadSharedFunds().catch((error) => {
    console.warn('⚠️ Failed to refresh shared fund', error);
  }));
  document.getElementById('shared-fund-toggle-btn')?.addEventListener('click', () => {
    toggleSharedFundExpanded();
    if (!document.getElementById('shared-fund-expanded-panel')?.classList.contains('hidden')) {
      scrollToSharedFundSection();
    }
  });
  document.getElementById('shared-fund-select')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    if (id) {
      loadSelectedFundDetails(id);
    }
  });
  document.getElementById('load-selected-fund-btn')?.addEventListener('click', () => {
    const select = document.getElementById('shared-fund-select') as HTMLSelectElement | null;
    const id = select?.value ? Number(select.value) : null;
    if (id) loadSelectedFundDetails(id);
  });
  document.getElementById('shared-fund-expense-split-type')?.addEventListener('change', renderExpenseSplitDetails);
  document.getElementById('shared-fund-expense-members')?.addEventListener('change', renderExpenseSplitDetails);
  document.getElementById('shared-fund-expense-form')?.addEventListener('submit', submitSharedFundExpense);
  document.getElementById('shared-fund-settlement-form')?.addEventListener('submit', submitSharedFundSettlement);
  document.getElementById('shared-fund-invite-form')?.addEventListener('submit', submitSharedFundInvite);

  // Notifications
  document.getElementById('notifications-btn')?.addEventListener('click', () => {
    renderNotificationsModal();
    document.getElementById('notifications-modal')?.classList.remove('hidden');
  });
  document.getElementById('close-notifications-modal')?.addEventListener('click', () => {
    document.getElementById('notifications-modal')?.classList.add('hidden');
  });
}

async function createSharedFund(event: SubmitEvent) {
  event.preventDefault();
  const nameInput = document.getElementById('shared-fund-name') as HTMLInputElement | null;
  const descriptionInput = document.getElementById('shared-fund-description') as HTMLTextAreaElement | null;
  if (!nameInput || !descriptionInput) return;

  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!name) {
    showSharedFundNotice('Vui lòng nhập tên quỹ.', 'error');
    return;
  }

  try {
    await fetchSharedFundData('funds/', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    showSharedFundNotice('Tạo quỹ thành công.', 'success');
    nameInput.value = '';
    descriptionInput.value = '';
    await loadSharedFunds();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tạo quỹ.';
    showSharedFundNotice(message, 'error');
  }
}

// ============================================
// GLOBAL AUTH UI INITIALIZATION
// ============================================
// This function MUST run BEFORE ExpenseManager is created
// to ensure landing/dashboard views are properly set up

function initAuthUI() {
    console.log("🔐 [GLOBAL] initAuthUI() called");
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const landing = document.getElementById('landing-view');
    const dashboard = document.getElementById('dashboard-view');

    console.log("🔐 [GLOBAL] Auth state:", {
        isLoggedIn,
        landing_exists: !!landing,
        dashboard_exists: !!dashboard
    });

    if (isLoggedIn && landing && dashboard) {
        console.log("✅ [GLOBAL] User is logged in - Hiding landing, showing dashboard");
        // Force hide landing page - use setProperty with 'important' for maximum strength
        landing.style.setProperty('display', 'none', 'important');
        landing.style.setProperty('visibility', 'hidden', 'important');
        landing.classList.add('hidden');
        
        // Force show dashboard
        dashboard.style.setProperty('display', 'flex', 'important');
        dashboard.style.setProperty('visibility', 'visible', 'important');
        dashboard.classList.remove('hidden');
        
        console.log("✅ Dashboard display set to flex, Landing set to none");
    } else {
        console.log("📍 [GLOBAL] User is NOT logged in - Showing landing, hiding dashboard");
        if (landing) {
            landing.style.setProperty('display', 'flex', 'important');
            landing.style.setProperty('visibility', 'visible', 'important');
            landing.classList.remove('hidden');
            console.log("✅ Landing display set to flex");
        }
        if (dashboard) {
            dashboard.style.setProperty('display', 'none', 'important');
            dashboard.style.setProperty('visibility', 'hidden', 'important');
            dashboard.classList.add('hidden');
            console.log("✅ Dashboard display set to none");
        }
    }
}

// Make it global so it can be called from anywhere
(window as any).initAuthUI = initAuthUI;

// ============================================
// HÀM CẬP NHẬT THANH ĐIỀU HƯỚNG (NAVBAR)
// ============================================
// Cập nhật trạng thái hiển thị của các nút đăng nhập/đăng xuất và thông tin người dùng

function updateUserLogo(): void {
    const savedAvatar = localStorage.getItem('userAvatar');
    const username = localStorage.getItem('username') || 'U';
    const userLogo = document.querySelector('#user-btn .bg-orange-500') as HTMLElement | null;

    if (!userLogo) return;

    if (savedAvatar) {
        userLogo.innerHTML = `<img src="${savedAvatar}" class="w-full h-full rounded-xl object-cover">`;
    } else {
        const initials = username.trim().charAt(0).toUpperCase() || 'U';
        userLogo.innerHTML = initials;
    }
}

function updateNavbar(): void {
    console.log("🔘 [GLOBAL] Đang chạy updateNavbar()...");
    
    // Lấy trạng thái đăng nhập từ bộ nhớ
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const username = localStorage.getItem('username');
    
    // Các phần tử DOM
    const loggedOutButtons = document.getElementById('logged-out-buttons');
    const logoutBtn = document.getElementById('dropdown-logout-btn');
    const profileBtn = document.getElementById('dropdown-profile-btn'); // Nút Profile mới
    const userGreeting = document.getElementById('user-greeting');

    console.log("🔘 [GLOBAL] Trạng thái hiện tại:", { isLoggedIn, username });

    if (isLoggedIn) {
        console.log("✅ [GLOBAL] Người dùng đã đăng nhập - Ẩn nút đăng nhập, hiện nút xuất/profile");
        
        // Ẩn nhóm nút Đăng nhập/Đăng ký
        if (loggedOutButtons) {
            loggedOutButtons.style.setProperty('display', 'none', 'important');
            loggedOutButtons.classList.add('hidden');
        }
        
        // Hiện nút Đăng xuất
        if (logoutBtn) {
            logoutBtn.style.setProperty('display', 'flex', 'important');
            logoutBtn.classList.remove('hidden');
        }

        // HIỆN NÚT THÔNG TIN CÁ NHÂN (PROFILE)
        if (profileBtn) {
            profileBtn.style.setProperty('display', 'flex', 'important');
            profileBtn.classList.remove('hidden');
        }
        
        // Cập nhật tên chào mừng
        if (userGreeting && username) {
            userGreeting.textContent = `Chào ${username}!`;
        }

        updateUserLogo();
    } else {
        console.log("📍 [GLOBAL] Người dùng chưa đăng nhập - Hiện nút đăng nhập, ẩn nút xuất/profile");
        
        // Hiện nhóm nút Đăng nhập/Đăng ký
        if (loggedOutButtons) {
            loggedOutButtons.style.setProperty('display', 'flex', 'important');
            loggedOutButtons.classList.remove('hidden');
        }
        
        // Ẩn nút Đăng xuất
        if (logoutBtn) {
            logoutBtn.style.setProperty('display', 'none', 'important');
            logoutBtn.classList.add('hidden');
        }

        // ẨN NÚT THÔNG TIN CÁ NHÂN (PROFILE)
        if (profileBtn) {
            profileBtn.style.setProperty('display', 'none', 'important');
            profileBtn.classList.add('hidden');
        }
        
        // Đặt lại chào mừng mặc định
        if (userGreeting) {
            userGreeting.textContent = 'Chào user!';
        }
    }
}

async function loadProfileData(): Promise<void> {
    console.log('🔍 loadProfileData() called');
    const usernameEl = document.getElementById('profileUsername');
    const emailEl = document.getElementById('profileEmail');
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement | null;
    const savedAvatar = localStorage.getItem('userAvatar');
    const savedUsername = localStorage.getItem('username');
    const savedEmail = localStorage.getItem('email');

    console.log('🔍 profileUsername element:', usernameEl);
    console.log('🔍 profileEmail element:', emailEl);
    console.log('🔍 avatarPreview element:', avatarPreview);
    console.log('🔍 saved values:', { savedUsername, savedEmail, savedAvatar });

    const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:8000';
    const profileUrl = `${apiBase.replace(/\/$/, '')}/api/profile/`;
    const token = localStorage.getItem('accessToken');

    if (usernameEl) {
        usernameEl.textContent = savedUsername || 'Người dùng';
    }
    if (emailEl) {
        emailEl.textContent = savedEmail || 'Chưa cập nhật';
    }
    if (savedAvatar && avatarPreview) {
        avatarPreview.src = savedAvatar;
        updateUserLogo();
    }

    if (!token) {
        console.warn('⚠️ No auth token available for profile fetch');
        return;
    }

    try {
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('⚠️ Profile fetch failed', response.status, errorText);
            return;
        }

        const profileData = await response.json();
        console.log('✅ Profile data loaded', profileData);

        if (usernameEl && profileData.username) {
            usernameEl.textContent = profileData.username;
        }
        if (emailEl && profileData.email) {
            emailEl.textContent = profileData.email;
        }
        if (avatarPreview && profileData.avatar_url) {
            avatarPreview.src = profileData.avatar_url;
            localStorage.setItem('userAvatar', profileData.avatar_url);
            updateUserLogo();
        }
    } catch (error) {
        console.error('❌ Error fetching profile data:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra UI khi load trang
    updateNavbar();

    // 2. Gán sự kiện click cho nút Profile Drawer
    const profileBtn = document.getElementById('dropdown-profile-btn');
    const drawerOverlay = document.getElementById('overlay');
    const profileDrawer = document.getElementById('profileDrawer');
    const closeDrawerBtn = document.getElementById('btnCloseDrawer');

    const openDrawer = () => {
        if (!drawerOverlay || !profileDrawer) return;
        drawerOverlay.classList.remove('hidden');
        setTimeout(() => drawerOverlay.classList.add('opacity-100'), 10);
        profileDrawer.style.right = '0px';
    };

    const closeDrawer = () => {
        if (!drawerOverlay || !profileDrawer) return;
        profileDrawer.style.right = '-400px';
        drawerOverlay.classList.remove('opacity-100');
        setTimeout(() => drawerOverlay.classList.add('hidden'), 300);
    };

    if (profileBtn) {
        profileBtn.onclick = async (e) => {
            e.preventDefault();
            await loadProfileData();
            openDrawer();
        };
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.onclick = closeDrawer;
    }

    if (drawerOverlay) {
        drawerOverlay.onclick = (event) => {
            if (event.target === drawerOverlay) {
                closeDrawer();
            }
        };
    }
});


// Make it global so it can be called from anywhere
(window as any).updateNavbar = updateNavbar;

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOMContentLoaded fired");
    
    // CRITICAL: Initialize auth UI FIRST, before anything else
    console.log("🔐 Running initAuthUI() to set correct view...");
    initAuthUI();
    
    // Update navbar buttons immediately
    console.log("🔘 Running updateNavbar() to set correct navbar state...");
    updateNavbar();
    updateSharedFundLinks();
    bindSharedFundEvents();
    if (localStorage.getItem('isLoggedIn') === 'true') {
        // Nếu có token, đồng bộ avatar từ API hoặc localStorage ngay khi tải trang
        loadProfileData().catch((error) => {
            console.warn('⚠️ Failed to refresh profile avatar on load:', error);
        });
        loadSharedFunds().catch((error) => {
            console.warn('⚠️ Failed to load shared fund data on load:', error);
        });
        loadInvitations().catch((error) => {
            console.warn('⚠️ Failed to load invitations on load:', error);
        });
        // Start realtime polling for invitations
        startInvitationPolling();
    }
    
    // Khởi tạo trang reset password nếu cần
    initResetPasswordPage();
    setupResetPasswordListeners();
    
    // ==============================================
    // 🔐 BẮTLINK RESET PASSWORD
    // ==============================================
    const path = window.location.pathname;
    console.log("🌐 Current path:", path);
    
    if (path.startsWith('/reset-password/')) {
        console.log("🔑 Phát hiện link reset password!");
        
        const segments = path.split('/').filter(Boolean); // Lọc các phần trống
        // segments: ['reset-password', 'uid', 'token']
        const uid = segments[1];
        const token = segments[2];

        console.log("📋 Parsed UID:", uid);
        console.log("📋 Parsed Token:", token);

        if (uid && token) {
            // 1. Hiện Modal (nếu đang ẩn)
            const modalOverlay = document.getElementById('modal-overlay');
            modalOverlay?.classList.remove('hidden');
            modalOverlay?.classList.add('flex');
            console.log("✅ Modal opened");

            // 2. Gọi showResetTab() để xử lý tất cả logic: ẩn tab, hiện reset form, điền uid/token
            showResetTab();
            
            // 3. Điền uid/token vào thẻ ẩn để dùng khi gửi API
            const uidInput = document.getElementById('reset-uid') as HTMLInputElement;
            const tokenInput = document.getElementById('reset-token') as HTMLInputElement;
            if (uidInput) uidInput.value = uid;
            if (tokenInput) tokenInput.value = token;
            console.log("✅ UID/Token values set");

            // 4. Cập nhật thông báo trạng thái
            const statusInfo = document.getElementById('reset-status-info');
            if (statusInfo) {
                statusInfo.textContent = "✅ Link xác nhận hợp lệ. Vui lòng nhập mật khẩu mới";
            }

            console.log("✅ Đã nhận diện Link Reset. UID:", uid, "Token:", token);
        }
    }
    // ==============================================
    
    const username = localStorage.getItem('username');
    const authSection = document.getElementById('auth-section');
    
    // 1. Tìm thẻ hiển thị câu chào
    const greetingElement = document.getElementById('user-greeting');

    // 2. Nếu đã đăng nhập, cập nhật câu chào ngay lập tức
    if (username && greetingElement) {
        greetingElement.textContent = `Chào ${username}!`;
    }

    // --- Các logic giữ nguyên của bạn ---
    const regForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('do-login-btn');
    const forgotBtn = document.getElementById('do-forgot-btn');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const backToLoginBtn = document.getElementById('back-to-login');
    
    console.log("🔍 Elements found:", { regForm, loginBtn, forgotBtn, forgotPasswordBtn, backToLoginBtn });
    
    if (regForm) {
        regForm.addEventListener('submit', handleRegister);
        console.log("✔️ Register form listener added");
    }
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        console.log("✔️ Login button listener added");
    }
    if (forgotBtn) {
        forgotBtn.addEventListener('click', handleForgotPassword);
        console.log("✔️ Forgot button listener added");
    }
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', showForgotTab);
        console.log("✔️ Forgot password link listener added");
    }
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', showLoginTab);
        console.log("✔️ Back to login button listener added");
    }

    // 3. Auth Section will be handled by ExpenseManager.updateDropdownButtons()
    // No need to set up logout here - it will be managed by ExpenseManager
    // This avoids duplicate event listeners

    // 4. Global click listener for debugging
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'do-forgot-btn') {
            console.log("🎯 do-forgot-btn clicked via global listener");
        }
    });

    // 1. Quản lý ẩn/hiện Menu Dropdown
    const userGreeting = document.getElementById('user-greeting');
    const userMenu = document.getElementById('userMenu');

    if (userGreeting && userMenu) {
        userGreeting.onclick = (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        };
    }

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        if (userMenu && !userMenu.classList.contains('hidden')) {
            userMenu.classList.add('hidden');
        }
    });

    // 2. Quản lý Modal Profile
    const btnOpenProfile = document.getElementById('btnOpenProfile');
    const profileModal = document.getElementById('profileModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnLogout = document.getElementById('btnLogout');

    if (btnOpenProfile) {
        btnOpenProfile.onclick = (e) => {
            e.preventDefault();
            if (profileModal) profileModal.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden'); // Đóng menu sau khi chọn
        };
    }

    if (btnCloseModal) {
        btnCloseModal.onclick = () => {
            if (profileModal) profileModal.classList.add('hidden');
        };
    }

    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            if (window.expenseManager && window.expenseManager.handleLogoutClick) {
                window.expenseManager.handleLogoutClick();
            }
        };
    }

    // 3. Xem trước ảnh khi chọn (Preview)
    const fileAvatar = document.getElementById('fileAvatar') as HTMLInputElement;
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;

    if (fileAvatar) {
        fileAvatar.onchange = () => {
            const file = fileAvatar.files ? fileAvatar.files[0] : null;
            if (file && avatarPreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target && avatarPreview) {
                        avatarPreview.src = e.target.result as string;
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // 4. Gửi dữ liệu bằng FormData (Phương pháp chuẩn Huy chọn)
    const btnSaveAvatar = document.getElementById('btnSaveAvatar');

    if (btnSaveAvatar) {
        btnSaveAvatar.onclick = async () => {
            const file = fileAvatar && fileAvatar.files ? fileAvatar.files[0] : null;
            const token = localStorage.getItem('accessToken');
            const avatarPreviewEl = document.getElementById('avatarPreview') as HTMLImageElement | null;

            if (!file) {
                alert("Bạn chưa chọn ảnh mới!");
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            if (!token) {
                alert('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
                return;
            }

            const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:8000';
            const profileUrl = `${apiBase.replace(/\/$/, '')}/api/profile/`;

            try {
                    const response = await fetch(profileUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                if (response.ok) {
                    const contentType = response.headers.get('Content-Type') || '';
                    let data: any = {};
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    }
                    const newAvatarUrl = data.avatar_url || data.avatar || '';
                    if (newAvatarUrl) {
                        localStorage.setItem('userAvatar', newAvatarUrl);
                        if (avatarPreviewEl) {
                            avatarPreviewEl.src = newAvatarUrl;
                        }
                        const userLogo = document.querySelector('#user-btn .bg-orange-500') as HTMLElement | null;
                        if (userLogo) {
                            userLogo.innerHTML = `<img src="${newAvatarUrl}" class="w-full h-full rounded-xl object-cover">`;
                        }
                    }
                    alert("Đã cập nhật ảnh thành công!");
                } else {
                    const contentType = response.headers.get('Content-Type') || '';
                    if (contentType.includes('application/json')) {
                        const error = await response.json();
                        alert("Lỗi: " + (error.detail || error.error || "Không thể lưu ảnh"));
                    } else {
                        const text = await response.text();
                        alert(`Lỗi server: ${text}`);
                    }
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error("Lỗi upload:", err);
                alert(`Không thể kết nối tới Server Django!\nKiểm tra server backend đang chạy và truy cập được tại ${profileUrl}.\nChi tiết: ${errorMessage}`);
            }
        };
    }
});

// Export global functions for onclick handlers
(window as any).handleLoginClick = (e: Event) => {
    console.log("🌍 Global handleLoginClick called");
    handleLogin(e);
};

(window as any).handleForgotPasswordClick = (e: Event) => {
    console.log("🌍 Global handleForgotPasswordClick called");
    handleForgotPassword(e);
};

(window as any).handleResetPasswordClick = (e: Event) => {
    console.log("🌍 Global handleResetPasswordClick called");
    handleResetPasswordClick(e);
};

(window as any).showForgotTabClick = (e: Event) => {
    console.log("🌍 Global showForgotTabClick called");
    e.preventDefault();
    showForgotTab();
};

(window as any).showLoginTabClick = (e: Event) => {
    console.log("🌍 Global showLoginTabClick called");
    e.preventDefault();
    showLoginTab();
};

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiModel = () => {
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};


interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryId?: number | string;
  date: string;
  incomeId?: number;  // 🔑 Primary key for income records
  chiPhiId?: number;  // 🔑 Primary key for expense records
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

interface Category {
  id: number | string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'Thu nhập' | 'Chi tiêu';
}

class ExpenseManager {
  private transactions: Transaction[] = [];
  private categories: Category[] = [
    { id: 'default-1', name: 'Ăn uống', icon: 'utensils', color: '#f59e0b', type: 'Chi tiêu' },
    { id: 'default-2', name: 'Di chuyển', icon: 'car', color: '#3b82f6', type: 'Chi tiêu' },
    { id: 'default-3', name: 'Mua sắm', icon: 'shopping-bag', color: '#ec4899', type: 'Chi tiêu' },
    { id: 'default-4', name: 'Giải trí', icon: 'gamepad-2', color: '#a855f7', type: 'Chi tiêu' },
    { id: 'default-5', name: 'Nhà cửa', icon: 'home', color: '#10b981', type: 'Chi tiêu' },
    { id: 'default-6', name: 'Lương', icon: 'banknote', color: '#14b8a6', type: 'Thu nhập' },
    { id: 'default-7', name: 'Khác', icon: 'plus', color: '#64748b', type: 'Chi tiêu' }
  ];
  private categoryBudgets: Record<string, number> = {};
  private goals: Goal[] = [];
  private monthlyBudget: number = 10000000; // Default 10M VND
  private isDarkMode: boolean = false;
  private isIncognito: boolean = false;
  private isLoggedIn: boolean = false;
  private currentCategoryType: 'Thu nhập' | 'Chi tiêu' = 'Chi tiêu';

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
    this.budgetProgress = document.getElementById('budget-progress') || ({} as HTMLElement);
    this.budgetPercent = document.getElementById('budget-percent') || ({} as HTMLElement);
    this.budgetWarning = document.getElementById('budget-warning') || ({} as HTMLElement);
    this.goalsList = document.getElementById('goals-list')!;
    this.aiAdviceContainer = document.getElementById('ai-advice-container')!;
    this.budgetListEl = document.getElementById('budget-list')!;
    this.budgetModal = document.getElementById('budget-modal') || ({} as HTMLElement);
    this.budgetForm = document.getElementById('budget-form') as HTMLFormElement;

    this.loadData();
    this.init();
    this.setupEventListeners();
    this.setupBudgetEvents();
    
    // Check login state
    this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    console.log("🔍 ExpenseManager Constructor: isLoggedIn =", this.isLoggedIn);
    
    // Load categories from backend if logged in
    if (this.isLoggedIn) {
      this.loadCategories()
        .catch((error) => console.error('Lỗi khi tải danh mục:', error))
        .finally(() => {
          this.renderCategoryDropdown(this.currentCategoryType);
          this.loadAndRender();
        });
    } else {
      if (this.transactions.length === 0) {
        this.addMockData();
      }
      this.renderCategoryDropdown(this.currentCategoryType);
      this.loadAndRender();
    }
    
    this.getAIAdvice();
    this.toggleView();
    
    // Update navbar buttons (Login/Register/Logout)
    console.log("🔘 Calling updateNavbar() from constructor...");
    (window as any).updateNavbar();
    
    // Final verification
    setTimeout(() => {
      this.verifyUIState();
    }, 100);
  }

  // CRITICAL: Initialize Auth UI State immediately
  private toggleView() {
    console.log("🔄 toggleView() called - isLoggedIn:", this.isLoggedIn);
    
    if (this.isLoggedIn) {
      console.log("✅ Showing Dashboard");
      // Hide landing view using strong CSS override
      this.landingView.classList.add('hidden');
      this.landingView.style.setProperty('display', 'none', 'important');
      this.landingView.style.setProperty('visibility', 'hidden', 'important');
      
      // Show dashboard view using strong CSS override
      this.dashboardView.classList.remove('hidden');
      this.dashboardView.style.setProperty('display', 'flex', 'important');
      this.dashboardView.style.setProperty('visibility', 'visible', 'important');
      
      // CRITICAL: Ensure modal is closed when showing dashboard
      const modalOverlay = document.getElementById('modal-overlay');
      if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('flex');
        console.log("✅ Modal closed");
      }
      
      this.render();
      
      // Verify the change happened
      this.verifyUIState();
    } else {
      console.log("📍 Showing Landing Page");
      // Show landing view using strong CSS override
      this.landingView.classList.remove('hidden');
      this.landingView.style.setProperty('display', 'flex', 'important');
      this.landingView.style.setProperty('visibility', 'visible', 'important');
      
      // Hide dashboard view using strong CSS override
      this.dashboardView.classList.add('hidden');
      this.dashboardView.style.setProperty('display', 'none', 'important');
      this.dashboardView.style.setProperty('visibility', 'hidden', 'important');
      
      // Verify the change happened
      this.verifyUIState();
    }
    localStorage.setItem('isLoggedIn', this.isLoggedIn.toString());
    this.updateDropdownButtons();
  }
  
  // CRITICAL: Verify UI state and fix if needed
  private verifyUIState() {
    const landingDisplay = window.getComputedStyle(this.landingView).display;
    const dashboardDisplay = window.getComputedStyle(this.dashboardView).display;
    
    console.log("🔍 UI State Verification:", {
      isLoggedIn: this.isLoggedIn,
      landingView_display: landingDisplay,
      landingView_hasHidden: this.landingView.classList.contains('hidden'),
      dashboardView_display: dashboardDisplay,
      dashboardView_hasHidden: this.dashboardView.classList.contains('hidden'),
    });
    
    // Emergency fix if something went wrong
    if (this.isLoggedIn) {
      if (landingDisplay !== 'none') {
        console.warn("⚠️  Emergency fix: Landing view still visible! Forcing hidden...");
        this.landingView.style.display = 'none';
        this.landingView.style.visibility = 'hidden';
      }
      if (dashboardDisplay === 'none') {
        console.warn("⚠️  Emergency fix: Dashboard view not visible! Forcing display...");
        this.dashboardView.style.display = 'flex';
        this.dashboardView.style.visibility = 'visible';
      }
    }
  }

  private updateDropdownButtons() {
    const loggedOutButtons = document.getElementById('logged-out-buttons');
    const logoutBtn = document.getElementById('dropdown-logout-btn');
    
    console.log("🔘 updateDropdownButtons - isLoggedIn:", this.isLoggedIn);
    console.log("🔘 Elements found -", { loggedOutButtons: !!loggedOutButtons, logoutBtn: !!logoutBtn });

    if (loggedOutButtons && logoutBtn) {
      if (this.isLoggedIn) {
        console.log("✅ Hiding login buttons, showing logout");
        // Khi đã đăng nhập: ẩn Login/Register, chỉ hiện Logout
        loggedOutButtons.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        
        // Re-attach logout listener to be sure
        logoutBtn.removeEventListener('click', this.handleLogoutClick);
        logoutBtn.addEventListener('click', this.handleLogoutClick);
      } else {
        console.log("📍 Showing login buttons, hiding logout");
        // Khi chưa đăng nhập: hiện Login/Register, ẩn Logout
        loggedOutButtons.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
      }
    } else {
      console.warn("⚠️  Auth buttons not found:", { loggedOutButtons: !!loggedOutButtons, logoutBtn: !!logoutBtn });
    }
  }
  
   handleLogoutClick = () => {
      console.log('🔐 Logout button clicked');
      
      // Stop invitation polling
      stopInvitationPolling();
      
      // 1. Clear all session data FIRST - before any reload
      localStorage.clear();
      sessionStorage.clear();
      this.transactions = []; // Clear local transactions array
      console.log("✅ LocalStorage, SessionStorage và transactions array cleared");
      
      // 2. Show logout notification
      this.showToast('Đã đăng xuất', 'warning');
      console.log("🔔 Logout toast shown");
      
      // 3. Small delay to let toast render, then perform hard page reload
      setTimeout(() => {
          console.log("🔄 Performing hard page reload by navigating to root...");
          
          // Navigate to root with cache-busting parameter
          // This reloads the page with empty localStorage, which triggers initAuthUI()
          // to show landing page in DOMContentLoaded handler
          const reloadUrl = window.location.origin + '/?logout=' + Date.now();
          console.log("🔄 Redirect URL:", reloadUrl);
          
          window.location.href = reloadUrl;
          
      }, 300);
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

    document.getElementById('landing-shared-fund-btn')?.addEventListener('click', () => {
      this.openAuthModal('login');
    });

    document.getElementById('landing-add-transaction-btn')?.addEventListener('click', () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn) {
        // If logged in, scroll to the add transaction section
        document.getElementById('add-transaction-section')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // If not logged in, open the auth modal
        this.openAuthModal('login');
      }
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

    // Type selection buttons
    document.getElementById('type-expense-btn')?.addEventListener('click', () => this.setTransactionType('expense'));
    document.getElementById('type-income-btn')?.addEventListener('click', () => this.setTransactionType('income'));

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
    const openSharedFundPanel = () => {
      const panel = document.getElementById('shared-fund-expanded-panel');
      if (panel?.classList.contains('hidden')) {
        toggleSharedFundExpanded();
      }
      scrollToSharedFundSection();
    };

    document.getElementById('header-shared-fund-btn')?.addEventListener('click', openSharedFundPanel);
    document.getElementById('dashboard-shared-fund-btn')?.addEventListener('click', openSharedFundPanel);
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
    
    document.getElementById('close-auth-modal')?.addEventListener('click', () => {
      // Nếu đang trong form reset password, reload trang
      const resetForm = document.getElementById('reset-form-container');
      if (resetForm && !resetForm.classList.contains('hidden')) {
        location.reload();
      } else {
        this.closeModals();
      }
    });
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
      this.setCategoryType('Chi tiêu'); // Set default type
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
      if (e.target === overlay) {
        // Nếu đang trong form reset password, reload trang
        const resetForm = document.getElementById('reset-form-container');
        if (resetForm && !resetForm.classList.contains('hidden')) {
          location.reload();
        } else {
          this.closeModals();
        }
      }
    });

    document.getElementById('save-category-btn')?.addEventListener('click', () => this.addCategory());
    document.getElementById('save-goal-btn')?.addEventListener('click', () => this.addGoal());
    document.getElementById('do-contribute-btn')?.addEventListener('click', () => this.contributeToGoal());
    document.getElementById('close-contribute-modal')?.addEventListener('click', () => this.closeModals());

    // Auth button logic - real API calls are handled in auth/login.ts and auth/register.ts
    // Logout listener is handled by updateDropdownButtons() to avoid duplicates
    
    // Enter key support for login/register
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const event = new Event('click');
        document.getElementById('do-login-btn')?.dispatchEvent(event);
      }
    });
    document.getElementById('reg-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const event = new Event('submit');
        document.getElementById('register-form')?.dispatchEvent(event);
      }
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

    typeExpenseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updateTypeToggle('expense');
    });
    typeIncomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updateTypeToggle('income');
    });
    
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
    // Nếu đang trong form reset password, reload trang thay vì ẩn modal
    const resetForm = document.getElementById('reset-form-container');
    if (resetForm && !resetForm.classList.contains('hidden')) {
      location.reload();
      return;
    }
    
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

  // 📥 Fetch real data from API (returns transactions array)
  private async fetchTransactions(): Promise<Transaction[]> {
    const token = localStorage.getItem('accessToken');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // If not logged in, return empty array
    if (!isLoggedIn || !token) {
      console.log('📍 Not logged in - returning empty transactions');
      return [];
    }

    const headers = {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      console.log('🔄 Fetching real data from API...');

      // Fetch both APIs in parallel for better performance
      const [incomeRes, expenseRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/incomes/', { headers }),
        axios.get('http://127.0.0.1:8000/api/expenses/', { headers })
      ]);

      // Map income data
      const mappedIncomes: Transaction[] = incomeRes.data.map((item: any) => {
        const categoryName = this.categories.find(c => c.id.toString() === item.loai?.toString())?.name || 'Khác';
        return {
          id: item.incomeId?.toString() || Math.random().toString(),
          incomeId: item.incomeId,  // 🔑 Store primary key for delete operations
          description: item.moTa || 'Thu nhập',
          amount: parseFloat(item.amount),
          type: 'income' as const,
          category: categoryName,
          categoryId: item.loai,
          date: item.date || new Date().toISOString()
        };
      });

      // Map expense data
      const mappedExpenses: Transaction[] = expenseRes.data.map((item: any) => {
        const categoryName = this.categories.find(c => c.id.toString() === item.loai?.toString())?.name || 'Khác';
        return {
          id: item.chiPhiId?.toString() || Math.random().toString(),
          chiPhiId: item.chiPhiId,  // 🔑 Store primary key for delete operations
          description: item.moTa || 'Chi tiêu',
          amount: parseFloat(item.amount),
          type: 'expense' as const,
          category: categoryName,
          categoryId: item.loai,
          date: item.date || new Date().toISOString()
        };
      });

      // Merge and sort by date (newest first)
      const allTransactions = [...mappedIncomes, ...mappedExpenses].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log('✅ Fetched incomes:', mappedIncomes.length, 'expenses:', mappedExpenses.length);
      console.log('📊 Total transactions loaded:', allTransactions.length);
      
      return allTransactions;
    } catch (error: any) {
      console.error('❌ Lỗi fetch dữ liệu:', error.message);
      return [];
    }
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
        this.categories = parsed.map((item: any, index: number) => ({
          id: item.id ?? `cached-${index}`,
          name: item.name,
          icon: item.icon,
          color: item.color,
          type: item.type
        }));
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

  private async addCategory() {
    const input = document.getElementById('new-category-input') as HTMLInputElement;
    const iconInput = document.getElementById('new-category-icon') as HTMLSelectElement;
    const colorInput = document.getElementById('new-category-color') as HTMLInputElement;
    
    const name = input.value.trim();
    const icon = iconInput.value;
    const color = colorInput.value;

    if (!name) {
      this.showToast('Vui lòng nhập tên danh mục', 'error');
      return;
    }

    const duplicateExists = this.categories.some(c => c.name === name && this.isCategoryTypeMatch(c.type, this.currentCategoryType));
    if (duplicateExists) {
      this.showToast('Danh mục đã tồn tại trong phân loại này', 'error');
      return;
    }

    // Gửi về backend
    await this.saveCategory(name, icon, color);
  }

  private isCategoryTypeMatch(categoryType: string, selectedType: 'Thu nhập' | 'Chi tiêu'): boolean {
    const backendType = selectedType === 'Thu nhập' ? 'income' : 'expense';
    return categoryType === selectedType || categoryType === backendType;
  }

  private getCategoryTypeLabel(categoryType: string): string {
    if (categoryType === 'income' || categoryType === 'Thu nhập') return 'Thu nhập';
    if (categoryType === 'expense' || categoryType === 'Chi tiêu') return 'Chi tiêu';
    return categoryType;
  }

  private async saveCategory(name: string, icon: string, color: string) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        this.showToast('Phiên đăng nhập hết hạn', 'error');
        return;
      }

      // Map frontend type to backend type
      const typeMap: Record<string, string> = {
        'Thu nhập': 'income',
        'Chi tiêu': 'expense'
      };

      const backendType = typeMap[this.currentCategoryType] || 'expense';

      const response = await axios.post('http://127.0.0.1:8000/api/categories/', {
        tenLoai: name,
        icon: icon,
        color: color,
        type: backendType
      }, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201) {
        this.showToast('Danh mục đã được tạo thành công!', 'success');
        // Reload categories to reflect changes
        await this.loadCategories();
        // Reset form
        const input = document.getElementById('new-category-input') as HTMLInputElement;
        const iconInput = document.getElementById('new-category-icon') as HTMLSelectElement;
        const colorInput = document.getElementById('new-category-color') as HTMLInputElement;
        input.value = '';
        iconInput.value = 'shopping-bag';
        colorInput.value = '#f97316';
      }
    } catch (error: any) {
      console.error('Lỗi khi lưu danh mục:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Không thể tạo danh mục';
      this.showToast(errorMsg, 'error');
    }
  }

  private async loadCategories() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get('http://127.0.0.1:8000/api/categories/', {
        headers: { 'Authorization': `Token ${token}` }
      });

      // Map từ backend data sang frontend format
      this.categories = response.data.map((cat: any) => ({
        id: cat.loaiId,
        name: cat.tenLoai,
        icon: cat.icon,
        color: cat.color,
        type: cat.type
      }));

      this.saveData(); // Lưu vào localStorage để đồng bộ
      this.updateCategoryDropdowns();
    } catch (error) {
      console.error('Lỗi khi tải danh mục:', error);
      // Fallback to localStorage if API fails
    }
  }

  public setCategoryType(type: 'Thu nhập' | 'Chi tiêu') {
    this.currentCategoryType = type;
    
    // Cập nhật UI nút bấm
    const btnIncome = document.getElementById('btn-type-income');
    const btnExpense = document.getElementById('btn-type-expense');

    if (type === 'Thu nhập') {
      btnIncome?.classList.replace('border-gray-100', 'border-green-500');
      btnIncome?.classList.replace('text-gray-400', 'text-green-600');
      btnIncome?.classList.add('bg-green-50');
      
      btnExpense?.classList.replace('border-orange-500', 'border-gray-100');
      btnExpense?.classList.replace('text-orange-600', 'text-gray-400');
      btnExpense?.classList.remove('bg-orange-50');
    } else {
      // Ngược lại cho Chi tiêu (giữ màu cam như thiết kế cũ của bạn)
      btnExpense?.classList.replace('border-gray-100', 'border-orange-500');
      btnExpense?.classList.replace('text-gray-400', 'text-orange-600');
      btnExpense?.classList.add('bg-orange-50');
      
      btnIncome?.classList.replace('border-green-500', 'border-gray-100');
      btnIncome?.classList.replace('text-green-600', 'text-gray-400');
      btnIncome?.classList.remove('bg-green-50');
    }
  }

  private setTransactionType(type: string) {
    const expenseBtn = document.getElementById('type-expense-btn');
    const incomeBtn = document.getElementById('type-income-btn');
    const hiddenInput = document.getElementById('type') as HTMLInputElement;
    
    if (type === 'expense') {
      expenseBtn?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-rose-600');
      expenseBtn?.classList.remove('text-slate-400');
      incomeBtn?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-emerald-600');
      incomeBtn?.classList.add('text-slate-400');
      hiddenInput.value = 'expense';
    } else {
      incomeBtn?.classList.add('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-emerald-600');
      incomeBtn?.classList.remove('text-slate-400');
      expenseBtn?.classList.remove('bg-white', 'dark:bg-slate-900', 'shadow-sm', 'text-rose-600');
      expenseBtn?.classList.add('text-slate-400');
      hiddenInput.value = 'income';
    }
    
    // Update category dropdown based on type
    this.updateCategoryDropdownForTransaction(type);
  }

  private renderCategoryDropdown(type: 'Thu nhập' | 'Chi tiêu') {
    const catSelect = document.getElementById('transaction-category') as HTMLSelectElement;
    if (!catSelect) return;

    const filteredCategories = this.categories.filter(c => this.isCategoryTypeMatch(c.type, type));
    if (filteredCategories.length === 0) {
      catSelect.innerHTML = '<option value="">-- Vui lòng tạo danh mục trước --</option>';
      catSelect.value = '';
      return;
    }

    catSelect.innerHTML = filteredCategories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');
    catSelect.value = filteredCategories[0].id.toString();
  }

  private updateCategoryDropdownForTransaction(type: string) {
    const transactionType = type === 'income' ? 'Thu nhập' : 'Chi tiêu';
    this.renderCategoryDropdown(transactionType);
  }

  public async deleteCategory(id: number | string) {
    const category = this.categories.find(c => c.id.toString() === id.toString());
    if (!category) {
      this.showToast('Danh mục không tồn tại', 'error');
      return;
    }

    if (this.categories.length <= 1) {
      this.showToast('Phải có ít nhất một danh mục', 'error');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"? Các giao dịch liên quan có thể bị ảnh hưởng.`)) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      this.showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
      return;
    }

    try {
      const url = `http://127.0.0.1:8000/api/categories/${category.id}/`;
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (response.status === 204) {
        this.categories = this.categories.filter(c => c.id.toString() !== id.toString());
        delete this.categoryBudgets[category.name];
        this.saveData();
        this.updateCategoryDropdowns();
        this.renderCategoryManager();
        await this.loadAndRender();
        this.showToast('Đã xóa danh mục thành công!', 'success');
      }
    } catch (error: any) {
      console.error('Lỗi khi xóa danh mục:', error);
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message || 'Không thể xóa danh mục này!';
      this.showToast(msg, 'error');
    }
  }

  public setCategoryBudget(name: string, amount: number) {
    if (amount >= 0) {
      this.categoryBudgets[name] = amount;
      this.saveData();
      this.renderBudget();
    }
  }

  private updateCategoryDropdowns() {
    const filterSelect = document.getElementById('filter-category') as HTMLSelectElement;
    const budgetSelect = document.getElementById('budget-category') as HTMLSelectElement;

    const options = this.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (filterSelect) filterSelect.innerHTML = `<option value="all">Tất cả danh mục</option>` + options;
    if (budgetSelect) budgetSelect.innerHTML = options;
    
    // Update transaction category dropdown based on current type
    const hiddenInput = document.getElementById('type') as HTMLInputElement;
    const currentType = hiddenInput?.value || 'expense';
    this.updateCategoryDropdownForTransaction(currentType);
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
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${c.name}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">${this.getCategoryTypeLabel(c.type)}</span>
            </div>
          </div>
          <button onclick="window.expenseManager.deleteCategory('${c.id}')" class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-xl transition-colors">
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

  private async addTransaction() {
    const descInput = document.getElementById('desc') as HTMLInputElement;
    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const typeInput = document.getElementById('type') as HTMLInputElement;
    const categorySelect = document.getElementById('transaction-category') as HTMLSelectElement;

    const desc = descInput.value;
    const amount = this.parseFormattedNumber(amountInput.value);
    const type = typeInput.value as 'income' | 'expense';
    const categoryId = categorySelect.value;
    const selectedCategoryId = parseInt(categoryId, 10);
    const categoryObj = this.categories.find(c => c.id.toString() === categoryId.toString());
    const categoryName = categoryObj?.name || 'Khác';

    if (!desc || isNaN(amount) || amount <= 0 || !categoryId || isNaN(selectedCategoryId)) {
      this.showToast('Vui lòng điền đầy đủ thông tin giao dịch', 'error');
      return;
    }

    const transaction: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      description: desc,
      amount,
      type,
      category: categoryName,
      categoryId: selectedCategoryId,
      date: new Date().toISOString()
    };

    const btn = this.formEl.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = btn.textContent;

    try {
      const token = localStorage.getItem('accessToken');
      
      // Disable button while saving
      btn.disabled = true;
      btn.textContent = '⏳ Đang lưu...';

      // Determine endpoint based on transaction type - FIXED: incomes/expenses not thunhap/chiphi
      const endpoint = type === 'income' 
        ? 'http://127.0.0.1:8000/api/incomes/'
        : 'http://127.0.0.1:8000/api/expenses/';

      // Send to API with JWT token
      const response = await axios.post(endpoint, {
        amount: amount,
        description: desc,
        loai: selectedCategoryId,
        date: new Date().toISOString().split('T')[0] // Ngày hôm nay (YYYY-MM-DD)
      }, {
        headers: {
          'Authorization': `Token ${token}`,  // ✅ Use 'Token' not 'Bearer' for TokenAuthentication
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201 || response.status === 200) {
        console.log('✅ Transaction saved to API, reloading data...');
        
        // Success feedback
        btn.textContent = '✅ Đã lưu!';
        btn.classList.replace('bg-orange-600', 'bg-green-600');
        this.showToast(`${type === 'income' ? 'Thu nhập' : 'Chi tiêu'} đã được lưu thành công!`, 'success');
        
        // Reset form immediately
        this.formEl.reset();
        (this as any).updateTypeToggle('expense');
        
        // Reload data from API to reflect changes
        await this.loadAndRender();
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.replace('bg-green-600', 'bg-orange-600');
          btn.disabled = false;
        }, 2000);
      }
    } catch (error: any) {
      btn.disabled = false;
      btn.textContent = originalText || 'Lưu giao dịch';
      
      const errorMsg = error.response?.data?.detail || error.message || 'Lỗi khi lưu giao dịch';
      console.error('❌ Lỗi API:', errorMsg);
      this.showToast(errorMsg, 'error');
    }
  }

  private async deleteTransaction(id: any, type: 'income' | 'expense') {
    // 🔍 DEBUG 1: Kiểm tra ID có bị undefined không
    console.log('🔍 [DEBUG 1] ID nhận được:', id, '| Type:', type);
    
    if (!id || id === 'undefined' || id === undefined) {
      console.error('❌ [ERROR] ID không hợp lệ! ID:', id);
      this.showToast('❌ Lỗi: Không tìm thấy ID giao dịch!', 'error');
      return;
    }

    // 1. Xác nhận nghiệp vụ
    const confirmMsg = type === 'income' 
        ? "Xóa khoản thu này sẽ trừ vào số dư của bạn. Tiếp tục?" 
        : "Xóa khoản chi này sẽ hoàn lại tiền vào số dư. Tiếp tục?";
    
    if (!confirm(confirmMsg)) return;

    // 2. Cấu hình API
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('❌ [ERROR] Token không tồn tại');
      this.showToast('❌ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!', 'error');
      return;
    }

    const endpoint = type === 'income' ? 'incomes' : 'expenses';
    const url = `http://127.0.0.1:8000/api/${endpoint}/${id}/`; // 🔍 DEBUG: URL với trailing slash

    try {
      // 🔍 DEBUG 2: Log URL và token trước khi gửi
      console.log('🚀 [DEBUG 2] Gửi DELETE request tới:', url);
      console.log('🔐 Token (first 20 chars):', token.substring(0, 20) + '...');
      
      // 3. Gửi lệnh DELETE thực thụ xuống Database
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // 🔍 DEBUG 3: Log phản hồi từ server
      console.log('✅ [DEBUG 3] Phản hồi từ Server - Status:', response.status);
      
      if (response.status === 204) {
        console.log(`✅ Đã xóa vĩnh viễn ${type} ID: ${id}`);
        this.showToast(`✅ Xóa ${type === 'income' ? 'khoản thu' : 'khoản chi'} thành công!`, 'success');
        
        // 4. QUAN TRỌNG: Gọi lại hàm fetch dữ liệu để tính lại Số dư và vẽ lại UI
        console.log('🔄 [DEBUG 4] Đang tải lại dữ liệu từ API...');
        await this.loadAndRender();
        console.log('✅ [DEBUG 4] Tải lại UI hoàn tất');
      }
    } catch (error: any) {
      // 🔍 DEBUG 5: Log chi tiết lỗi
      console.error('❌ [ERROR] Chi tiết lỗi DELETE:');
      console.error('  - Status code:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Error message:', error.message);
      console.error('  - Full error:', error);
      
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Không thể xóa giao dịch';
      this.showToast(`❌ ${errorMsg}`, 'error');
    }
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

  // 📥 Load data from API and re-render (called on initial load and after login)
  private async loadAndRender(skipAlerts: boolean = false): Promise<void> {
    console.log('🔄 loadAndRender() called - fetching data from API...');
    const fetchedTransactions = await this.fetchTransactions();
    this.transactions = fetchedTransactions;
    console.log('✅ Transactions updated:', this.transactions.length, 'items');
    this.render(skipAlerts);
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
              <p class="text-[10px] font-medium text-slate-400">Đã dùng ${this.formatCurrency(spent)} / ${this.formatCurrency(amount)}</p>
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
    // Safety check: Ensure budget elements exist
    if (!this.budgetProgress || !this.budgetPercent || !this.budgetWarning) {
      console.warn('⚠️ Budget elements not found in DOM');
      return;
    }

    const totalExpense = this.transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
      .reduce((acc, t) => acc + t.amount, 0);

    const percent = Math.min(Math.round((totalExpense / this.monthlyBudget) * 100), 100);
    
    if (this.budgetPercent && this.budgetPercent.textContent !== undefined) {
      this.budgetPercent.textContent = `${percent}%`;
    }
    
    if (this.budgetProgress && this.budgetProgress.style) {
      this.budgetProgress.style.width = `${percent}%`;
    }

    if (percent > 90) {
      if (this.budgetProgress && this.budgetProgress.classList) {
        this.budgetProgress.classList.replace('bg-orange-500', 'bg-rose-500');
      }
      if (this.budgetWarning && this.budgetWarning.textContent !== undefined) {
        this.budgetWarning.textContent = 'Rủi ro cao! Hãy thắt chặt chi tiêu.';
        this.budgetWarning.className = 'text-[10px] font-medium text-rose-500 italic';
      }
    } else if (percent > 70) {
      if (this.budgetProgress && this.budgetProgress.classList) {
        this.budgetProgress.classList.replace('bg-orange-500', 'bg-amber-500');
      }
      if (this.budgetWarning && this.budgetWarning.textContent !== undefined) {
        this.budgetWarning.textContent = 'Sắp đạt giới hạn ngân sách.';
        this.budgetWarning.className = 'text-[10px] font-medium text-amber-500 italic';
      }
    } else {
      if (this.budgetProgress && this.budgetProgress.className !== undefined) {
        this.budgetProgress.className = 'h-full bg-orange-500 transition-all duration-500';
      }
      if (this.budgetWarning && this.budgetWarning.textContent !== undefined) {
        this.budgetWarning.textContent = 'Bạn đang chi tiêu trong tầm kiểm soát.';
        this.budgetWarning.className = 'text-[10px] font-medium text-green-500 italic';
      }
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
      // 🔑 Lấy đúng ID khóa chính (incomeId hoặc chiPhiId)
      const primaryId = t.type === 'income' ? t.incomeId : t.chiPhiId;
      const displayId = primaryId || t.id; // Backup to t.id if primary key not found
      
      console.log(`🔍 [RENDER] Transaction - Type: ${t.type}, Primary ID: ${primaryId}, Display ID: ${displayId}`);
      
      return `
      <div data-id="${displayId}" class="p-6 flex items-center justify-between hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all group animate-in slide-in-from-bottom-4 fade-in duration-500" style="animation-delay: ${index * 30}ms">
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
          <button onclick="window.expenseManager.deleteTransaction('${displayId}', '${t.type}')" class="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all rounded-xl opacity-0 group-hover:opacity-100" title="Xóa giao dịch này">
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

    const paths = arcs.append('path') as d3.Selection<SVGPathElement, d3.PieArcDatum<{ name: string; value: number; }>, SVGGElement, unknown>;
    
    paths
      .attr('fill', d => color(d.data.name))
      .attr('d', d => arc(d) as string)
      .style('opacity', 0.8)
      .attr('class', 'cursor-pointer transition-all duration-500')
      .on('mouseover', function(event, d: d3.PieArcDatum<{ name: string; value: number; }>) {
        d3.select(this)
          .transition()
          .duration(500)
          .attrTween('d', () => {
            const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
            return (t) => arcHover(i(t) as any)!;
          })
          .style('opacity', 1)
          .attr('filter', 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))');
      })
      .on('mouseout', function(event, d: d3.PieArcDatum<{ name: string; value: number; }>) {
        d3.select(this)
          .transition()
          .duration(500)
          .attrTween('d', () => {
            const i = d3.interpolate(d, { startAngle: d.endAngle, endAngle: d.endAngle });
            return (t) => arc(i(t) as any)!;
          })
          .style('opacity', 0.8)
          .attr('filter', 'none');
      })
      .transition()
      .duration(1000)
      .attrTween('d', function(this: SVGPathElement, d: d3.PieArcDatum<{ name: string; value: number; }>) {
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

// Consolidate: Create ExpenseManager after all setup
window.addEventListener('DOMContentLoaded', () => {
  console.log("✅ Creating ExpenseManager instance...");
  window.expenseManager = new ExpenseManager();
});

