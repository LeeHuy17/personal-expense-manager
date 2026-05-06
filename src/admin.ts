import './index.css';
import { createIcons, icons } from 'lucide';
import { showToast } from './utils/toast';

const backendOrigin = (import.meta.env.VITE_BACKEND_URL as string) || (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:8000';
const API_BASE_URL = `${backendOrigin.replace(/\/$/, '')}/api`;

function buildAuthHeaders(options: RequestInit = {}) {
  let existingHeaders: Record<string, string> = {};

  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      existingHeaders[key] = value;
    });
  } else if (Array.isArray(options.headers)) {
    options.headers.forEach(([key, value]) => {
      existingHeaders[key] = String(value);
    });
  } else if (options.headers && typeof options.headers === 'object') {
    existingHeaders = { ...(options.headers as Record<string, string>) };
  }

  const token = localStorage.getItem('accessToken') || '';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...existingHeaders,
  };

  if (options.body !== undefined && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = token.startsWith('Token ') || token.startsWith('Bearer ')
      ? token
      : `Token ${token}`;
  }

  return headers;
}

async function authFetch(url: string, options: RequestInit = {}) {
  const isAbsoluteUrl = /^https?:\/\//i.test(url);
  const requestUrl = isAbsoluteUrl ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(requestUrl, {
    credentials: 'include',
    ...options,
    headers: buildAuthHeaders(options),
  });
  return response;
}

function isAdminUser() {
  return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('isAdmin') === 'true';
}

function setMessage(text: string, type: 'info' | 'error' = 'info') {
  const messageEl = document.getElementById('admin-message');
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.classList.remove('hidden');
  messageEl.classList.toggle('border-rose-200', type === 'error');
  messageEl.classList.toggle('bg-rose-50', type === 'error');
  messageEl.classList.toggle('text-rose-600', type === 'error');
  messageEl.classList.toggle('border-slate-200', type === 'info');
  messageEl.classList.toggle('bg-slate-50', type === 'info');
  messageEl.classList.toggle('text-slate-600', type === 'info');
}

async function loadAdminUsers() {
  const tableBody = document.getElementById('admin-users-table-body');
  const emptyEl = document.getElementById('admin-users-empty');
  const errorEl = document.getElementById('admin-users-error');

  if (tableBody) tableBody.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  try {
    const response = await authFetch('/accounts/users/');
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể tải danh sách người dùng.' }));
      throw new Error(err.detail || err.error || 'Không thể tải danh sách người dùng.');
    }

    const users = await response.json();
    if (!Array.isArray(users)) {
      throw new Error('Dữ liệu người dùng không hợp lệ.');
    }

    if (users.length === 0) {
      emptyEl?.classList.remove('hidden');
      return;
    }

    users.forEach((user: any) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-slate-100 dark:border-slate-800';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">${user.id}</td>
        <td class="px-4 py-3 text-sm">${user.username}</td>
        <td class="px-4 py-3 text-sm break-all">${user.email}</td>
        <td class="px-4 py-3 text-sm">${user.is_active ? 'Yes' : 'No'}</td>
        <td class="px-4 py-3 text-sm">${user.is_staff ? 'Yes' : 'No'}</td>
        <td class="px-4 py-3 text-sm">${user.date_joined ? new Date(user.date_joined).toLocaleString('vi-VN') : '-'}</td>
        <td class="px-4 py-3 text-sm">${user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : '-'}</td>
        <td class="px-4 py-3 text-sm flex gap-2">
          <button data-user-id="${user.id}" class="admin-delete-user px-3 py-2 bg-rose-500 text-white rounded-2xl text-xs font-semibold hover:bg-rose-600 transition">Xóa</button>
        </td>
      `;
      tableBody?.appendChild(row);
    });

    tableBody?.querySelectorAll('.admin-delete-user').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const userId = Number(target.dataset.userId);
        await deleteAdminUser(userId);
      });
    });

    if (typeof createIcons === 'function' && icons) {
      createIcons({ icons });
    }
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error instanceof Error ? error.message : 'Lỗi không xác định khi tải danh sách người dùng.';
      errorEl.classList.remove('hidden');
    }
  }
}

async function deleteAdminUser(userId: number) {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa người dùng này?');
  if (!confirmed) return;

  try {
    const response = await authFetch(`/accounts/users/${userId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể xóa người dùng.' }));
      throw new Error(err.detail || err.error || 'Không thể xóa người dùng.');
    }

    showToast('Người dùng đã được xóa thành công.', 'success');
    await loadAdminUsers();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Lỗi không xác định khi xóa người dùng.', 'error');
  }
}

