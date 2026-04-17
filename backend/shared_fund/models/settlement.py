from django.conf import settings
from django.db import models


class Settlement(models.Model):
    id = models.AutoField(primary_key=True)
    fund = models.ForeignKey(
        'shared_fund.SharedFund',
        on_delete=models.CASCADE,
        related_name='settlements'
    )
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settlements_sent'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settlements_received'
    )
    amount = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.from_user.username} -> {self.to_user.username}: {self.amount}'
