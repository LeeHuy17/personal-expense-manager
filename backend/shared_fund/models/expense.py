from django.conf import settings
from django.db import models


class Expense(models.Model):
    SPLIT_EQUAL = 'equal'
    SPLIT_PERCENTAGE = 'percentage'
    SPLIT_CUSTOM = 'custom'

    SPLIT_TYPE_CHOICES = [
        (SPLIT_EQUAL, 'Equal'),
        (SPLIT_PERCENTAGE, 'Percentage'),
        (SPLIT_CUSTOM, 'Custom'),
    ]

    id = models.AutoField(primary_key=True)
    fund = models.ForeignKey(
        'shared_fund.SharedFund',
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_fund_expenses'
    )
    amount = models.FloatField()
    description = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateField()
    split_type = models.CharField(
        max_length=20,
        choices=SPLIT_TYPE_CHOICES,
        default=SPLIT_EQUAL,
    )

    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['fund', 'date']),
            models.Index(fields=['amount']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f'{self.fund.name} - {self.amount} by {self.created_by.username}'
