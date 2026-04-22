from django.conf import settings
from django.db import models


class ExpenseSplit(models.Model):
    id = models.AutoField(primary_key=True)
    expense = models.ForeignKey(
        'shared_fund.Expense',
        on_delete=models.CASCADE,
        related_name='splits'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_splits'
    )
    amount_owed = models.FloatField()
    percentage = models.FloatField(blank=True, null=True)

    class Meta:
        unique_together = ('expense', 'user')

    def __str__(self):
        return f'{self.user.username} owes {self.amount_owed} for {self.expense}'
