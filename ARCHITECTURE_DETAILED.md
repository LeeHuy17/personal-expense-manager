# Architecture Chi Tiết: Các Chức Năng Chính

## 1. SHARED FUND (Quỹ Chung)

### 1.1 Cấu Trúc (Structure)

#### Backend
```
backend/shared_fund/
├── models/
│   ├── fund.py              # SharedFund, FundMember
│   ├── expense.py           # Expense, ExpenseSplit
│   ├── settlement.py        # Settlement
│   ├── invitation.py        # FundInvitation
│   └── member.py            # FundMember (role: member/owner)
├── views/
│   ├── fund_views.py        # SharedFundViewSet, FundMemberSerializer
│   ├── expense_views.py     # ExpenseViewSet
│   ├── settlement_views.py  # SettlementViewSet
│   └── invitation_views.py  # FundInvitationViewSet
├── serializers/
│   ├── fund_serializer.py
│   ├── expense_serializer.py
│   ├── settlement_serializer.py
│   └── invitation_serializer.py
├── services/
│   ├── fund_service.py
│   ├── balance_service.py   # calculate_fund_balances()
│   └── settlement_service.py
└── urls.py                  # Router cho fund, expense, settlement, invitation
```

#### Frontend
```
src/main.ts
├── Constants
│   └── sharedFundApiBase = /api/shared-fund/
├── Global State
│   ├── currentSharedFundId (number | null)
│   ├── currentSharedFundMembers (array)
│   ├── currentInvitations (array)
│   └── invitationPollingInterval
└── Functions
    ├── fetchSharedFundData()        # API wrapper
    ├── loadSharedFunds()            # GET funds/
    ├── loadInvitations()            # GET invitations/
    ├── loadSelectedFundDetails()    # GET funds/{id}/ + expenses + settlements + balances
    ├── submitSharedFundExpense()    # POST expenses/
    ├── submitSharedFundSettlement() # POST settlements/
    ├── submitSharedFundInvite()     # POST funds/{id}/invite/
    ├── renderSharedFundList()
    ├── renderSharedFundExpenses()
    ├── renderSharedFundSettlements()
    ├── renderSharedFundBalances()
    ├── renderExpenseSplitDetails()  # Thay đổi UI theo split type
    ├── updateNotificationBadge()
    ├── startInvitationPolling()     # Poll invitations mỗi 3 giây
    └── stopInvitationPolling()
```

### 1.2 Cách Hoạt Động (How It Works)

**Flow 1: Tạo Quỹ Chung**
1. User nhấn "Tạo quỹ mới"
2. Form gửi POST `/api/shared-fund/funds/` với `{ name, description }`
3. Backend: `SharedFundViewSet.perform_create()` tạo fund + tự động thêm owner như member
4. Frontend nhận response, reload danh sách quỹ, render UI

**Flow 2: Mời Thành Viên**
1. User chọn quỹ → chọn user_id + role (Member/Owner)
2. Form gửi POST `/api/shared-fund/funds/{id}/invite/` với `{ user, role }`
3. Backend: Kiểm tra owner, tạo FundInvitation, trả về success
4. Frontend: hiển thị toast, reload invitations badge

**Flow 3: Ghi Chi Tiêu Nhóm**
1. User nhập: mô tả, số tiền, ngày, chọn thành viên, loại chia (equal/percentage/custom)
2. Nếu "equal": tính toán tự động chia đều + phần dư cho người cuối
3. Nếu "percentage" hoặc "custom": lấy input từ các field chia
4. Build payload: `{ fund, amount, description, date, split_type, splits: [{user, amount_owed}] }`
5. POST `/api/shared-fund/expenses/` → Backend tạo Expense + ExpenseSplit
6. Frontend reload chi tiêu danh sách

**Flow 4: Xem Công Nợ**
1. User click vào quỹ
2. Frontend gọi GET `/api/shared-fund/funds/{id}/balances/`
3. Backend: `calculate_fund_balances(fund)` tính net payment cho mỗi thành viên
4. Render bảng công nợ

### 1.3 Logic Trọng Tâm (Core Logic)

**Backend: calculate_fund_balances() - Chi tiết từng bước**
```python
from django.db.models import Sum
from shared_fund.models import Expense, ExpenseSplit, FundMember, Settlement

def calculate_fund_balances(fund):
    # Step 1: Tạo structure balance cho tất cả members
    members = FundMember.objects.filter(fund=fund).select_related('user')
    balances = {}
    
    for membership in members:
        balances[membership.user.id] = {
            'user_id': membership.user.id,
            'username': membership.user.username,
            'role': membership.role,
            'paid': 0.0,      # Tổng tiền user chi ra
            'owed': 0.0,      # Tổng tiền user phải trả
            'sent': 0.0,      # Tiền thanh toán gửi đi
            'received': 0.0,  # Tiền thanh toán nhận được
            'balance': 0.0,   # Net: paid - owed - sent + received
        }
    
    # Step 2: Tính tổng tiền mỗi user chi ra (paid)
    # SELECT created_by, SUM(amount) FROM Expense WHERE fund=fund GROUP BY created_by
    paid_rows = Expense.objects.filter(fund=fund).values('created_by').annotate(
        total_paid=Sum('amount')
    )
    for row in paid_rows:
        user_id = row['created_by']
        if user_id in balances:
            balances[user_id]['paid'] = float(row['total_paid'] or 0.0)
    
    # Step 3: Tính tổng tiền mỗi user phải trả (owed)
    # SELECT user, SUM(amount_owed) FROM ExpenseSplit WHERE expense.fund=fund GROUP BY user
    owed_rows = ExpenseSplit.objects.filter(
        expense__fund=fund
    ).values('user').annotate(total_owed=Sum('amount_owed'))
    for row in owed_rows:
        user_id = row['user']
        if user_id in balances:
            balances[user_id]['owed'] = float(row['total_owed'] or 0.0)
    
    # Step 4: Tính tiền thanh toán gửi đi (sent)
    sent_rows = Settlement.objects.filter(
        fund=fund
    ).values('from_user').annotate(total_sent=Sum('amount'))
    for row in sent_rows:
        user_id = row['from_user']
        if user_id in balances:
            balances[user_id]['sent'] = float(row['total_sent'] or 0.0)
    
    # Step 5: Tính tiền thanh toán nhận được (received)
    received_rows = Settlement.objects.filter(
        fund=fund
    ).values('to_user').annotate(total_received=Sum('amount'))
    for row in received_rows:
        user_id = row['to_user']
        if user_id in balances:
            balances[user_id]['received'] = float(row['total_received'] or 0.0)
    
    # Step 6: Tính final balance cho mỗi user
    # Công thức: balance = paid - owed - sent + received
    # - Nếu > 0: user được thanh toán (người khác phải trả cho user)
    # - Nếu < 0: user phải thanh toán (user phải trả cho người khác)
    for data in balances.values():
        data['balance'] = round(
            data['paid'] - data['owed'] - data['sent'] + data['received'],
            2
        )
    
    # Step 7: Sắp xếp theo balance (từ cao nhất đến thấp nhất)
    return sorted(
        balances.values(),
        key=lambda x: x['balance'],
        reverse=True
    )
```

