/**
 * Pagination Hook (Vanilla TypeScript version)
 * Quản lý state và logic phân trang
 */

import { PaginationState, PaginationParams, PaginationResponse, Transaction } from '../types/pagination.types';
import { fetchPaginatedTransactions } from '../api/paginationApi';
import { updatePaginationState } from '../services/paginationService';

export class PaginationManager {
  private state: PaginationState = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  private data: Transaction[] = [];
  private isLoading: boolean = false;
  private error: string | null = null;
  private token: string;
  private pageSize: number;
  private lastParams: PaginationParams | null = null;

  // Callbacks
  private onStateChange: ((state: PaginationState) => void)[] = [];
  private onDataChange: ((data: Transaction[]) => void)[] = [];
  private onLoadingChange: ((isLoading: boolean) => void)[] = [];
  private onErrorChange: ((error: string | null) => void)[] = [];

  constructor(token: string, pageSize: number = 10) {
    this.token = token;
    this.pageSize = pageSize;
    this.state.pageSize = pageSize;
  }

  /**
   * Subscribe to state changes
   */
  onStateChangeListener(callback: (state: PaginationState) => void): () => void {
    this.onStateChange.push(callback);
    return () => {
      this.onStateChange = this.onStateChange.filter(cb => cb !== callback);
    };
  }

  onDataChangeListener(callback: (data: Transaction[]) => void): () => void {
    this.onDataChange.push(callback);
    return () => {
      this.onDataChange = this.onDataChange.filter(cb => cb !== callback);
    };
  }

  onLoadingChangeListener(callback: (isLoading: boolean) => void): () => void {
    this.onLoadingChange.push(callback);
    return () => {
      this.onLoadingChange = this.onLoadingChange.filter(cb => cb !== callback);
    };
  }

  onErrorChangeListener(callback: (error: string | null) => void): () => void {
    this.onErrorChange.push(callback);
    return () => {
      this.onErrorChange = this.onErrorChange.filter(cb => cb !== callback);
    };
  }

  /**
   * Private methods to notify listeners
   */
  private notifyStateChange() {
    this.onStateChange.forEach(cb => cb(this.state));
  }

  private notifyDataChange() {
    this.onDataChange.forEach(cb => cb(this.data));
  }

  private notifyLoadingChange() {
    this.onLoadingChange.forEach(cb => cb(this.isLoading));
  }

  private notifyErrorChange() {
    this.onErrorChange.forEach(cb => cb(this.error));
  }

  /**
   * Load page data
   */
  async loadPage(params: PaginationParams): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);
      this.lastParams = params;

      // Đảm bảo page_size
      const pageSize = params.page_size || this.pageSize;

      const response = await fetchPaginatedTransactions(
        { ...params, page_size: pageSize },
        this.token
      );

      // Update data
      this.data = response.results;
      this.notifyDataChange();

      // Update state
      this.state = updatePaginationState(params.page, pageSize, response.count);
      this.notifyStateChange();

      console.log(`✅ Loaded page ${params.page}, items: ${this.data.length}, total: ${response.count}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.setError(errorMsg);
      console.error('❌ Pagination error:', errorMsg);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(
    page: number,
    otherParams?: Omit<PaginationParams, 'page'>
  ): Promise<void> {
    const params: PaginationParams = {
      ...(otherParams || this.lastParams),
      page,
      page_size: this.pageSize,
    };

    await this.loadPage(params);
  }

  /**
   * Go to next page
   */
  async nextPage(otherParams?: Omit<PaginationParams, 'page'>): Promise<void> {
    if (this.state.hasNextPage) {
      await this.goToPage(this.state.currentPage + 1, otherParams);
    }
  }

  /**
   * Go to previous page
   */
  async prevPage(otherParams?: Omit<PaginationParams, 'page'>): Promise<void> {
    if (this.state.hasPrevPage) {
      await this.goToPage(this.state.currentPage - 1, otherParams);
    }
  }

  /**
   * Reset to first page
   */
  async resetToFirstPage(params?: PaginationParams): Promise<void> {
    const newParams: PaginationParams = {
      page: 1,
      page_size: this.pageSize,
      ...params,
    };
    await this.loadPage(newParams);
  }

  /**
   * Getters
   */
  getState(): PaginationState {
    return { ...this.state };
  }

  getData(): Transaction[] {
    return [...this.data];
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getError(): string | null {
    return this.error;
  }

  getLastParams(): PaginationParams | null {
    return this.lastParams;
  }

  /**
   * Private setters
   */
  private setLoading(value: boolean): void {
    this.isLoading = value;
    this.notifyLoadingChange();
  }

  private setError(value: string | null): void {
    this.error = value;
    this.notifyErrorChange();
  }

  /**
   * Update token (for login/logout scenarios)
   */
  updateToken(newToken: string): void {
    this.token = newToken;
  }
}

/**
 * Singleton instance
 */
let paginationManagerInstance: PaginationManager | null = null;

export function getPaginationManager(
  token?: string,
  pageSize?: number
): PaginationManager {
  if (!paginationManagerInstance) {
    paginationManagerInstance = new PaginationManager(token || '', pageSize || 10);
  }
  return paginationManagerInstance;
}

export function createPaginationManager(
  token: string,
  pageSize?: number
): PaginationManager {
  return new PaginationManager(token, pageSize || 10);
}
