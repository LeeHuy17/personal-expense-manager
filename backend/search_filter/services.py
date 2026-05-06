from django.db.models import Q, F
from expenses.models import ChiPhi, ThuNhap, Loai
from shared_fund.models import Expense as SharedExpense, FundMember
from datetime import datetime
from .utils import highlight_keyword
from .models import RecentSearch


class TransactionSearchService:
    def search_transactions(self, user, keyword='', date_from=None, date_to=None, category=None,
                        transaction_type=None, amount_min=None, amount_max=None, sort_by='date-desc'):
        transactions = []
        keyword = keyword.strip() if keyword else ''

        # Personal expenses
        if transaction_type in [None, 'expense', 'all']:
            expenses = ChiPhi.objects.filter(user=user).select_related('loai')
            if keyword:
                expenses = expenses.filter(
                    Q(moTa__icontains=keyword) | Q(loai__tenLoai__icontains=keyword)
                )
            if date_from:
                expenses = expenses.filter(date__gte=date_from)
            if date_to:
                expenses = expenses.filter(date__lte=date_to)
            if category:
                expenses = expenses.filter(loai__loaiId=category)
            if amount_min:
                expenses = expenses.filter(amount__gte=amount_min)
            if amount_max:
                expenses = expenses.filter(amount__lte=amount_max)
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

        # Personal incomes
        if transaction_type in [None, 'income', 'all']:
            incomes = ThuNhap.objects.filter(user=user).select_related('loai')
            if keyword:
                incomes = incomes.filter(
                    Q(moTa__icontains=keyword) | Q(loai__tenLoai__icontains=keyword)
                )
            if date_from:
                incomes = incomes.filter(date__gte=date_from)
            if date_to:
                incomes = incomes.filter(date__lte=date_to)
            if category:
                incomes = incomes.filter(loai__loaiId=category)
            if amount_min:
                incomes = incomes.filter(amount__gte=amount_min)
            if amount_max:
                incomes = incomes.filter(amount__lte=amount_max)
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

        # Shared expenses
        if transaction_type in [None, 'shared', 'all']:
            # Get funds where user is member
            user_funds = FundMember.objects.filter(user=user).values_list('fund', flat=True)
            shared_expenses = SharedExpense.objects.filter(fund__in=user_funds).select_related('fund')
            if keyword:
                shared_expenses = shared_expenses.filter(description__icontains=keyword)
            if date_from:
                shared_expenses = shared_expenses.filter(date__gte=date_from)
            if date_to:
                shared_expenses = shared_expenses.filter(date__lte=date_to)
            # No category for shared, so skip category filter
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
                    'category_name': None,
                    'category_type': None,
                    'fund_name': exp.fund.name,
                })

        # Sort transactions
        if sort_by == 'date-desc':
            transactions.sort(key=lambda x: x['date'], reverse=True)
        elif sort_by == 'date-asc':
            transactions.sort(key=lambda x: x['date'])
        elif sort_by == 'amount-desc':
            transactions.sort(key=lambda x: x['amount'], reverse=True)
        elif sort_by == 'amount-asc':
            transactions.sort(key=lambda x: x['amount'])
        elif sort_by == 'category':
            transactions.sort(key=lambda x: (x['category_name'] or '', x['date']), reverse=True)

        return transactions

    def save_recent_search(self, user, keyword):
        if keyword and len(keyword.strip()) > 0:
            RecentSearch.objects.update_or_create(
                user=user,
                keyword=keyword.strip(),
                defaults={}
            )
            # Keep only last 10 searches
            recent_searches_to_delete = RecentSearch.objects.filter(user=user).order_by('-searched_at').values_list('pk', flat=True)[10:]
            if recent_searches_to_delete:
                RecentSearch.objects.filter(pk__in=list(recent_searches_to_delete)).delete()