**Frontend: submitSharedFundExpense() - Chi tiết từng bước**
```typescript
async function submitSharedFundExpense(event: SubmitEvent) {
  event.preventDefault();
  
  // Step 1: Validation
  if (!currentSharedFundId) {
    showSharedFundNotice('Vui lòng chọn quỹ trước khi thêm chi tiêu.', 'error');
    return;
  }
  
  const descInput = document.getElementById('shared-fund-expense-desc') as HTMLInputElement;
  const amountInput = document.getElementById('shared-fund-expense-amount') as HTMLInputElement;
  const dateInput = document.getElementById('shared-fund-expense-date') as HTMLInputElement;
  const membersSelect = document.getElementById('shared-fund-expense-members') as HTMLSelectElement;
  const splitTypeSelect = document.getElementById('shared-fund-expense-split-type') as HTMLSelectElement;
  
  const amount = Number(amountInput.value);
  const description = descInput.value.trim();
  const date = dateInput.value;
  const splitType = splitTypeSelect?.value || 'equal';
  const selected = Array.from(membersSelect.selectedOptions).map(opt => Number(opt.value));
  
  if (!amount || amount <= 0) {
    showSharedFundNotice('Số tiền phải lớn hơn 0.', 'error');
    return;
  }
  if (!selected.length) {
    showSharedFundNotice('Vui lòng chọn ít nhất một thành viên.', 'error');
    return;
  }
  
  // Step 2: Tính toán chia chi tiêu
  let splits = [];
  
  if (splitType === 'equal') {
    // === CHIA ĐỀU ===
    // Công thức: roundedShare = floor((amount / count) * 100) / 100
    // Mục đích: Tránh lỗi làm tròn, ví dụ 100.000 / 3 users
    //   - roundedShare = floor(33333.33 * 100) / 100 = 33333.00
    //   - User 1: 33333, User 2: 33333, User 3: 100000 - 66666 = 33334 (nhận phần dư)
    
    const roundedShare = Math.floor((amount / selected.length) * 100) / 100;
    splits = selected.map((userId, index) => {
      // User cuối cùng nhận phần dư để tổng bằng amount
      const remainder = index === selected.length - 1 
        ? roundToTwo(amount - roundedShare * (selected.length - 1)) 
        : roundedShare;
      
      return {
        user: userId,
        amount_owed: remainder
      };
    });
  } 
  else if (splitType === 'percentage' || splitType === 'custom') {
    // === CHIA THEO % HOẶC SỐ TIỀN TÙY CHỈNH ===
    // Đọc từ các input field: #shared-fund-split-details input[data-split-user-id]
    // Mỗi input có data-split-user-id="123" và value="25%" hoặc "25000"
    
    const splitInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        '#shared-fund-split-details input[data-split-user-id]'
      )
    );
    
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
      
      if (splitType === 'percentage') {
        // Chuyển % thành số tiền: amount_owed = (value% / 100) * amount
        return {
          user: userId,
          percentage: roundToTwo(value)
        };
      } else {
        // Custom amount: giá trị trực tiếp là số tiền
        return {
          user: userId,
          amount_owed: roundToTwo(value)
        };
      }
    });
  }
  
  // Step 3: Build payload
  const payload = {
    fund: currentSharedFundId,
    amount,
    description,
    date,
    split_type: splitType,  // 'equal', 'percentage', 'custom'
    splits  // [{ user, amount_owed }, ...] hoặc [{ user, percentage }, ...]
  };
  
  console.log('Expense payload:', payload);
  
  // Step 4: Gửi POST request
  try {
    await fetchSharedFundData('expenses/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    showSharedFundNotice('Chi tiêu đã được ghi nhận.', 'success');
    
    // Step 5: Reset form
    descInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
    membersSelect.selectedIndex = -1;
    
    // Step 6: Reload dữ liệu
    await loadSelectedFundDetails(currentSharedFundId);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi ghi chi tiêu.';
    showSharedFundNotice(message, 'error');
  }
}

**Frontend: loadSelectedFundDetails() - Chi tiết**
```typescript
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

**Frontend: submitSharedFundSettlement() - Chi tiết**
```typescript
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
```

**Frontend: fetchSharedFundData() - Chi tiết**
```typescript
async function fetchSharedFundData(path: string, options: RequestInit = {}) {
  const response = await fetch(`${sharedFundApiBase}${path}`, {
    credentials: 'include',
    headers: getSharedFundHeaders(Boolean(options.body === undefined ? true : options.body)),
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    console.error('❌ API Error:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      isJson,
      payload,
      url: `${sharedFundApiBase}${path}`
    });

    let message = response.statusText || 'Lỗi khi kết nối quỹ chung.';
    if (isJson && payload) {
      if (payload.detail) {
        message = payload.detail;
      } else if (payload.message) {
        message = payload.message;
      } else if (payload.user) {
        message = Array.isArray(payload.user) ? payload.user.join(' ') : String(payload.user);
      } else if (payload.role) {
        message = Array.isArray(payload.role) ? payload.role.join(' ') : String(payload.role);
      } else if (typeof payload === 'object') {
        const fieldErrors = Object.values(payload)
          .flatMap((value) => Array.isArray(value) ? value : [String(value)])
          .filter(Boolean)
          .map(String);
        if (fieldErrors.length) {
          message = fieldErrors.join(' ');
        } else {
          message = JSON.stringify(payload);
        }
      }
    } else if (typeof payload === 'string' && payload.trim()) {
      message = payload;
    }
    throw new Error(message);
  }

  return payload;
}
```

**Frontend: Polling Invitations - Chi tiết**
```typescript
let invitationPollingInterval: any = null;
let currentInvitations: any[] = [];

// Bắt đầu polling lời mời mỗi 3 giây
function startInvitationPolling() {
  if (invitationPollingInterval) {
    return; // Đã đang polling
  }
  
  // Load ngay lần đầu
  loadInvitations();
  
  // Sau đó poll mỗi 3000ms
  invitationPollingInterval = setInterval(loadInvitations, 3000);
  console.log('✅ Bắt đầu polling lời mời (3s interval)');
}

async function loadInvitations() {
  try {
    const response = await fetchSharedFundData('invitations/');
    currentInvitations = response || [];
    
    // Cập nhật badge số lượng lời mời
    updateNotificationBadge(currentInvitations.length);
    
    // Render lời mời UI
    renderInvitationsList(currentInvitations);
    
  } catch (error) {
    console.error('Error loading invitations:', error);
  }
}

function stopInvitationPolling() {
  if (invitationPollingInterval) {
    clearInterval(invitationPollingInterval);
    invitationPollingInterval = null;
    console.log('🛑 Dừng polling lời mời');
  }
}

async function handleAcceptInvitation(invitationId: number) {
  try {
    // POST /api/shared-fund/invitations/{id}/accept/
    await fetchSharedFundData(`invitations/${invitationId}/accept/`, {
      method: 'POST'
    });
    
    showSharedFundNotice('Đã chấp nhận lời mời.', 'success');
    
    // Reload lời mời + dữ liệu quỹ
    await loadInvitations();
    await loadSharedFunds();
    
  } catch (error) {
    showSharedFundNotice('Lỗi chấp nhận lời mời.', 'error');
  }
}
```

---

## 2. SEARCH FILTER (Tìm Kiếm & Lọc)

### 2.1 Cấu Trúc (Structure)

#### Backend
```
backend/search_filter/
├── models.py                # RecentSearch(user, keyword, searched_at)
├── views.py                 # TransactionSearchView, RecentSearchView
├── services.py              # TransactionSearchService
├── filters.py               # parse_date(), parse_float(), parse_int()
├── serializers.py           # TransactionSerializer
├── utils.py                 # highlight_keyword()
└── urls.py                  # POST /search/transactions/, GET /search/recent-searches/
```

#### Frontend
```
src/main.ts
├── Private Fields
│   ├── searchInput: HTMLInputElement
│   ├── filterCategory: HTMLSelectElement
│   ├── dateFrom: string
│   ├── dateTo: string
│   ├── sortBy: string (date-desc, date-asc, amount-desc, amount-asc, category)
│   ├── searchTimeout: ReturnType<typeof setTimeout>
│   ├── currentPage: number
│   └── itemsPerPage: number
├── Functions
│   ├── handleFilterChange()           # Chính: gọi loadTransactions()
│   ├── loadTransactions()             # GET /search/transactions/ + pagination
│   ├── renderTransactionList()        # Hiển thị results + pagination controls
│   ├── loadRecentSearches()           # GET /search/recent-searches/
│   ├── renderRecentSearches()         # Hiển thị dropdown
│   ├── clearFilters()                 # Reset tất cả filter
│   └── hideRecentSearches()           # Ẩn dropdown
└── Event Listeners
    ├── searchInput: input (500ms debounce)
    ├── searchInput: focus (load recent)
    ├── searchInput: blur (delay hide)
    ├── document: click outside (hide recent)
    ├── filterCategory: change
    ├── dateFrom/dateTo: change
    └── sortBy: change
```

### 2.2 Cách Hoạt Động (How It Works)

**Flow: Tìm Kiếm & Lọc**
1. User nhập keyword/chọn filter → 500ms debounce → handleFilterChange()
2. handleFilterChange() gọi loadTransactions()
3. loadTransactions() build query params:
   ```
   keyword=abc&dateFrom=2024-01-01&dateTo=2024-12-31&category=1
   &type=expense&sort=date-desc&page=1&page_size=10
   ```
4. GET `/api/search/transactions/?...` → backend parse params
5. Backend TransactionSearchService.search_transactions():
   - Lọc ChiPhi (expense) theo keyword, date, category, amount
   - Lọc ThuNhap (income) theo keyword, date, category, amount
   - Lọc SharedExpense (shared) theo keyword, date, amount
   - Merge + sort theo sort_by
   - Paginate: slice(skip, skip+pageSize)
   - Trả về: `{ duLieu, phanTrang: { trangHienTai, tongSoTrang, tongSoItem, ... } }`
