(function() {
  const config = window.sharedFundConfig || {};
  const apiBase = config.baseApi || '/api/shared-fund/';
  const fundListElement = document.getElementById('fund-list');
  const notificationEl = document.getElementById('notification');

  function getAccessToken() {
    return localStorage.getItem('accessToken') || '';
  }

  function redirectToAppLogin() {
    window.location.href = '/';
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

  function showNotification(message, type = 'success') {
    if (!notificationEl) return;
    notificationEl.textContent = message;
    notificationEl.className = `notification ${type}`;
    notificationEl.classList.remove('hidden');
    window.setTimeout(() => notificationEl.classList.add('hidden'), 4000);
  }

  function buildHeaders(isJson = true) {
    const token = getAccessToken();
    const headers = { 'X-CSRFToken': getCookie('csrftoken') };
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token) {
      const authToken = token.startsWith('Token ') || token.startsWith('Bearer ') ? token : `Token ${token}`;
      headers['Authorization'] = authToken;
    }
    return headers;
  }

  function ensureLoggedIn() {
    if (!getAccessToken()) {
      redirectToAppLogin();
      return false;
    }
    return true;
  }

  async function requestJson(url, options = {}) {
    const init = {
      credentials: 'include',
      headers: buildHeaders(options.body ? true : false),
      ...options,
    };

    if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        redirectToAppLogin();
        throw new Error('Yêu cầu đăng nhập');
      }
      const message = payload?.detail || payload?.message || response.statusText;
      throw new Error(message || 'Lỗi khi kết nối máy chủ.');
    }

    return payload;
  }

  async function loadFunds() {
    if (!fundListElement) return;
    fundListElement.innerHTML = '<p>Đang tải danh sách quỹ...</p>';

    try {
      const funds = await requestJson(`${apiBase}funds/`, { method: 'GET' });
      if (!Array.isArray(funds) || funds.length === 0) {
        fundListElement.innerHTML = '<p>Chưa có quỹ nào.</p>';
        return;
      }

      fundListElement.innerHTML = funds.map(fund => `
        <div class="fund-card">
          <h3>${fund.name}</h3>
          <p>${fund.description || 'Không có mô tả'}</p>
          <p><strong>Chủ quỹ:</strong> ${fund.owner}</p>
          <p><strong>Số thành viên:</strong> ${fund.member_count}</p>
          <a class="button secondary" href="/shared-fund/${fund.id}/">Xem chi tiết</a>
        </div>
      `).join('');
    } catch (error) {
      fundListElement.innerHTML = `<p class="error">${error.message}</p>`;
    }
  }

  async function createFund(event) {
    event.preventDefault();
    const name = document.getElementById('fund-name').value.trim();
    const description = document.getElementById('fund-description').value.trim();

    if (!name) {
      showNotification('Vui lòng nhập tên quỹ.', 'error');
      return;
    }

    try {
      await requestJson(`${apiBase}funds/`, {
        method: 'POST',
        body: { name, description },
      });
      showNotification('Tạo quỹ thành công.');
      document.getElementById('create-fund-form').reset();
      loadFunds();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  function bindListEvents() {
    const form = document.getElementById('create-fund-form');
    if (form) form.addEventListener('submit', createFund);
  }

  async function loadFundDetails() {
    const fundId = config.fundId;
    if (!fundId) return;

    try {
      const fund = await requestJson(`${apiBase}funds/${fundId}/`, { method: 'GET' });
      document.getElementById('fund-name').textContent = fund.name;
      document.getElementById('fund-description').textContent = fund.description || 'Không có mô tả';
      document.getElementById('fund-owner').textContent = fund.owner;
      document.getElementById('fund-members-count').textContent = fund.member_count;
      document.getElementById('fund-updated').textContent = new Date(fund.updated_at).toLocaleString('vi-VN');

      renderMembers(fund.members || []);
      fillExpenseMembers(fund.members || []);
      fillSettlementOptions(fund.members || []);
      loadBalances(fundId);
      loadExpenses(fundId);
      loadSettlements(fundId);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  function renderMembers(members) {
    const list = document.getElementById('fund-members');
    if (!list) return;
    if (!members.length) {
      list.innerHTML = '<li>Chưa có thành viên.</li>';
      return;
    }
    list.innerHTML = members.map(member => `
      <li><strong>${member.user}</strong> (${member.role})</li>
    `).join('');
  }

  function fillExpenseMembers(members) {
    const select = document.getElementById('expense-members');
    if (!select) return;
    select.innerHTML = members.map(member => `
      <option value="${member.user_id}">${member.user} (${member.role})</option>
    `).join('');
  }

  function fillSettlementOptions(members) {
    const select = document.getElementById('settlement-to');
    if (!select) return;
    select.innerHTML = members.map(member => `
      <option value="${member.user_id}">${member.user} (${member.role})</option>
    `).join('');
  }

  async function loadBalances(fundId) {
    const container = document.getElementById('balances-list');
    if (!container) return;
    container.innerHTML = '<p>Đang tải công nợ...</p>';

    try {
      const balances = await requestJson(`${apiBase}funds/${fundId}/balances/`, { method: 'GET' });
      if (!Array.isArray(balances) || balances.length === 0) {
        container.innerHTML = '<p>Chưa có dữ liệu công nợ.</p>';
        return;
      }

      container.innerHTML = balances.map(item => `
        <div class="balance-row ${item.balance < 0 ? 'negative' : 'positive'}">
          <strong>${item.username}</strong>
          <span>${item.balance.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = `<p class="error">${error.message}</p>`;
    }
  }

  async function loadExpenses(fundId) {
    const container = document.getElementById('expenses-list');
    if (!container) return;
    container.innerHTML = '<p>Đang tải chi tiêu...</p>';

    try {
      const expenses = await requestJson(`${apiBase}expenses/?fund=${fundId}`, { method: 'GET' });
      if (!Array.isArray(expenses) || expenses.length === 0) {
        container.innerHTML = '<p>Chưa có khoản chi nào.</p>';
        return;
      }

      container.innerHTML = expenses.map(expense => `
        <div class="transaction-row">
          <div><strong>${expense.description || 'Chi tiêu'}</strong></div>
          <div>${new Date(expense.date).toLocaleDateString('vi-VN')}</div>
          <div>${Number(expense.amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = `<p class="error">${error.message}</p>`;
    }
  }

  async function loadSettlements(fundId) {
    const container = document.getElementById('settlements-list');
    if (!container) return;
    container.innerHTML = '<p>Đang tải các thanh toán...</p>';

    try {
      const settlements = await requestJson(`${apiBase}settlements/?fund=${fundId}`, { method: 'GET' });
      if (!Array.isArray(settlements) || settlements.length === 0) {
        container.innerHTML = '<p>Chưa có thanh toán nào.</p>';
        return;
      }

      container.innerHTML = settlements.map(settlement => `
        <div class="transaction-row">
          <div><strong>${settlement.from_user}</strong> → <strong>${settlement.to_user}</strong></div>
          <div>${new Date(settlement.created_at).toLocaleDateString('vi-VN')}</div>
          <div>${Number(settlement.amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = `<p class="error">${error.message}</p>`;
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function bindModalEvents() {
    document.querySelectorAll('[data-close]').forEach(button => {
      button.addEventListener('click', () => closeModal(button.dataset.close));
    });

    document.getElementById('open-expense-modal')?.addEventListener('click', () => openModal('expense-modal'));
    document.getElementById('open-settlement-modal')?.addEventListener('click', () => openModal('settlement-modal'));
    document.getElementById('open-invite-modal')?.addEventListener('click', () => openModal('invite-modal'));

    document.getElementById('expense-form')?.addEventListener('submit', submitExpense);
    document.getElementById('settlement-form')?.addEventListener('submit', submitSettlement);
    document.getElementById('invite-form')?.addEventListener('submit', submitInvite);
  }

  async function submitExpense(event) {
    event.preventDefault();
    const fundId = config.fundId;
    if (!fundId) return;

    const amount = parseFloat(document.getElementById('expense-amount').value);
    const description = document.getElementById('expense-description').value.trim();
    const date = document.getElementById('expense-date').value;
    const selected = Array.from(document.querySelectorAll('#expense-members option:checked'));
    const members = selected.map(element => parseInt(element.value, 10));

    if (members.length === 0) {
      showNotification('Vui lòng chọn ít nhất 1 thành viên tham gia chia.', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showNotification('Số tiền phải lớn hơn 0.', 'error');
      return;
    }

    const splitAmount = Number((amount / members.length).toFixed(2));
    const splits = members.map(userId => ({ user: userId, amount_owed: splitAmount }));

    try {
      await requestJson(`${apiBase}expenses/`, {
        method: 'POST',
        body: { fund: fundId, amount, description, date, splits },
      });
      showNotification('Thêm chi tiêu thành công.');
      closeModal('expense-modal');
      document.getElementById('expense-form').reset();
      loadExpenses(fundId);
      loadBalances(fundId);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  async function submitSettlement(event) {
    event.preventDefault();
    const fundId = config.fundId;
    if (!fundId) return;

    const toUser = parseInt(document.getElementById('settlement-to').value, 10);
    const amount = parseFloat(document.getElementById('settlement-amount').value);

    if (!toUser || !amount || amount <= 0) {
      showNotification('Vui lòng nhập đầy đủ thông tin thanh toán.', 'error');
      return;
    }

    try {
      await requestJson(`${apiBase}settlements/`, {
        method: 'POST',
        body: { fund: fundId, to_user: toUser, amount },
      });
      showNotification('Thanh toán đã được ghi nhận.');
      closeModal('settlement-modal');
      document.getElementById('settlement-form').reset();
      loadSettlements(fundId);
      loadBalances(fundId);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  async function submitInvite(event) {
    event.preventDefault();
    const fundId = config.fundId;
    if (!fundId) return;

    const userId = parseInt(document.getElementById('invite-user-id').value, 10);
    const role = document.getElementById('invite-role').value;

    if (!userId) {
      showNotification('Vui lòng nhập user id của thành viên.', 'error');
      return;
    }

    try {
      await requestJson(`${apiBase}funds/${fundId}/invite/`, {
        method: 'POST',
        body: { user: userId, role },
      });
      showNotification('Mời thành viên thành công.');
      closeModal('invite-modal');
      document.getElementById('invite-form').reset();
      loadFundDetails();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  function bindFundDetailEvents() {
    bindModalEvents();
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  }

  if (!ensureLoggedIn()) {
    return;
  }

  const fundDetailPage = document.body?.dataset?.fundId;
  if (fundDetailPage) {
    loadFundDetails();
    bindFundDetailEvents();
  } else {
    loadFunds();
    bindListEvents();
  }
})();
