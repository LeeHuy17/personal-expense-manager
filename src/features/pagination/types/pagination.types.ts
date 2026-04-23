/**
 * Pagination Types
 * Định nghĩa tất cả kiểu dữ liệu sử dụng trong phân trang
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  // Additional pagination info from custom API response
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PaginationParams {
  page: number;
  page_size?: number;
  keyword?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: 'income' | 'expense' | 'shared' | 'all';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  date: string;
  highlighted_description?: string;
  fund_name?: string;
  incomeId?: string;
  chiPhiId?: string;
}