6. Frontend nhận response → renderTransactionList() → hiển thị + pagination controls
7. Nếu keyword: save_recent_search()

**Flow: Xem Recent Searches**
1. User click vào search input
2. loadRecentSearches() → GET `/api/search/recent-searches/`
3. Backend RecentSearchView trả về 10 searches cuối (order_by -searched_at)
4. renderRecentSearches() hiển thị dropdown
5. Click vào 1 keyword → search lại + loadRecentSearches()

### 2.3 Logic Trọng Tâm (Core Logic)

**Backend: TransactionSearchService.search_transactions() - Chi tiết**
```python
from django.db.models import Q, F
from expenses.models import ChiPhi, ThuNhap, Loai
from shared_fund.models import Expense as SharedExpense, FundMember
from .utils import highlight_keyword

class TransactionSearchService:
    def search_transactions(self, user, keyword='', date_from=None, date_to=None, 
                          category=None, transaction_type=None, amount_min=None, 
                          amount_max=None, sort_by='date-desc'):
        transactions = []
        keyword = keyword.strip() if keyword else ''
        
        # === 1. Filter PERSONAL EXPENSES ===
        if transaction_type in [None, 'expense', 'all']:
            # Base query
            expenses = ChiPhi.objects.filter(user=user).select_related('loai')
            
            # Apply keyword filter (search by description OR category name)
            if keyword:
                expenses = expenses.filter(
                    Q(moTa__icontains=keyword) |              # Tìm trong description
                    Q(loai__tenLoai__icontains=keyword)       # Tìm trong category name
                )
            
            # Apply date range filter
            if date_from:
                expenses = expenses.filter(date__gte=date_from)
            if date_to:
                expenses = expenses.filter(date__lte=date_to)
            
            # Apply category filter
            if category:
                expenses = expenses.filter(loai__loaiId=category)
            
            # Apply amount range filter
            if amount_min:
                expenses = expenses.filter(amount__gte=amount_min)
            if amount_max:
                expenses = expenses.filter(amount__lte=amount_max)
            
            # Convert to dict format
            for exp in expenses:
                desc = exp.moTa or ''
                transactions.append({
                    'id': exp.chiPhiId,
                    'type': 'expense',
                    'amount': exp.amount,
                    'date': exp.date,
                    'description': desc,
                    'highlighted_description': highlight_keyword(desc, keyword),
                    'category_name': exp.loai.tenLoai if exp.loai else '',
                    'category_type': exp.loai.type if exp.loai else '',
                    'fund_name': None,
                })
        
        # === 2. Filter PERSONAL INCOMES ===
        if transaction_type in [None, 'income', 'all']:
            incomes = ThuNhap.objects.filter(user=user).select_related('loai')
            # Apply same filters as expenses...
            for inc in incomes:
                desc = inc.moTa or ''
                transactions.append({
                    'id': inc.incomeId,
                    'type': 'income',
                    'amount': inc.amount,
                    'date': inc.date,
                    'description': desc,
                    'highlighted_description': highlight_keyword(desc, keyword),
                    'category_name': inc.loai.tenLoai if inc.loai else '',
                    'category_type': inc.loai.type if inc.loai else '',
                    'fund_name': None,
                })
        
        # === 3. Filter SHARED EXPENSES ===
        if transaction_type in [None, 'shared', 'all']:
            # Tìm tất cả quỹ mà user là member
            user_funds = FundMember.objects.filter(user=user).values_list('fund', flat=True)
            
            shared_expenses = SharedExpense.objects.filter(
                fund__in=user_funds
            ).select_related('fund')
            
            if keyword:
                shared_expenses = shared_expenses.filter(description__icontains=keyword)
            if date_from:
                shared_expenses = shared_expenses.filter(date__gte=date_from)
            if date_to:
                shared_expenses = shared_expenses.filter(date__lte=date_to)
            if amount_min:
                shared_expenses = shared_expenses.filter(amount__gte=amount_min)
            if amount_max:
                shared_expenses = shared_expenses.filter(amount__lte=amount_max)
            
            for exp in shared_expenses:
                desc = exp.description or ''
                transactions.append({
                    'id': exp.id,
                    'type': 'shared',
                    'amount': exp.amount,
                    'date': exp.date,
                    'description': desc,
                    'highlighted_description': highlight_keyword(desc, keyword),
                    'category_name': None,  # Shared expenses không có category
                    'category_type': None,
                    'fund_name': exp.fund.name,
                })
        
        # === 4. SORT transactions ===
        if sort_by == 'date-desc':
            transactions.sort(key=lambda x: x['date'], reverse=True)
        elif sort_by == 'date-asc':
            transactions.sort(key=lambda x: x['date'])
        elif sort_by == 'amount-desc':
            transactions.sort(key=lambda x: x['amount'], reverse=True)
        elif sort_by == 'amount-asc':
            transactions.sort(key=lambda x: x['amount'])
        elif sort_by == 'category':
            transactions.sort(
                key=lambda x: (x['category_name'] or '', x['date']),
                reverse=True
            )
        
        return transactions  # Chưa paginate ở đây, paginate ở TransactionSearchView
    
    def save_recent_search(self, user, keyword):
        '''Lưu keyword vào RecentSearch (max 10 searches)'''
        if keyword and len(keyword.strip()) > 0:
            RecentSearch.objects.update_or_create(
                user=user,
                keyword=keyword.strip(),
                defaults={}  # Tự động cập nhật searched_at
            )
            
            # Giữ chỉ 10 searches mới nhất
            recent_searches_to_delete = RecentSearch.objects.filter(
                user=user
            ).order_by('-searched_at').values_list('pk', flat=True)[10:]
            
            if recent_searches_to_delete:
                RecentSearch.objects.filter(
                    pk__in=list(recent_searches_to_delete)
                ).delete()
```

**Frontend: loadPaginatedTransactions() - Chi tiết**
```typescript
private async loadPaginatedTransactions(page: number = 1): Promise<void> {
  try {
    const token = localStorage.getItem('accessToken') || '';
    this.paginationManager.updateToken(token);
    
    // Step 1: Build filter parameters
    const params = {
      page,                    // Trang hiện tại (1-indexed)
      page_size: this.itemsPerPage,  // Số item mỗi trang (default: 10)
      keyword: this.searchInput.value.trim(),
      category: this.filterCategory.value && this.filterCategory.value !== 'all' 
        ? this.filterCategory.value 
        : undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      sort: this.sortBy,  // 'date-desc', 'amount-asc', etc.
    };
    
    // Step 2: Gọi PaginationManager.loadPage()
    await this.paginationManager.loadPage(params);
    
    // Step 3: Lấy dữ liệu đã paginate từ manager
    this.transactions = this.paginationManager.getData();
    
    // Step 4: Render transaction list
    this.render(true);
    
    // Step 5: Render pagination controls (Previous, 1, 2, 3, Next)
    this.renderPaginationControls();
    
  } catch (error) {
    console.error('Failed to load paginated transactions:', error);
    
    // Fallback: tải toàn bộ và paginate locally
    const fetchedTransactions = await this.fetchTransactions();
    this.transactions = fetchedTransactions;
    this.render(true);
  }
}

private async handleFilterChange(): Promise<void> {
  // Khi user thay đổi filter (search, category, date, sort)
  // → Reset về trang 1
  if (this.isLoggedIn) {
    await this.loadPaginatedTransactions(1);  // Load trang 1 với filter mới
  } else {
    this.render();
  }
  
  // Sync filter state vào URL query params
  this.syncFiltersToURL();
}
```

---

## 3. AI INTEGRATION (Tích Hợp AI Gemini/Groq)

### 3.1 Cấu Trúc (Structure)

#### Backend
```
backend/ai/
├── services.py              # get_ai_advice(), _get_groq_response(), _get_gemini_response()
├── views.py                 # ChatAPIView (POST /api/ai/chat/)
├── urls.py                  # path('chat/', ChatAPIView.as_view())
└── static/ai/ai_chat.css
```

#### Frontend
```
src/ai/
├── ai_chat.js               # initAIChat(), askAI(), formatMarkdown()
└── ai_chat.css

src/main.ts
├── Global
│   └── const genAI = new GoogleGenerativeAI(API_KEY)  // Direct Gemini
└── Functions
    └── getAIAdvice()        // Call /api/ai/chat/ + renderMessage()
```

