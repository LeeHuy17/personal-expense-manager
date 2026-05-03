/**
 * Pagination Controls Component
 * UI component để hiển thị điều khiển phân trang
 */

import { PaginationState } from '../types/pagination.types';
import { generatePageNumbers, formatPaginationInfo } from '../services/paginationService';

export class PaginationControls {
  private container: HTMLElement;
  private state: PaginationState;
  private onPrevious: (() => void) | null = null;
  private onNext: (() => void) | null = null;
  private onPageClick: ((page: number) => void) | null = null;
  private isLoading: boolean = false;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = el;
    this.state = {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  /**
   * Set pagination state
   */
  setState(state: PaginationState): void {
    this.state = state;
    this.render();
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.render();
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: {
    onPrevious?: () => void;
    onNext?: () => void;
    onPageClick?: (page: number) => void;
  }): void {
    this.onPrevious = handlers.onPrevious || null;
    this.onNext = handlers.onNext || null;
    this.onPageClick = handlers.onPageClick || null;
  }

  /**
   * Render component
   */
  render(): void {
    const pageNumbers = generatePageNumbers(this.state.currentPage, this.state.totalPages);
    const paginationInfo = formatPaginationInfo(
      this.state.currentPage,
      this.state.pageSize,
      this.state.totalItems
    );

    this.container.innerHTML = `
      <div class="flex flex-col gap-4 p-4 border-t border-slate-200 dark:border-slate-700">
        <!-- Pagination Info -->
        <div class="text-sm text-slate-500 dark:text-slate-400">
          ${paginationInfo}
        </div>

        <!-- Pagination Controls -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Previous Button -->
          <button
            id="pagination-prev"
            ${!this.state.hasPrevPage || this.isLoading ? 'disabled' : ''}
            class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                   hover:bg-slate-50 dark:hover:bg-slate-800 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-sm font-medium transition-colors"
          >
            ← Trước
          </button>

          <!-- Page Numbers -->
          <div class="flex items-center gap-1">
            ${pageNumbers
              .map((page) => {
                if (page === '...') {
                  return `<span class="px-2 py-1 text-slate-400">...</span>`;
                }

                const isActive = this.state.currentPage === page;
                return `
                  <button
                    data-page="${page}"
                    class="w-8 h-8 rounded-lg text-sm font-medium
                           ${
                             isActive
                               ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                               : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                           }
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all"
                    ${this.isLoading ? 'disabled' : ''}
                  >
                    ${page}
                  </button>
                `;
              })
              .join('')}
          </div>

          <!-- Next Button -->
          <button
            id="pagination-next"
            ${!this.state.hasNextPage || this.isLoading ? 'disabled' : ''}
            class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg 
                   hover:bg-slate-50 dark:hover:bg-slate-800 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-sm font-medium transition-colors"
          >
            Sau →
          </button>

          <!-- Loading Indicator -->
          ${
            this.isLoading
              ? `
            <div class="ml-auto flex items-center gap-2 text-sm text-slate-400">
              <div class="w-4 h-4 border-2 border-slate-300 border-t-orange-600 rounded-full animate-spin"></div>
              <span>Đang tải...</span>
            </div>
          `
              : ''
          }
        </div>

        <!-- Page Info -->
        <div class="text-xs text-slate-400 dark:text-slate-500">
          Trang ${this.state.currentPage} / ${this.state.totalPages}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Previous button
    const prevBtn = this.container.querySelector('#pagination-prev') as HTMLButtonElement;
    if (prevBtn && this.onPrevious) {
      prevBtn.addEventListener('click', () => {
        if (!this.isLoading && this.state.hasPrevPage) {
          this.onPrevious?.();
        }
      });
    }

    // Next button
    const nextBtn = this.container.querySelector('#pagination-next') as HTMLButtonElement;
    if (nextBtn && this.onNext) {
      nextBtn.addEventListener('click', () => {
        if (!this.isLoading && this.state.hasNextPage) {
          this.onNext?.();
        }
      });
    }

    // Page number buttons
    const pageButtons = this.container.querySelectorAll('[data-page]') as NodeListOf<HTMLButtonElement>;
    pageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.isLoading && this.onPageClick) {
          const page = parseInt(btn.dataset.page!, 10);
          if (!isNaN(page)) {
            this.onPageClick(page);
          }
        }
      });
    });
  }

  /**
   * Clear component
   */
  clear(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Helper function to create pagination controls
 */
export function createPaginationControls(
  containerId: string,
  state: PaginationState,
  handlers: {
    onPrevious?: () => void;
    onNext?: () => void;
    onPageClick?: (page: number) => void;
  }
): PaginationControls {
  const controls = new PaginationControls(containerId);
  controls.setState(state);
  controls.setHandlers(handlers);
  controls.render();
  return controls;
}
