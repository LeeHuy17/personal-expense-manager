from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db.models import Sum
from django.shortcuts import render
from django.utils import timezone

from budgets.models import Budget
from expenses.models import ChiPhi, ThuNhap
from savings.models import SavingsGoal
from shared_fund.models import FundInvitation, SharedFund


@login_required(login_url='/admin/login/')
def dashboard(request, section=None):
    if not request.user.is_staff and not request.user.is_superuser:
        raise PermissionDenied('Chỉ admin mới được truy cập Backend UI.')

    section = section or 'overview'
    User = get_user_model()
    now = timezone.now()
    last_week = now - timedelta(days=7)

    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    admin_users = User.objects.filter(is_staff=True).count()
    recent_signups = User.objects.filter(date_joined__gte=last_week).count()

    expense_count = ChiPhi.objects.count()
    income_count = ThuNhap.objects.count()
    transaction_count = expense_count + income_count
    total_expense_amount = ChiPhi.objects.aggregate(total=Sum('amount'))['total'] or 0
    total_income_amount = ThuNhap.objects.aggregate(total=Sum('amount'))['total'] or 0

    budget_count = Budget.objects.count()
    budget_total_amount = Budget.objects.aggregate(total=Sum('amount'))['total'] or 0
    savings_goal_count = SavingsGoal.objects.count()
    total_savings_amount = SavingsGoal.objects.aggregate(total=Sum('current_amount'))['total'] or 0

    shared_fund_count = SharedFund.objects.count()
    pending_invites = FundInvitation.objects.filter(status=FundInvitation.STATUS_PENDING).count()

    budget_remaining = max(float(budget_total_amount) - float(total_expense_amount), 0)
    section_title = 'Overview' if section == 'overview' else section.replace('-', ' ').title()

    def format_money(value):
        return f"₫ {value:,.0f}" if value else '₫ 0'

    return render(request, 'backend_ui/dashboard.html', {
        'user_name': request.user.get_full_name() or request.user.username,
        'section': section,
        'section_title': section_title,
        'total_users': total_users,
        'active_users': active_users,
        'admin_users': admin_users,
        'recent_signups': recent_signups,
        'expense_count': expense_count,
        'income_count': income_count,
        'transaction_count': transaction_count,
        'total_expense_amount_display': format_money(total_expense_amount),
        'total_income_amount_display': format_money(total_income_amount),
        'budget_remaining_display': format_money(budget_remaining),
        'total_savings_display': format_money(total_savings_amount),
        'budget_count': budget_count,
        'savings_goal_count': savings_goal_count,
        'shared_fund_count': shared_fund_count,
        'pending_invites': pending_invites,
        'budget_total_amount_display': format_money(budget_total_amount),
        'transaction_count_display': f"{transaction_count:,}",
        'total_users_display': f"{total_users:,}",
        'admin_users_display': f"{admin_users:,}",
        'expense_count_display': f"{expense_count:,}",
        'recent_signups_display': f"{recent_signups:,}",
    })