### 3.2 Cách Hoạt Động (How It Works)

**Flow: Chat với AI**
1. User nhập question → Click "Gửi"
2. Frontend askAI():
   ```
   POST /api/ai/chat/ { message: question }
   Headers: { Authorization: Token <token> }
   ```
3. Backend ChatAPIView.post():
   - Extract message từ request.data
   - Gọi get_ai_advice(user, message)
4. Backend get_ai_advice():
   ```
   a) Check _is_finance_question(question)
   
   b) Nếu YES (finance question):
      - _get_financial_summary(user)
        → tính month/week/year chi/thu, top category, savings rate
      - _get_financial_advice(user, question, summary)
        → tạo text + cards
      - Return { text, cards, data: { is_financial: True } }
   
   c) Nếu NO (normal question):
      - Dựa vào AI_PROVIDER (groq hoặc gemini):
        → _get_groq_response(question, user)
        hoặc _get_gemini_response(question, user)
      - Thử models theo thứ tự: preferred → fallback1 → fallback2
      - Return { text, cards: [], data: { is_financial: False } }
   ```
5. Frontend nhận response:
   - renderMessage(response.text, 'ai')
   - renderCards(response.cards)

### 3.3 Logic Trọng Tâm (Core Logic)

**Backend: get_ai_advice() - Chi tiết**
```python
def _is_finance_question(question):
    '''Kiểm tra câu hỏi có liên quan tới tài chính không'''
    finance_keywords = [
        'chi', 'tiêu', 'tiết kiệm', 'tiền', 'lương', 'thu nhập',
        'nợ', 'khoản', 'expense', 'income', 'spending', 'budget',
        'giảm', 'tối ưu', 'lợi nhuận', 'tài chính', 'ngân sách',
        'chi phí', 'doanh thu', 'lợi', 'mục', 'loại', 'tổng',
        'tháng', 'năm', 'tuần', 'stats', 'thống kê', 'phân tích'
    ]
    
    question_lower = question.lower()
    # Trả về True nếu BẤT KỲ keyword nào trong keywords xuất hiện
    return any(keyword in question_lower for keyword in finance_keywords)

def _get_financial_summary(user):
    '''Lấy tóm tắt dữ liệu tài chính của user'''
    today = timezone.localtime().date()
    
    # === Tháng hiện tại ===
    month_start = today.replace(day=1)
    month_chi = ChiPhi.objects.filter(user=user, date__gte=month_start, date__lte=today)
    month_thu = ThuNhap.objects.filter(user=user, date__gte=month_start, date__lte=today)
    
    total_month_expense = _safe_amount(
        month_chi.aggregate(total=Sum('amount'))['total']
    )
    total_month_income = _safe_amount(
        month_thu.aggregate(total=Sum('amount'))['total']
    )
    
    # === Tuần hiện tại ===
    # Tìm ngày đầu tuần (Monday)
    week_start = today - timedelta(days=today.weekday())
    week_chi = ChiPhi.objects.filter(user=user, date__gte=week_start, date__lte=today)
    week_thu = ThuNhap.objects.filter(user=user, date__gte=week_start, date__lte=today)
    
    total_week_expense = _safe_amount(
        week_chi.aggregate(total=Sum('amount'))['total']
    )
    total_week_income = _safe_amount(
        week_thu.aggregate(total=Sum('amount'))['total']
    )
    
    # === Năm hiện tại ===
    year_start = today.replace(month=1, day=1)
    year_chi = ChiPhi.objects.filter(user=user, date__gte=year_start, date__lte=today)
    total_year_expense = _safe_amount(
        year_chi.aggregate(total=Sum('amount'))['total']
    )
    
    # === Danh mục chi cao nhất ===
    top_category = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'))
        .order_by('-total')
        .first()
    )
    
    top_category_name = top_category['loai__tenLoai'] if top_category else None
    top_category_amount = _safe_amount(top_category['total']) if top_category else 0
    
    # === Tính tỷ lệ tiết kiệm ===
    savings_rate = 0
    if total_month_income > 0:
        savings_rate = max(
            0,
            (total_month_income - total_month_expense) / total_month_income * 100
        )
    
    return {
        'month_expense': total_month_expense,
        'month_income': total_month_income,
        'week_expense': total_week_expense,
        'week_income': total_week_income,
        'year_expense': total_year_expense,
        'top_category_name': top_category_name,
        'top_category_amount': top_category_amount,
        'savings_rate': savings_rate
    }

def get_ai_advice(user, question):
    '''Xử lý tin nhắn AI - lõi chính'''
    
    # === Step 1: Kiểm tra authentication ===
    if not user or not user.is_authenticated:
        return {
            'text': '🔐 Vui lòng đăng nhập để truy cập chatbot AI.',
            'cards': []
        }
    
    # === Step 2: Kiểm tra loại câu hỏi ===
    is_finance = _is_finance_question(question)
    
    # === Step 3A: Nếu là câu hỏi tài chính ===
    if is_finance:
        # Lấy dữ liệu tài chính
        financial_data = _get_financial_summary(user)
        
        # Tạo response text
        response_text = (
            f"📊 **Tóm tắt tài chính:**\n"
            f"• Tháng này: Chi {_format_currency(financial_data['month_expense'])}, "
            f"Thu {_format_currency(financial_data['month_income'])}\n"
            f"• Tuần này: Chi {_format_currency(financial_data['week_expense'])}\n"
            f"• Năm nay: Chi {_format_currency(financial_data['year_expense'])}\n"
            f"• Tỷ lệ tiết kiệm: {financial_data['savings_rate']:.1f}%"
        )
        
        # Thêm khuyến nghị
        if 'giảm' in question.lower() or 'tiết kiệm' in question.lower():
            response_text += "\n\n💡 **Lời khuyên:** Hãy cắt giảm 5-10% chi tiêu. Áp dụng quy tắc 50-30-20."
        else:
            response_text += "\n\n💡 **Lời khuyên:** Theo dõi chi tiêu hàng ngày, đặt ngân sách hàng tuần."
        
        # Tạo cards hiển thị dữ liệu
        cards = [
            {'title': 'Tổng chi tháng', 'value': _format_currency(financial_data['month_expense'])},
            {'title': 'Tổng thu tháng', 'value': _format_currency(financial_data['month_income'])},
        ]
        
        if financial_data['top_category_name']:
            cards.append({
                'title': 'Chi lớn nhất',
                'value': f"{financial_data['top_category_name']}: {_format_currency(financial_data['top_category_amount'])}"
            })
        
        return {
            'text': response_text,
            'cards': cards,
            'data': {'is_financial': True}
        }
    
    # === Step 3B: Nếu là câu hỏi thông thường ===
    else:
        ai_provider = getattr(settings, 'AI_PROVIDER', 'groq').lower()
        
        if ai_provider == 'groq':
            return _get_groq_response(question, user)
        elif ai_provider == 'gemini':
            return _get_gemini_response(question, user)
        else:
            return {
                'text': '❌ AI provider không được cấu hình.',
                'cards': []
            }

def _get_groq_response(question, user):
    '''Gọi Groq API với fallback models'''
    
    # === Step 1: Load config ===
    api_key = settings.GROQ_API_KEY
    preferred_model = settings.GROQ_MODEL  # ví dụ: 'llama-3.1-70b-versatile'
    
    # Fallback models nếu preferred model fail
    fallback_models = ['llama-3.1-8b-instant']
    models_to_try = [preferred_model] + fallback_models
    
    # === Step 2: Tạo system prompt ===
    system_prompt = (
        "Bạn là trợ lý AI hữu ích, thân thiện, lịch sự. "
        "Trả lời ngắn gọn, rõ ràng, hữu ích.\n"
        f"Tên user: {user.first_name or user.username}\n"
        f"Thời gian hiện tại: {timezone.now().strftime('%Y-%m-%d %H:%M')}\n"
    )
    
    # === Step 3: Thử từng model ===
    groq_client = groq.Groq(api_key=api_key)
    
    for model_name in models_to_try:
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=500,
                temperature=0.7  # Balanced: không quá sáng tạo, không quá cứng nhắc
            )
            
            response_text = response.choices[0].message.content
            return {
                'text': response_text,
                'cards': [],
                'data': {'model': model_name, 'is_financial': False}
            }
            
        except Exception as e:
            print(f"Model {model_name} failed: {str(e)}")
            continue  # Thử model tiếp theo
    
    # === Step 4: Tất cả models fail ===
    return {
        'text': '❌ Không thể kết nối tới AI service. Vui lòng thử lại sau.',
        'cards': []
    }
```