async function loadAdminCategories() {
  const tableBody = document.getElementById('admin-categories-table-body');
  const emptyEl = document.getElementById('admin-categories-empty');
  const errorEl = document.getElementById('admin-categories-error');
  const userFilter = document.getElementById('admin-user-filter') as HTMLSelectElement | null;

  if (tableBody) tableBody.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  let filterParams = '';
  if (userFilter && userFilter.value) {
    filterParams = `?user_id=${encodeURIComponent(userFilter.value)}`;
  }

  try {
    const response = await authFetch(`/admin/categories/${filterParams}`);
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể tải danh sách danh mục.' }));
      throw new Error(err.detail || err.error || 'Không thể tải danh sách danh mục.');
    }

    const categories = await response.json();
    if (!Array.isArray(categories)) {
      throw new Error('Dữ liệu danh mục không hợp lệ.');
    }

    if (categories.length === 0) {
      emptyEl?.classList.remove('hidden');
      return;
    }

    categories.forEach((category: any) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-slate-100 dark:border-slate-800';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">${category.id || ''}</td>
        <td class="px-4 py-3 text-sm">${category.username || 'N/A'}</td>
        <td class="px-4 py-3 text-sm">${category.name || ''}</td>
        <td class="px-4 py-3 text-sm">${category.type || ''}</td>
        <td class="px-4 py-3 text-sm">${category.expense_count ?? 0}</td>
        <td class="px-4 py-3 text-sm">${category.income_count ?? 0}</td>
        <td class="px-4 py-3 text-sm flex flex-wrap gap-2">
          <button data-category-id="${category.id || ''}" class="admin-edit-category px-3 py-2 bg-slate-800 text-white rounded-2xl text-xs font-semibold hover:bg-slate-700 transition">Sửa</button>
          <button data-category-id="${category.id || ''}" class="admin-delete-category px-3 py-2 bg-rose-500 text-white rounded-2xl text-xs font-semibold hover:bg-rose-600 transition">Xóa</button>
        </td>
      `;
      tableBody?.appendChild(row);
    });

    tableBody?.querySelectorAll('.admin-edit-category').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const categoryId = Number(target.dataset.categoryId);
        const currentRow = target.closest('tr');
        const currentName = currentRow?.querySelector('td:nth-child(3)')?.textContent || '';
        const currentType = currentRow?.querySelector('td:nth-child(4)')?.textContent || '';
        const newName = prompt('Tên danh mục mới:', currentName);
        if (!newName) return;
        const newType = prompt('Loại danh mục mới (expense/income):', currentType) || currentType;
        await updateAdminCategory(categoryId, { tenLoai: newName.trim(), type: newType.trim() });
      });
    });

    tableBody?.querySelectorAll('.admin-delete-category').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const categoryId = Number(target.dataset.categoryId);
        await deleteAdminCategory(categoryId);
      });
    });

    if (typeof createIcons === 'function' && icons) {
      createIcons({ icons });
    }
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error instanceof Error ? error.message : 'Lỗi không xác định khi tải danh mục.';
      errorEl.classList.remove('hidden');
    }
  }
}

async function updateAdminCategory(categoryId: number, data: { tenLoai: string; type: string }) {
  try {
    const response = await authFetch(`/expenses/admin/categories/${categoryId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể cập nhật danh mục.' }));
      throw new Error(err.detail || err.error || 'Không thể cập nhật danh mục.');
    }

    showToast('Danh mục đã được cập nhật.', 'success');
    await loadAdminCategories();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Lỗi không xác định khi cập nhật danh mục.', 'error');
  }
}

