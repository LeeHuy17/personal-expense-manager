/**
 * Pagination Service
 * Xử lý business logic và utility functions cho phân trang
 */

import { PaginationState } from '../types/pagination.types';

/**
 * Tính tổng số trang
 */
export function calculateTotalPages(
  totalItems: number,
  pageSize: number
): number {
  if (totalItems === 0) return 1;
  return Math.ceil(totalItems / pageSize);
}

/**
 * Kiểm tra trang có hợp lệ không
 */
export function isValidPage(
  page: number,
  totalPages: number
): boolean {
  return page >= 1 && page <= totalPages;
}

/**
 * Lấy trang fallback nếu trang không hợp lệ
 */
export function getFallbackPage(
  requestedPage: number,
  totalPages: number
): number {
  if (totalPages === 0) return 1;
  if (requestedPage < 1) return 1;
  if (requestedPage > totalPages) return totalPages;
  return requestedPage;
}

/**
 * Format thông tin phân trang để hiển thị
 * Ví dụ: "Hiển thị 1 - 10 của 150 giao dịch"
 */
export function formatPaginationInfo(
  currentPage: number,
  pageSize: number,
  totalItems: number
): string {
  if (totalItems === 0) return 'Không có giao dịch nào';

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return `Hiển thị ${start} - ${end} của ${totalItems} giao dịch`;
}

/**
 * Tạo mảng số trang để hiển thị
 * Ví dụ: [1, 2, 3, '...', 10]
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | string)[] {
  const pages: (number | string)[] = [];

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Hiển thị trang đầu
  pages.push(1);

  // Kiểm tra khoảng cách
  if (currentPage > 3) {
    pages.push('...');
  }

  // Hiển thị các trang xung quanh trang hiện tại
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  // Kiểm tra khoảng cách cuối
  if (currentPage < totalPages - 2) {
    pages.push('...');
  }

  // Hiển thị trang cuối
  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Cập nhật state phân trang
 */
export function updatePaginationState(
  currentPage: number,
  pageSize: number,
  totalItems: number
): PaginationState {
  const totalPages = calculateTotalPages(totalItems, pageSize);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Kiểm tra xem filter có thay đổi không
 */
export function isFilterChanged(
  oldFilter: Record<string, any>,
  newFilter: Record<string, any>
): boolean {
  return JSON.stringify(oldFilter) !== JSON.stringify(newFilter);
}
