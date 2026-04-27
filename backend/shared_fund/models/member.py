from django.conf import settings
from django.db import models


class FundMember(models.Model):
    ROLE_OWNER = 'owner'
    ROLE_MEMBER = 'member'

    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_MEMBER, 'Member'),
    ]

    id = models.AutoField(primary_key=True)
    fund = models.ForeignKey(
        'shared_fund.SharedFund',
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fund_memberships'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('fund', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.user.username} in {self.fund.name} ({self.role})'