**Frontend: askAI() - Chi tiết**
```javascript
async function askAI(event: Event) {
  event.preventDefault();
  
  const input = document.getElementById('ai-input') as HTMLInputElement;
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    showToast('Vui lòng đăng nhập để sử dụng AI chat.', 'error');
    return;
  }
  
  // === Step 1: Lấy question từ input ===
  const question = input.value.trim();
  if (!question) return;
  
  // === Step 2: Hiển thị user message ngay lập tức ===
  renderMessage(question, 'user');
  input.value = '';  // Clear input
  
  // === Step 3: Hiển thị loading state ===
  setLoading(true);
  
  try {
    // === Step 4: Gửi POST request tới backend ===
    const response = await fetch(
      'http://127.0.0.1:8000/api/ai/chat/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: question })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // === Step 5: Parse response ===
    const responseData = await response.json();
    const { text, cards } = responseData;
    
    // === Step 6: Hiển thị AI message ===
    renderMessage(text, 'ai');
    
    // === Step 7: Hiển thị cards (nếu có) ===
    if (cards && cards.length > 0) {
      renderCards(cards);
    }
    
  } catch (error) {
    console.error('Error calling AI:', error);
    renderMessage(
      '❌ Lỗi kết nối tới AI. Vui lòng thử lại.',
      'ai'
    );
  } finally {
    // === Step 8: Tắt loading state ===
    setLoading(false);
  }
}
```

---

## 4. ADVISOR (Trợ Lý Tài Chính Cá Nhân)

### 4.1 Cấu Trúc (Structure)

#### Backend
```
backend/advisor/
├── models.py                # ChatSession, ChatMessage, SpendingHabit
├── services.py              # get_daily_suggestion(), get_advisor_response()
├── views.py                 # AdvisorChatAPIView, DailySuggestionAPIView
├── serializers.py           # ChatMessageSerializer
└── urls.py                  # POST /advisor/, GET /advisor/daily-suggestion/
```

### 4.2 Cách Hoạt Động (How It Works)

**Flow: Lấy Gợi Ý Hàng Ngày**
1. Frontend GET `/api/advisor/daily-suggestion/`
2. Backend:
   ```
   a) _aggregate_by_period(user, 'month') → month_expense, month_income
   b) _top_expense_category(user) → top category + amount
   c) _build_habit_summary(user):
      - Check _should_refresh_spending_habits()
      - Nếu cần refresh: _refresh_spending_habits() cập nhật SpendingHabit
      - Build summary text từ top 4 habits
   
   d) Tính suggestion dựa vào savings_rate:
      - Nếu < 10%: "Nên giảm chi tiêu"
      - Nếu < 25%: "Duy trì hiện tại"
      - Nếu >= 25%: "Có thể đầu tư"
   
   e) Return { summary, savings_rate }
   ```

**Flow: Chat với Advisor**
1. User gửi message → POST `/api/advisor/`
2. Backend stream_advisor_response(user, question):
   ```
   a) Create/get ChatSession cho user
   b) _append_message(session, 'user', question)
   
   c) Build message payload:
      - system_prompt = _build_system_prompt(user)
      - recent_messages = _load_recent_messages(user, limit=8)
      - messages = [system_prompt, ...recent_messages, user_message]
   
   d) Call _call_gemini(messages):
      - POST tới generativelanguage.googleapis.com
      - Nhận response: { candidates: [{ output: "..." }] }
      - Extract text
   
   e) Yield chunks từ response
   ```

### 4.3 Logic Trọng Tâm (Core Logic)

**Backend: get_daily_suggestion() + Spending Habits - Chi tiết**
```python
def get_daily_suggestion(user):
    # Tính tổng chi/thu tháng hiện tại
    total_month_expense, total_month_income = _aggregate_by_period(user, 'month')
    top_category_name, top_category_amount = _top_expense_category(user)
    habit_summary = _build_habit_summary(user)
    
    # Tính savings rate
    if total_month_income <= 0:
        suggestion = 'Hãy ghi lại thu nhập để AI có gợi ý chính xác.'
    else:
        savings_rate = max(0, (total_month_income - total_month_expense) 
                          / total_month_income * 100)
        
        if savings_rate < 10:
            suggestion = 'Nên giảm bớt chi tiêu không cần thiết...'
        elif savings_rate < 25:
            suggestion = 'Bạn đang quản lý ổn định. Hãy duy trì...'
        else:
            suggestion = 'Tốt rồi! Bạn có thể thử đầu tư...'
    
    if top_category_name:
        suggestion += f' Chú ý: {top_category_name}.'
    
    return {'summary': suggestion, 'savings_rate': f'{savings_rate:.1f}%'}

def _refresh_spending_habits(user):
    # Lấy 30 ngày chi tiêu gần đây, group by category
    last_30 = timezone.localtime().date() - timedelta(days=30)
    expenses = (
        ChiPhi.objects.filter(user=user, date__gte=last_30)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    
    # Cập nhật SpendingHabit (top 5 categories)
    for expense in expenses[:5]:
        category = expense['loai__tenLoai'] or 'Khác'
        average = _safe_amount(expense['total']) / max(1, expense['count'])
        frequency = 'Nhiều lần mỗi tháng' if average > 1000000 else 'Định kỳ'
        note = f'Chi {category} chiếm {_format_currency(expense["total"])} trong 30 ngày.'
        
        SpendingHabit.objects.update_or_create(
            user=user, category=category,
            defaults={'average_amount': average, 'frequency': frequency, 'note': note}
        )

def _build_habit_summary(user):
    # Kiểm tra cần refresh (nếu > 6 hours)
    if _should_refresh_spending_habits(user, max_age_hours=6):
        _refresh_spending_habits(user)
    
    # Lấy top 4 habits
    habits = SpendingHabit.objects.filter(user=user).order_by('-average_amount')[:4]
    
    if not habits:
        return 'Chưa có thói quen chi tiêu rõ ràng.'
    
    # Build summary text
    lines = [f'{h.category}: trung bình {_format_currency(h.average_amount)}, {h.frequency}. {h.note}' 
             for h in habits]
    return ' '.join(lines)

def _build_system_prompt(user):
    habit_summary = _build_habit_summary(user)
    daily_suggestion = get_daily_suggestion(user)['summary']
    
    return (
        "Bạn là trợ lý tài chính tiếng Việt chuyên tư vấn thu chi cá nhân.\n"
        f"Thói quen chi tiêu: {habit_summary}\n"
        f"Gợi ý hôm nay: {daily_suggestion}\n"
        "Hãy trả lời ngắn gọn, cụ thể. Áp dụng quy tắc 50/30/20."
    )
```

**Backend: stream_advisor_response() - Streaming Gemini**
```python
def stream_advisor_response(user, question):
    # Get or create ChatSession
    session, _ = ChatSession.objects.get_or_create(user=user, is_active=True)
    _append_message(session, 'user', question)
    
    # Build message list (system + recent history)
    system_prompt = _build_system_prompt(user)
    recent_msgs = ChatMessage.objects.filter(session=session).order_by('-created_at')[:8]
    
    messages = [{"role": "system", "content": system_prompt}]
    for msg in reversed(recent_msgs):
        messages.append({
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        })
    
    # Stream Gemini response
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(messages, stream=True)
    
    assistant_response = ""
    for chunk in response:
        if chunk.text:
            assistant_response += chunk.text
            yield f"data: {json.dumps({'text': chunk.text})}\n\n"
    
    # Save complete response
    _append_message(session, 'assistant', assistant_response)
    yield f"data: {json.dumps({'done': True})}\n\n"
```

**Frontend: Advisor Chat with SSE (Server-Sent Events)**
```typescript
async function askAdvisor(question: string) {
    const token = localStorage.getItem('accessToken');
    
    // Render user message
    renderAdvisorMessage(question, 'user');
    
    // Create message container for streaming
    const msgContainer = renderAdvisorMessage('', 'advisor');
    let advisorResponse = '';
    
    try {
        const response = await fetch(
            'http://127.0.0.1:8000/api/advisor/',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: question })
            }
        );
        
        // Stream chunks incrementally
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines[lines.length - 1];
            
            for (let i = 0; i < lines.length - 1; i++) {
                if (lines[i].startsWith('data: ')) {
                    const data = JSON.parse(lines[i].substring(6));
                    if (data.text) {
                        advisorResponse += data.text;
                        msgContainer.textContent = advisorResponse;  // Real-time update
                    }
                }
            }
        }
    } catch (error) {
        renderAdvisorMessage('Lỗi kết nối tới Advisor.', 'advisor');
    }
}
```

