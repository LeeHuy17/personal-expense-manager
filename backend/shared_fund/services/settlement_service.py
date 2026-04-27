from shared_fund.models import Settlement


def record_settlement(fund, from_user, to_user, amount):
    return Settlement.objects.create(
        fund=fund,
        from_user=from_user,
        to_user=to_user,
        amount=amount,
    )
