from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from shared_fund.models import Expense, ExpenseSplit, SharedFund, Settlement, FundMember


class SharedFundApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='owner', password='password123')
        self.other_user = get_user_model().objects.create_user(username='member', password='password123')
        self.client.force_authenticate(user=self.user)

    def test_create_fund_and_auto_add_owner(self):
        url = reverse('fund-list')
        response = self.client.post(url, {'name': 'Quỹ chung', 'description': 'Quỹ chi tiêu nhóm'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fund = SharedFund.objects.get(id=response.data['id'])
        self.assertEqual(fund.owner, self.user)
        self.assertTrue(FundMember.objects.filter(fund=fund, user=self.user, role=FundMember.ROLE_OWNER).exists())

    def test_invite_member_to_fund(self):
        fund = SharedFund.objects.create(name='Quỹ test', description='Mô tả', owner=self.user)
        FundMember.objects.create(fund=fund, user=self.user, role=FundMember.ROLE_OWNER)
        url = reverse('fund-invite', kwargs={'pk': fund.id})
        response = self.client.post(url, {'user': self.other_user.id, 'role': 'member'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FundMember.objects.filter(fund=fund, user=self.other_user).exists())

    def test_get_balances_for_fund(self):
        fund = SharedFund.objects.create(name='Quỹ test', description='Mô tả', owner=self.user)
        FundMember.objects.create(fund=fund, user=self.user, role=FundMember.ROLE_OWNER)
        FundMember.objects.create(fund=fund, user=self.other_user, role=FundMember.ROLE_MEMBER)
        url = reverse('fund-balances', kwargs={'pk': fund.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_get_settlement_plan(self):
        fund = SharedFund.objects.create(name='Quỹ test', description='Mô tả', owner=self.user)
        FundMember.objects.create(fund=fund, user=self.user, role=FundMember.ROLE_OWNER)
        FundMember.objects.create(fund=fund, user=self.other_user, role=FundMember.ROLE_MEMBER)
        expense = Expense.objects.create(fund=fund, created_by=self.user, amount=300.0, description='Ăn uống', date='2025-01-01')
        ExpenseSplit.objects.create(expense=expense, user=self.user, amount_owed=150.0)
        ExpenseSplit.objects.create(expense=expense, user=self.other_user, amount_owed=150.0)

        url = reverse('fund-settlement-plan', kwargs={'pk': fund.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['from'], self.other_user.username)
        self.assertEqual(response.data[0]['to'], self.user.username)
        self.assertEqual(float(response.data[0]['amount']), 150.0)

    def test_equal_split_expense_create(self):
        fund = SharedFund.objects.create(name='Quỹ test', description='Mô tả', owner=self.user)
        FundMember.objects.create(fund=fund, user=self.user, role=FundMember.ROLE_OWNER)
        FundMember.objects.create(fund=fund, user=self.other_user, role=FundMember.ROLE_MEMBER)

        url = reverse('expense-list')
        response = self.client.post(url, {
            'fund': fund.id,
            'amount': 300.0,
            'description': 'Chi tiêu',
            'date': '2025-01-01',
            'split_type': 'equal',
            'splits': [
                {'user': self.user.id, 'amount_owed': 150.0},
                {'user': self.other_user.id, 'amount_owed': 150.0},
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        expense = Expense.objects.get(id=response.data['id'])
        self.assertEqual(expense.splits.count(), 2)
        self.assertEqual(sum(split.amount_owed for split in expense.splits.all()), 300.0)