---

## 5. PAGINATION (Phân Trang)

### 5.1 Cấu Trúc (Structure)

#### Frontend
```
src/features/pagination/
├── index.ts                    # Exports
├── types/
│   └── pagination.types.ts    # PaginationState, PaginationParams, PaginationResponse
├── api/
│   └── paginationApi.ts       # fetchPaginatedTransactions(), fetchRecentSearches()
├── services/
│   └── paginationService.ts   # calculateTotalPages(), generatePageNumbers(), ...
├── components/
│   └── PaginationControls.ts  # UI component cho pagination buttons
└── hooks/
    └── usePagination.ts       # PaginationManager class
```

#### Backend (No dedicated pagination module)
```
backend/search_filter/views.py
├── StandardResultsSetPagination
│   └── page_size = 10, max_page_size = 50
└── TransactionSearchView.get()
    └── paginator.paginate_queryset(transactions, request)
       → trả về paginated transactions + metadata
```

### 5.2 Cách Hoạt Động (How It Works)

**Flow: Load Trang**
1. Frontend: PaginationManager.loadPage(params):
   ```
   {
     page: 1,
     page_size: 10,
     keyword: 'abc',
     category: 1,
     type: 'expense',
     sort: 'date-desc'
   }
   ```
2. paginationApi.buildQueryParams(params) → URL query string
3. fetchPaginatedTransactions(params, token):
   ```
   GET /api/search/transactions/?keyword=abc&page=1&page_size=10
   ```
4. transformPagination(response):
   ```
   {
     duLieu: [{ id, type, amount, ... }],
     phanTrang: {
       trangHienTai: 1,
       tongSoTrang: 5,
       tongSoItem: 45,
       soItemMoiTrang: 10,
       coTrangTruoc: false,
       coTrangSau: true
     }
   }
   ↓
   {
     results: [...],
     count: 45,
     currentPage: 1,
     totalPages: 5,
     pageSize: 10,
     hasNextPage: true,
     hasPrevPage: false
   }
   ```
5. Notify listeners về state change
6. PaginationControls.render(): Render buttons [Trước] [1] [2] [3] [Sau]

### 5.3 Logic Trọng Tâm (Core Logic)

**Frontend: PaginationManager.loadPage() - Chi tiết**
```typescript
private paginationManager: PaginationManager;  // State manager

class PaginationManager {
  private data: any[] = [];
  private state: PaginationState = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    isLoading: false,
    error: null
  };
  private listeners: Set<() => void> = new Set();
  private token: string = '';
  
  async loadPage(params: PaginationParams) {
    try {
      // === Step 1: Set loading state ===
      this.state.isLoading = true;
      this.state.error = null;
      this.notifyStateChange();
      
      // === Step 2: Build query params ===
      // Tạo URLSearchParams từ params object
      const queryParams = new URLSearchParams();
      queryParams.append('page', params.page.toString());
      queryParams.append('page_size', params.page_size.toString());
      
      if (params.keyword) queryParams.append('keyword', params.keyword);
      if (params.category) queryParams.append('category', params.category);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);
      if (params.sort) queryParams.append('sort', params.sort);
      
      // === Step 3: Gửi API request ===
      const response = await fetch(
        `/api/search/transactions/?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // === Step 4: Parse response ===
      // Backend response format:
      // {
      //   duLieu: [...],
      //   phanTrang: {
      //     trangHienTai: 1,
      //     tongSoTrang: 5,
      //     tongSoItem: 45,
      //     soItemMoiTrang: 10,
      //     coTrangTruoc: false,
      //     coTrangSau: true
      //   }
      // }
      
      const responseData = await response.json();
      const { duLieu, phanTrang } = responseData;
      
      // === Step 5: Transform response ===
      // Chuyển từ Vietnamese naming → English naming
      this.data = duLieu || [];
      
      this.state = {
        currentPage: phanTrang.trangHienTai,
        pageSize: phanTrang.soItemMoiTrang,
        totalItems: phanTrang.tongSoItem,
        totalPages: phanTrang.tongSoTrang,
        hasNextPage: phanTrang.coTrangSau,
        hasPrevPage: phanTrang.coTrangTruoc,
        isLoading: false,
        error: null
      };
      
      // === Step 6: Notify listeners ===
      this.notifyDataChange();  // Thông báo data thay đổi
      this.notifyStateChange();  // Thông báo state thay đổi
      
    } catch (err) {
      // === Step 7: Error handling ===
      this.state.error = err instanceof Error ? err.message : 'Unknown error';
      this.state.isLoading = false;
      this.notifyStateChange();
      throw err;
    }
  }
  
  // Notify observers about data changes
  private notifyDataChange() {
    this.listeners.forEach(listener => listener());
  }
  
  // Subscribe to changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**Frontend: generatePageNumbers() - Chi tiết**
```typescript
private generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  // === Input: currentPage=3, totalPages=10
  // === Output: [1, '...', 2, 3, 4, '...', 10]
  
  const maxVisible = 5;  // Tối đa hiển thị 5 số trang
  
  // === Case 1: Tổng trang <= maxVisible ===
  // Hiển thị tất cả: [1, 2, 3, 4, 5]
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  // === Case 2: Tổng trang > maxVisible ===
  const pages: (number | string)[] = [];
  
  // Luôn thêm trang 1
  pages.push(1);
  
  // Nếu currentPage > 3, thêm "..." để collapse trang ở giữa
  if (currentPage > 3) {
    pages.push('...');
  }
  
  // Thêm pages xung quanh current page (current-1, current, current+1)
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  
  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {  // Tránh duplicate
      pages.push(i);
    }
  }
  
  // Nếu currentPage < totalPages - 2, thêm "..." để collapse trang ở phía sau
  if (currentPage < totalPages - 2) {
    pages.push('...');
  }
  
  // Luôn thêm trang cuối
  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }
  
  return pages;
  
  // Ví dụ:
  // currentPage=1, totalPages=10 → [1, 2, '...', 10]
  // currentPage=3, totalPages=10 → [1, 2, 3, 4, '...', 10]
  // currentPage=5, totalPages=10 → [1, '...', 4, 5, 6, '...', 10]
  // currentPage=8, totalPages=10 → [1, '...', 7, 8, 9, 10]
  // currentPage=10, totalPages=10 → [1, '...', 9, 10]
}
```

**Frontend: renderPaginationControls() - Chi tiết**
```typescript
private renderPaginationControls(): void {
  const state = this.paginationManager?.getState();
  if (!state) return;
  
  const { currentPage, totalPages, hasNextPage, hasPrevPage } = state;
  
  // === Step 1: Generate page numbers ===
  const pageNumbers = this.generatePageNumbers(currentPage, totalPages);
  
  // === Step 2: Build HTML ===
  let html = '<div class="pagination-controls flex items-center gap-2 justify-center mt-4">';
  
  // Previous button
  html += `
    <button 
      class="px-3 py-1 rounded ${hasPrevPage ? 'bg-orange-500 text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
      ${hasPrevPage ? 'onclick="handlePrevPage()"' : 'disabled'}
    >
      ← Trước
    </button>
  `;
  
  // Page numbers
  pageNumbers.forEach((pageNum) => {
    if (pageNum === '...') {
      html += '<span class="px-2">...</span>';
    } else {
      const isActive = pageNum === currentPage;
      html += `
        <button 
          class="px-3 py-1 rounded ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}"
          onclick="handlePageClick(${pageNum})"
        >
          ${pageNum}
        </button>
      `;
    }
  });
  
  // Next button
  html += `
    <button 
      class="px-3 py-1 rounded ${hasNextPage ? 'bg-orange-500 text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
      ${hasNextPage ? 'onclick="handleNextPage()"' : 'disabled'}
    >
      Sau →
    </button>
  `;
  
  html += '</div>';
  
  // === Step 3: Insert into DOM ===
  const paginationContainer = document.getElementById('pagination-container');
  if (paginationContainer) {
    paginationContainer.innerHTML = html;
  }
}
```

---

## 6. EXPENSE CHARTS (Biểu Đồ Chi Tiêu)

### 6.1 Cấu Trúc (Structure)

