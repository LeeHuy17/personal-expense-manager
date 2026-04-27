/**
 * Pagination API
 * Gọi API lấy dữ liệu phân trang từ backend
 */

import {
  PaginationResponse,
  PaginationParams,
  Transaction,
} from '../types/pagination.types';

// ==============================
// BASE URL
// ==============================
const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  (import.meta.env.VITE_API_BASE as string) ||
  'http://127.0.0.1:8000/api';

if (!import.meta.env.VITE_BACKEND_URL) {
  console.warn('⚠️ Using fallback API URL:', BASE_URL);
}

// ==============================
// Helper: handle response
// ==============================
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore parse error
    }

    throw new Error(
      errorData?.message ||
        `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// ==============================
// Helper: transform pagination
// ==============================
function transformPagination<T>(data: any): PaginationResponse<T> {
  return {
    results: data.duLieu || [],
    count: data.phanTrang?.tongSoItem || 0,
    next: data.phanTrang?.coTrangSau
      ? `?page=${data.phanTrang.trangHienTai + 1}`
      : null,
    previous: data.phanTrang?.coTrangTruoc
      ? `?page=${data.phanTrang.trangHienTai - 1}`
      : null,

    currentPage: data.phanTrang?.trangHienTai || 1,
    totalPages: data.phanTrang?.tongSoTrang || 1,
    pageSize: data.phanTrang?.soItemMoiTrang || 10,
    hasNextPage: data.phanTrang?.coTrangSau || false,
    hasPrevPage: data.phanTrang?.coTrangTruoc || false,
  };
}

// ==============================
// Build query params
// ==============================
function buildQueryParams(params: PaginationParams): URLSearchParams {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    page_size: (params.page_size || 10).toString(),
  });

  if (params.keyword) queryParams.append('keyword', params.keyword);

  if (params.category && params.category !== 'all') {
    queryParams.append('category', params.category);
  }

  if (params.type && params.type !== 'all') {
    queryParams.append('type', params.type);
  }

  // ⚠️ Đổi theo backend nếu cần (snake_case vs camelCase)
  if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.append('dateTo', params.dateTo);

  return queryParams;
}

// ==============================
// API: Transactions
// ==============================
export async function fetchPaginatedTransactions(
  params: PaginationParams,
  token: string
): Promise<PaginationResponse<Transaction>> {
  const queryParams = buildQueryParams(params);

  const response = await fetch(
    `${BASE_URL}/search/transactions/?${queryParams}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await handleResponse(response);
  return transformPagination<Transaction>(data);
}

// ==============================
// API: Shared Fund Transactions
// ==============================
export async function fetchSharedTransactions(
  params: PaginationParams,
  token: string
): Promise<PaginationResponse<any>> {
  const queryParams = buildQueryParams(params);

  const response = await fetch(
    `${BASE_URL}/shared-fund/transactions/?${queryParams}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await handleResponse(response);
  return transformPagination<any>(data);
}

// ==============================
// API: Recent Searches
// ==============================
export async function fetchRecentSearches(
  token: string
): Promise<{ keyword: string; searched_at: string }[]> {
  const response = await fetch(
    `${BASE_URL}/search/recent-searches/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await handleResponse(response);
  return data.results || data;
}