from django.contrib.auth import get_user_model
from shared_fund.models import SharedFund, FundMember

User = get_user_model()


def create_shared_fund(owner, name, description=''):
    fund = SharedFund.objects.create(owner=owner, name=name, description=description)
    FundMember.objects.create(fund=fund, user=owner, role=FundMember.ROLE_OWNER)
    return fund


def invite_member_to_fund(fund, user, role=None):
    if role is None:
        role = FundMember.ROLE_MEMBER
    return FundMember.objects.create(fund=fund, user=user, role=role)