#### Frontend
```
src/main.ts
├── Private Fields
│   ├── chartContainer: HTMLElement          # #chart-container
│   ├── expenseTrendContainer: HTMLElement   # #expense-trend-container
│   ├── incomeTrendContainer: HTMLElement    # #income-trend-container
│   ├── chartTab: 'chart' | 'categories' | 'comparison' | 'export'
│   ├── chartPeriod: '7d' | '30d' | '90d' | 'all'
│   ├── trendPeriod: '7d' | '30d' | '90d' | 'all'
│   ├── hideTrendOutliers: boolean
│   ├── chartCache: Map<string, { html, timestamp }>
│   ├── previousArcs: { [key]: { startAngle, endAngle } }
│   ├── categoryColorMap: { [categoryName]: color }
│   ├── lastChartData: any
│   └── isChartLoading: boolean
├── Functions
│   ├── renderChart()                # Pie chart: chi tiêu theo danh mục
│   ├── renderTrendChart()           # Line chart: trend chi/thu theo ngày
│   ├── prepareExpenseCategoryData() # Nhóm expenses theo category
│   ├── filterTransactionsByPeriod()  # Filter theo 7d/30d/90d/all
│   ├── renderDonutOnly()            # Vẽ donut chart
│   ├── renderCategoriesDetailedList()# Vẽ danh sách chi tiết
│   ├── renderComparisonDonut()      # So sánh với kỳ trước
│   ├── renderExportPDFView()        # View xuất PDF
│   ├── computeExpenseComparison()   # Tính % so với kỳ trước
│   ├── showChartLoading()           # Hiển thị loading spinner
│   ├── cacheChartData()             # Lưu cache 30 giây
│   ├── updateChartAuthOverlay()     # Overlay cho not-logged-in
│   ├── setChartTab()                # Switch tab
│   ├── exportChartData()            # Export to PDF
│   └── formatCurrency()
├── D3.js Utilities
│   ├── d3.pie()                     # Tạo pie layout
│   ├── d3.arc()                     # Vẽ arc path
│   ├── d3.scaleOrdinal()            # Color scale
│   ├── d3.rollups()                 # Group + sum
│   ├── d3.timeDay.range()           # Date range
│   ├── d3.scaleTime()               # Time scale
│   ├── d3.scaleLinear()             # Linear scale
│   ├── d3.line()                    # Line path
│   ├── d3.area()                    # Area path
│   └── d3.interpolate()             # Animation transition
└── Event Listeners
    ├── chartPeriodFilter: change (7d/30d/90d/all)
    ├── trendPeriodFilter: change
    ├── trendOutlierToggle: click
    ├── chartTab buttons: click
    └── mouse events trên chart: mouseover, click
```

### 6.2 Cách Hoạt Động (How It Works)

**Flow: Render Pie Chart (Donut)**
1. Click tab "Biểu đồ" hoặc render()
2. renderChart() được gọi:
   ```
   a) Check isChartLoading: nếu true, skip
   b) Build cache key = `${chartPeriod}-${chartTab}-${totalAmount}`
   c) Nếu cache tồn tại + < 30 giây:
      → renderChartContainer từ cache + return
   
   d) setLoading(true) → showChartLoading()
   e) Filter expenses by chartPeriod (filterTransactionsByPeriod)
   f) Nếu không có expenses:
      → render "Chưa có dữ liệu" + cache + return
   
   g) prepareExpenseCategoryData(expenses):
      → Group by category → [{ name, value }]
   
   h) Nếu totalExpense = 0:
      → render "Chưa có dữ liệu"
   
   i) Render based on chartTab:
      - 'chart': renderDonutOnly()
      - 'categories': renderCategoriesDetailedList()
      - 'comparison': renderComparisonDonut()
      - 'export': renderExportPDFView()
   
   j) cacheChartData(key, html, ...)
   k) setLoading(false)
   ```

**Flow: Render Trend Chart (Line)**
1. renderTrendChart() được gọi:
   ```
   a) Filter incomes + expenses by trendPeriod
   b) Dùng d3.rollups() để group by date:
      incomeByDate = Map(date → total_income)
      expenseByDate = Map(date → total_expense)
   
   c) Tạo timeline: [{ date, income, expense }, ...]
      Nếu hideTrendOutliers: filter outliers
   
   d) Tạo SVG + scales:
      x = d3.scaleTime(): domain=[minDate, maxDate], range=[0, width]
      y = d3.scaleLinear(): domain=[0, maxValue], range=[height, 0]
   
   e) Vẽ 2 line paths: income (green) + expense (red)
      Sử dụng d3.curveMonotoneX để smooth
   
   f) Vẽ axes: bottom (dates), left (values)
   g) Thêm grid lines
   h) Mouse hover: tooltip show date + values
   ```

### 6.3 Logic Trọng Tâm (Core Logic)

**Frontend: prepareExpenseCategoryData() - Chi tiết**
```typescript
private prepareExpenseCategoryData(expenses: Transaction[]): { name: string; value: number }[] {
  // === Step 1: Tạo map category → tổng amount ===
  const categoryMap = new Map<string, number>();
  const categoryColorMap = new Map<string, string>();  // Lưu color cho mỗi category
  
  expenses.forEach(exp => {
    const categoryName = exp.category_name || 'Khác';
    
    // === Gán color cho category (nếu chưa có) ===
    if (!categoryColorMap.has(categoryName)) {
      const color = this.getCategoryColor(categoryName);
      categoryColorMap.set(categoryName, color);
    }
    
    // === Tính tổng amount cho category ===
    const currentAmount = categoryMap.get(categoryName) || 0;
    categoryMap.set(categoryName, currentAmount + exp.amount);
  });
  
  // === Step 2: Convert map → array + sắp xếp ===
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);  // Giảm dần theo value
  
  // === Step 3: Cập nhật global color map ===
  this.categoryColorMap = categoryColorMap;
  
  return categoryData;
  
  // Ví dụ output:
  // [
  //   { name: 'Ăn uống', value: 500000 },
  //   { name: 'Giao thông', value: 300000 },
  //   { name: 'Khác', value: 100000 }
  // ]
}
```

**Frontend: filterTransactionsByPeriod() - Chi tiết**
```typescript
private filterTransactionsByPeriod(
  transactions: Transaction[],
  period: '7d' | '30d' | '90d' | 'all'
): Transaction[] {
  const today = new Date();
  const todayTime = today.getTime();
  
  // === Chuyển period thành số ngày ===
  let daysToLookBack: number;
  switch (period) {
    case '7d':
      daysToLookBack = 7;
      break;
    case '30d':
      daysToLookBack = 30;
      break;
    case '90d':
      daysToLookBack = 90;
      break;
    case 'all':
      return transactions;  // Trả về tất cả
    default:
      daysToLookBack = 7;
  }
  
  // === Tính cutoff timestamp ===
  const oneDay = 24 * 60 * 60 * 1000;  // 1 day in milliseconds
  const cutoffTime = todayTime - (daysToLookBack * oneDay);
  
  // === Filter transactions >= cutoff date ===
  return transactions.filter(t => {
    const txTime = new Date(t.date).getTime();
    return txTime >= cutoffTime;
  });
  
  // Ví dụ:
  // period='7d', today=2026-05-07
  // → cutoffTime = 2026-05-07 - 7 days = 2026-04-30
  // → return transactions từ 2026-04-30 đến 2026-05-07
}
```