async function deleteAdminCategory(categoryId: number) {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa danh mục này?');
  if (!confirmed) return;

  try {
    const response = await authFetch(`/expenses/admin/categories/${categoryId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể xóa danh mục.' }));
      throw new Error(err.detail || err.error || 'Không thể xóa danh mục.');
    }

    showToast('Danh mục đã được xóa.', 'success');
    await loadAdminCategories();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Lỗi không xác định khi xóa danh mục.', 'error');
  }
}

function populateUserFilter(users: any[]) {
  const userFilter = document.getElementById('admin-user-filter') as HTMLSelectElement | null;
  const fundOwnerFilter = document.getElementById('admin-fund-owner-filter') as HTMLSelectElement | null;

  const addOptions = (filter: HTMLSelectElement) => {
    filter.innerHTML = '<option value="">Tất cả người dùng</option>';
    users.forEach((user) => {
      const option = document.createElement('option');
      option.value = String(user.id);
      option.textContent = `${user.username} (${user.email})`;
      filter.appendChild(option);
    });
  };

  if (userFilter) addOptions(userFilter);
  if (fundOwnerFilter) addOptions(fundOwnerFilter);
}

async function loadAdminFunds() {
  const tableBody = document.getElementById('admin-funds-table-body');
  const emptyEl = document.getElementById('admin-funds-empty');
  const errorEl = document.getElementById('admin-funds-error');
  const userFilter = document.getElementById('admin-user-filter') as HTMLSelectElement | null;

  if (tableBody) tableBody.innerHTML = '';
  if (emptyEl) emptyEl.classList.add('hidden');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  let filterParams = '';
  const sharedFundOwnerFilter = document.getElementById('admin-fund-owner-filter') as HTMLSelectElement | null;
  const filterControl = sharedFundOwnerFilter || userFilter;
  if (filterControl && filterControl.value) {
    filterParams = `?owner_id=${encodeURIComponent(filterControl.value)}`;
  }

  try {
    const response = await authFetch(`/shared-fund/admin/funds/${filterParams}`);
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể tải danh sách quỹ chung.' }));
      throw new Error(err.detail || err.error || 'Không thể tải danh sách quỹ chung.');
    }

    const funds = await response.json();
    if (!Array.isArray(funds)) {
      throw new Error('Dữ liệu quỹ chung không hợp lệ.');
    }

    if (funds.length === 0) {
      emptyEl?.classList.remove('hidden');
      return;
    }

    funds.forEach((fund: any) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-slate-100 dark:border-slate-800';
      row.innerHTML = `
        <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">${fund.id || ''}</td>
        <td class="px-4 py-3 text-sm">${fund.name || ''}</td>
        <td class="px-4 py-3 text-sm">${fund.owner || ''}</td>
        <td class="px-4 py-3 text-sm">${fund.member_count ?? 0}</td>
        <td class="px-4 py-3 text-sm">${new Date(fund.created_at).toLocaleDateString('vi-VN')}</td>
        <td class="px-4 py-3 text-sm flex flex-wrap gap-2">
          <button data-fund-id="${fund.id || ''}" class="admin-edit-fund px-3 py-2 bg-slate-800 text-white rounded-2xl text-xs font-semibold hover:bg-slate-700 transition">Sửa</button>
          <button data-fund-id="${fund.id || ''}" class="admin-delete-fund px-3 py-2 bg-rose-500 text-white rounded-2xl text-xs font-semibold hover:bg-rose-600 transition">Xóa</button>
        </td>
      `;
      tableBody?.appendChild(row);
    });

    tableBody?.querySelectorAll('.admin-edit-fund').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const fundId = Number(target.dataset.fundId);
        const currentRow = target.closest('tr');
        const currentName = currentRow?.querySelector('td:nth-child(2)')?.textContent || '';
        const currentDescription = currentRow?.querySelector('td:nth-child(5)')?.textContent || '';
        const newName = prompt('Tên quỹ mới:', currentName);
        if (!newName) return;
        const newDescription = prompt('Mô tả quỹ mới:', currentDescription) || currentDescription;
        await updateAdminFund(fundId, { name: newName.trim(), description: newDescription.trim() });
      });
    });

    tableBody?.querySelectorAll('.admin-delete-fund').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const fundId = Number(target.dataset.fundId);
        await deleteAdminFund(fundId);
      });
    });

    if (typeof createIcons === 'function' && icons) {
      createIcons({ icons });
    }
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error instanceof Error ? error.message : 'Lỗi không xác định khi tải quỹ chung.';
      errorEl.classList.remove('hidden');
    }
  }
}

async function updateAdminFund(fundId: number, data: { name: string; description: string }) {
  try {
    const response = await authFetch(`/shared-fund/admin/funds/${fundId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể cập nhật quỹ chung.' }));
      throw new Error(err.detail || err.error || 'Không thể cập nhật quỹ chung.');
    }

    showToast('Quỹ chung đã được cập nhật.', 'success');
    await loadAdminFunds();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Lỗi không xác định khi cập nhật quỹ chung.', 'error');
  }
}

async function deleteAdminFund(fundId: number) {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa quỹ chung này?');
  if (!confirmed) return;

  try {
    const response = await authFetch(`/shared-fund/admin/funds/${fundId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        showNotAuthorized();
        return;
      }
      const err = await response.json().catch(() => ({ detail: 'Không thể xóa quỹ chung.' }));
      throw new Error(err.detail || err.error || 'Không thể xóa quỹ chung.');
    }

    showToast('Quỹ chung đã được xóa.', 'success');
    await loadAdminFunds();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Lỗi không xác định khi xóa quỹ chung.', 'error');
  }
}

function switchAdminTab(tab: 'users' | 'categories' | 'funds' | 'funds') {
  const usersSection = document.getElementById('admin-users-section');
  const categoriesSection = document.getElementById('admin-categories-section');
  const fundsSection = document.getElementById('admin-funds-section');
  const usersButton = document.getElementById('admin-tab-users');
  const categoriesButton = document.getElementById('admin-tab-categories');
  const fundsButton = document.getElementById('admin-tab-funds');

  if (tab === 'users') {
    usersSection?.classList.remove('hidden');
    categoriesSection?.classList.add('hidden');
    fundsSection?.classList.add('hidden');
    usersButton?.classList.add('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    usersButton?.classList.remove('text-slate-500', 'dark:text-slate-400');
    categoriesButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    categoriesButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    fundsButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    fundsButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    loadAdminUsers();
  } else if (tab === 'categories') {
    usersSection?.classList.add('hidden');
    categoriesSection?.classList.remove('hidden');
    fundsSection?.classList.add('hidden');
    categoriesButton?.classList.add('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    categoriesButton?.classList.remove('text-slate-500', 'dark:text-slate-400');
    usersButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    usersButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    fundsButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    fundsButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    loadAdminCategories();
  } else {
    usersSection?.classList.add('hidden');
    categoriesSection?.classList.add('hidden');
    fundsSection?.classList.remove('hidden');
    fundsButton?.classList.add('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    fundsButton?.classList.remove('text-slate-500', 'dark:text-slate-400');
    usersButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    usersButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    categoriesButton?.classList.add('text-slate-500', 'dark:text-slate-400');
    categoriesButton?.classList.remove('text-slate-900', 'dark:text-white', 'bg-white', 'dark:bg-slate-900');
    loadAdminFunds();
  }
}

function showNotAuthorized() {
  setMessage('Bạn không có quyền truy cập trang admin. Vui lòng đăng nhập bằng tài khoản admin.', 'error');
  document.getElementById('admin-users-section')?.classList.add('hidden');
  document.getElementById('admin-categories-section')?.classList.add('hidden');
}

function initAdminPage() {
  if (!isAdminUser()) {
    showNotAuthorized();
    return;
  }

  loadAdminUsers();
  loadAdminCategories();

  authFetch('/accounts/users/')
    .then(async (response) => {
      if (!response.ok) return [];
      return response.json();
    })
    .then((users) => {
      if (Array.isArray(users)) populateUserFilter(users);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-refresh-users-btn')?.addEventListener('click', async () => {
    await loadAdminUsers();
  });

  document.getElementById('admin-refresh-categories-btn')?.addEventListener('click', async () => {
    await loadAdminCategories();
  });

  document.getElementById('admin-tab-users')?.addEventListener('click', () => switchAdminTab('users'));
  document.getElementById('admin-tab-categories')?.addEventListener('click', () => switchAdminTab('categories'));
  document.getElementById('admin-tab-funds')?.addEventListener('click', () => switchAdminTab('funds'));
  document.getElementById('admin-user-filter')?.addEventListener('change', async () => {
    await loadAdminCategories();
    await loadAdminFunds();
  });
  document.getElementById('admin-fund-owner-filter')?.addEventListener('change', async () => {
    await loadAdminFunds();
  });

  initAdminPage();
});
