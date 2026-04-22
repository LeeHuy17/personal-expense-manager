from django.db.models import Sum
from shared_fund.models import Expense, ExpenseSplit, FundMember, Settlement


def calculate_fund_balances(fund):
    members = FundMember.objects.filter(fund=fund).select_related('user')
    balances = {}

    for membership in members:
        balances[membership.user.id] = {
            'user_id': membership.user.id,
            'username': membership.user.username,
            'role': membership.role,
            'paid': 0.0,
            'owed': 0.0,
            'sent': 0.0,
            'received': 0.0,
            'balance': 0.0,
        }

    paid_rows = Expense.objects.filter(fund=fund).values('created_by').annotate(total_paid=Sum('amount'))
    owed_rows = ExpenseSplit.objects.filter(expense__fund=fund).values('user').annotate(total_owed=Sum('amount_owed'))
    sent_rows = Settlement.objects.filter(fund=fund).values('from_user').annotate(total_sent=Sum('amount'))
    received_rows = Settlement.objects.filter(fund=fund).values('to_user').annotate(total_received=Sum('amount'))

    for row in paid_rows:
        user_id = row['created_by']
        if user_id not in balances:
            balances[user_id] = {
                'user_id': user_id,
                'username': str(user_id),
                'role': 'member',
                'paid': 0.0,
                'owed': 0.0,
                'sent': 0.0,
                'received': 0.0,
                'balance': 0.0,
            }
        balances[user_id]['paid'] = float(row['total_paid'] or 0.0)

    for row in owed_rows:
        user_id = row['user']
        if user_id not in balances:
            balances[user_id] = {
                'user_id': user_id,
                'username': str(user_id),
                'role': 'member',
                'paid': 0.0,
                'owed': 0.0,
                'sent': 0.0,
                'received': 0.0,
                'balance': 0.0,
            }
        balances[user_id]['owed'] = float(row['total_owed'] or 0.0)

    for row in sent_rows:
        user_id = row['from_user']
        if user_id not in balances:
            balances[user_id] = {
                'user_id': user_id,
                'username': str(user_id),
                'role': 'member',
                'paid': 0.0,
                'owed': 0.0,
                'sent': 0.0,
                'received': 0.0,
                'balance': 0.0,
            }
        balances[user_id]['sent'] = float(row['total_sent'] or 0.0)

    for row in received_rows:
        user_id = row['to_user']
        if user_id not in balances:
            balances[user_id] = {
                'user_id': user_id,
                'username': str(user_id),
                'role': 'member',
                'paid': 0.0,
                'owed': 0.0,
                'sent': 0.0,
                'received': 0.0,
                'balance': 0.0,
            }
        balances[user_id]['received'] = float(row['total_received'] or 0.0)

    for data in balances.values():
        data['balance'] = round(data['paid'] - data['owed'] - data['sent'] + data['received'], 2)

    return sorted(balances.values(), key=lambda x: x['balance'], reverse=True)


def calculate_settlement_plan(fund):
    balances = calculate_fund_balances(fund)
    creditors = [
        {'user_id': item['user_id'], 'username': item['username'], 'amount': item['balance']}
        for item in balances if item['balance'] > 0
    ]
    debtors = [
        {'user_id': item['user_id'], 'username': item['username'], 'amount': -item['balance']}
        for item in balances if item['balance'] < 0
    ]

    plan = []
    creditor_index = 0
    debtor_index = 0

    while creditor_index < len(creditors) and debtor_index < len(debtors):
        creditor = creditors[creditor_index]
        debtor = debtors[debtor_index]
        amount = round(min(creditor['amount'], debtor['amount']), 2)

        if amount <= 0:
            break

        plan.append({
            'from': debtor['username'],
            'to': creditor['username'],
            'amount': amount,
        })

        creditor['amount'] = round(creditor['amount'] - amount, 2)
        debtor['amount'] = round(debtor['amount'] - amount, 2)

        if creditor['amount'] <= 0:
            creditor_index += 1
        if debtor['amount'] <= 0:
            debtor_index += 1

    return plan