**Frontend: renderDonutSVG() - Chi tiết D3 Logic**
```typescript
private renderDonutSVG(
  containerId: string,
  categoryData: any[],
  totalExpense: number,
  isDark: boolean,
  width: number,
  height: number,
  radius: number
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // === Step 1: Cleanup D3 elements ===
  d3.select(container).selectAll("*").remove();
  
  // === Step 2: Tạo SVG + G (group) ===
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);
  
  // === Step 3: Tạo color scale ===
  const color = (categoryName: string) => this.getCategoryColor(categoryName);
  
  // === Step 4: Tạo pie layout ===
  // d3.pie() chuyển data [{ name, value }] → angles
  // π (pi) radians = 180°, 2π = 360°
  const pie = d3.pie<{ name: string; value: number }>()
    .value(d => d.value)        // Lấy giá trị từ property 'value'
    .sort((a, b) => b.value - a.value);  // Sort descending
  
  // === Step 5: Tạo arc generator ===
  // Arc là path từ startAngle đến endAngle, innerRadius → outerRadius
  // Donut: innerRadius > 0 để có lỗ ở giữa
  const arc = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
    .innerRadius(radius * 0.6)         // 60% radius = lỗ ở giữa
    .outerRadius(radius * 0.9)         // 90% radius = bề ngoài
    .cornerRadius(8)                    // Rounded corners
    .padAngle(d => (d.data.value / totalExpense) < 0.05 ? 0.005 : 0.02);  // Gap
  
  // Hover arc: lớn hơn một chút
  const arcHover = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>()
    .innerRadius(radius * 0.55)         // Smaller inner
    .outerRadius(radius * 0.95)         // Larger outer
    .cornerRadius(10)
    .padAngle(d => (d.data.value / totalExpense) < 0.05 ? 0.005 : 0.03);
  
  // === Step 6: Bind data + tạo G (groups) ===
  const arcs = svg.selectAll('arc')
    .data(pie(categoryData))           // Áp dụng pie layout
    .enter()
    .append('g')
    .attr('class', 'arc');
  
  // === Step 7: Vẽ paths (arc lines) ===
  const paths = arcs.append('path') as d3.Selection<SVGPathElement, any, any, any>;
  
  paths
    .attr('fill', d => color(d.data.name))
    .attr('d', d => arc(d) as string)  // Convert arc data → SVG path string
    .style('opacity', 0.9)
    .attr('class', 'cursor-pointer transition-all duration-500')
    // === ACCESSIBILITY ===
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', d => `${d.data.name}: ${this.formatCurrency(d.data.value)} (${this.formatPercent(d.data.value, totalExpense)})`)
    // === HOVER EVENT ===
    .on('mouseover', (event, d: d3.PieArcDatum<any>) => {
      // Show tooltip
      const percent = ((d.data.value / totalExpense) * 100);
      const percentText = percent < 1 ? '<1%' : `${percent.toFixed(1)}%`;
      this.showChartTooltip(event, `${d.data.name}: ${this.formatCurrency(d.data.value)} (${percentText})`);
      
      // Animate to hover state
      d3.select(event.target as SVGPathElement)
        .transition()
        .duration(200)
        .attrTween('d', () => {
          // Interpolate từ current arc → hover arc
          const i = d3.interpolate(d, d);
          return (t) => arcHover(i(t) as any)!;
        })
        .style('opacity', 1)
        .attr('filter', 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.3))')
        .attr('transform', 'scale(1.05)');
    })
    // === MOUSEOUT EVENT ===
    .on('mouseout', (event) => {
      this.hideChartTooltip();
      d3.select(event.target as SVGPathElement)
        .transition()
        .duration(200)
        .attrTween('d', () => {
          const d = d3.select(event.target as SVGPathElement).datum() as d3.PieArcDatum<any>;
          const i = d3.interpolate(d, d);
          return (t) => arc(i(t) as any)!;
        })
        .style('opacity', 0.9)
        .attr('filter', 'none')
        .attr('transform', 'scale(1)');
    })
    // === CLICK EVENT ===
    .on('click', (event, d: d3.PieArcDatum<any>) => {
      this.drillDownToCategory(d.data.name);
    })
    // === KEYBOARD EVENT ===
    .on('keydown', (event, d: d3.PieArcDatum<any>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.drillDownToCategory(d.data.name);
      }
    })
    // === ANIMATION: Initial draw ===
    .transition()
    .duration(1200)  // 1.2 second animation
    .attrTween('d', (d: d3.PieArcDatum<any>) => {
      // Interpolate từ previous arc (hoặc 0 nếu lần đầu) → current arc
      const previousData = this.previousArcs && this.previousArcs[d.data.name]
        ? this.previousArcs[d.data.name]
        : { startAngle: 0, endAngle: 0 };
      const i = d3.interpolate(previousData, d);
      return (t) => arc(i(t))!;
    });
  
  // === Step 8: Lưu arc data cho animation tiếp theo ===
  this.previousArcs = {};
  pie(categoryData).forEach(d => {
    this.previousArcs[d.data.name] = { startAngle: d.startAngle, endAngle: d.endAngle };
  });
  
  // === Step 9: Vẽ percentage labels ===
  const labelArc = d3.arc<d3.PieArcDatum<any>>()
    .innerRadius(radius * 0.75)
    .outerRadius(radius * 0.75);
  
  arcs.append('text')
    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
    .attr('dy', '0.35em')
    .attr('class', `text-[10px] font-black ${isDark ? 'fill-white' : 'fill-slate-900'}`)
    .attr('text-anchor', 'middle')
    .text(d => {
      const percent = (d.data.value / totalExpense) * 100;
      return percent > 3 ? `${percent.toFixed(0)}%` : '';  // Hide < 3%
    })
    .style('opacity', 0)
    .transition()
    .delay(1200)  // Thời gian chờ arc animation kết thúc
    .duration(600)
    .style('opacity', 1);
}
```

**Frontend: renderTrendChart() - Chi tiết D3 Logic**
```typescript
private renderTrendChart() {
  // === Step 1: Filter dữ liệu theo period ===
  const filtered = this.filterTransactionsByPeriod(this.transactions, this.trendPeriod);
  
  // === Step 2: Group by date (YYYY-MM-DD) ===
  const groupDate = (transaction: Transaction) => {
    const txDate = new Date(transaction.date);
    return `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
  };
  
  // === Step 3: Tạo Map date → total income ===
  // d3.rollups = Group + Aggregate
  // Syntax: d3.rollups(data, reduce_func, ...keys)
  // Kết quả: Map(date → sum)
  const incomeByDate = new Map(
    d3.rollups(
      filtered.filter(t => t.type === 'income'),
      v => d3.sum(v, d => d.amount),  // Sum amounts
      d => groupDate(d)               // Group by date
    )
  );
  
  const expenseByDate = new Map(
    d3.rollups(
      filtered.filter(t => t.type === 'expense'),
      v => d3.sum(v, d => d.amount),
      d => groupDate(d)
    )
  );
  
  // === Step 4: Tạo timeline (date range) ===
  const allDates = Array.from(
    new Set<string>([
      ...incomeByDate.keys(),
      ...expenseByDate.keys()
    ])
  )
    .map(date => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime());  // Sort ascending
  
  if (allDates.length === 0) {
    this.expenseTrendContainer.innerHTML = '<p class="text-xs text-slate-400">Chưa có dữ liệu</p>';
    return;
  }
  
  // === Step 5: Tạo date range (fill gaps) ===
  // d3.timeDay.range(start, end) = [date1, date2, ..., dateN]
  const dateRange = d3.timeDay.range(
    allDates[0],
    d3.timeDay.offset(allDates[allDates.length - 1], 1)  // +1 day để include last day
  );
  
  // === Step 6: Build timeline array ===
  const timeline = dateRange.map(date => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date,
      income: incomeByDate.get(iso) || 0,
      expense: expenseByDate.get(iso) || 0
    };
  });
  
  // === Step 7: Tính max value cho Y axis ===
  const maxValue = d3.max(timeline, d => Math.max(d.income, d.expense)) || 0;
  
  // === Step 8: Tạo scales ===
  // scaleTime: domain = [date1, dateN], range = [0, width]
  const xScale = d3.scaleTime()
    .domain([timeline[0].date, timeline[timeline.length - 1].date])
    .range([50, 550]);
  
  // scaleLinear: domain = [0, maxValue], range = [height, 0]
  const yScale = d3.scaleLinear()
    .domain([0, maxValue * 1.1])  // +10% để có margin
    .range([350, 50]);
  
  // === Step 9: Tạo line generators ===
  const incomeLine = d3.line<any>()
    .x(d => xScale(d.date))
    .y(d => yScale(d.income));
  
  const expenseLine = d3.line<any>()
    .x(d => xScale(d.date))
    .y(d => yScale(d.expense));
  
  // === Step 10: Render SVG + lines ===
  // ...(Vẽ axes, grid lines, legend)
}
```

---

## Kết Luận

Mỗi chức năng được thiết kế độc lập nhưng có thể kết hợp:
- **Shared Fund**: Quản lý nhóm & thanh toán
- **Search Filter**: Tìm kiếm nhanh & lọc đa tiêu chí
- **AI Integration**: Chatbot hỗ trợ tự động & tư vấn
- **Advisor**: Trợ lý cá nhân hóa với lịch sử & thói quen
- **Pagination**: Phân trang hiệu quả cho kết quả tìm kiếm
- **Expense Charts**: Visualize chi tiêu qua biểu đồ D3.js

Tất cả đều dùng chung authentication (Token-based) và API architecture (RESTful).
