from django.contrib import admin
from shared_fund.models import SharedFund, FundMember, Expense, ExpenseSplit, Settlement


@admin.register(SharedFund)
class SharedFundAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'owner', 'created_at']
    search_fields = ['name', 'owner__username']


@admin.register(FundMember)
class FundMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'fund', 'user', 'role', 'joined_at']
    search_fields = ['fund__name', 'user__username']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['id', 'fund', 'created_by', 'amount', 'date']
    search_fields = ['fund__name', 'created_by__username']


@admin.register(ExpenseSplit)
class ExpenseSplitAdmin(admin.ModelAdmin):
    list_display = ['id', 'expense', 'user', 'amount_owed']


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ['id', 'fund', 'from_user', 'to_user', 'amount', 'created_at']
