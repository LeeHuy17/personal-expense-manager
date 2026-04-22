from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from shared_fund.models import Expense, ExpenseSplit, FundMember


def round_two(value):
    return round(value + 1e-9, 2)


class ExpenseSplitSerializer(serializers.ModelSerializer):
    percentage = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = ExpenseSplit
        fields = ['user', 'amount_owed', 'percentage']


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    splits = ExpenseSplitSerializer(many=True, required=False)
    split_type = serializers.ChoiceField(choices=Expense.SPLIT_TYPE_CHOICES, default=Expense.SPLIT_EQUAL)

    class Meta:
        model = Expense
        fields = ['id', 'fund', 'created_by', 'amount', 'description', 'date', 'split_type', 'splits']
        read_only_fields = ['id', 'created_by']

    def validate(self, data):
        amount = data.get('amount')
        split_type = data.get('split_type', Expense.SPLIT_EQUAL)
        splits = data.get('splits', [])

        if split_type == Expense.SPLIT_EQUAL:
            if splits:
                print('Incoming equal split payload:', splits)
                per_share = round(amount / len(splits), 2) if amount else 0
                total_split = round(sum(item.get('amount_owed', 0) for item in splits), 2)
                remainder = round(amount - per_share * len(splits), 2)
                if abs(total_split - amount) > 0.01 and abs(total_split - (amount - remainder)) > 0.01:
                    raise ValidationError('Tổng số tiền chia phải bằng tổng số tiền của khoản chi.')

                amounts = [round(item.get('amount_owed', 0), 2) for item in splits]
                allowed = {per_share, round(per_share + 0.01, 2)}
                if not all(amount in allowed for amount in amounts):
                    raise ValidationError('Khi chọn split equal, mỗi phần chia phải gần như bằng nhau.')
            return data

        if not splits:
            raise ValidationError('Vui lòng cung cấp chi tiết splits cho split_type hiện tại.')

        if split_type == Expense.SPLIT_CUSTOM:
            total_split = sum(item.get('amount_owed', 0) for item in splits)
            if round(total_split, 2) != round(amount or 0, 2):
                raise ValidationError('Tổng số tiền chia phải bằng tổng số tiền của khoản chi.')
        elif split_type == Expense.SPLIT_PERCENTAGE:
            total_pct = sum(item.get('percentage', 0) for item in splits)
            if round(total_pct, 2) != 100.0:
                raise ValidationError('Tổng phần trăm phải bằng 100%.')
            for item in splits:
                if item.get('percentage') is None:
                    raise ValidationError('Mỗi người dùng trong split percentage cần có trường percentage.')
        if splits:
            fund = data.get('fund')
            for split_data in splits:
                user = split_data.get('user')
                if user and fund and not FundMember.objects.filter(fund=fund, user=user).exists():
                    raise ValidationError('Người dùng trong splits phải là thành viên của quỹ.')
        return data

    def create(self, validated_data):
        splits_data = validated_data.pop('splits', [])
        split_type = validated_data.get('split_type', Expense.SPLIT_EQUAL)
        expense = Expense.objects.create(**validated_data)

        if split_type == Expense.SPLIT_EQUAL:
            if splits_data:
                total_provided = round(sum(item.get('amount_owed', 0) for item in splits_data), 2)
                diff = round(expense.amount - total_provided, 2)
                if abs(diff) > 0.01:
                    raise ValidationError('Tổng số tiền chia phải bằng tổng số tiền của khoản chi.')
                if diff != 0 and splits_data:
                    splits_data[0]['amount_owed'] = round(splits_data[0].get('amount_owed', 0) + diff, 2)

                per_share = round(expense.amount / len(splits_data), 2) if expense.amount else 0
                for split_data in splits_data:
                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=split_data['user'],
                        amount_owed=round(split_data.get('amount_owed', per_share), 2),
                        percentage=round((split_data.get('amount_owed', per_share) / expense.amount) * 100, 2) if expense.amount else None,
                    )
                return expense

            members = FundMember.objects.filter(fund=expense.fund).select_related('user')
            count = members.count()
            if count == 0:
                raise ValidationError('Quỹ cần có ít nhất một thành viên để chia đều.')
            base_amount = round(expense.amount / count, 2)
            remainder = round(expense.amount - base_amount * count, 2)
            for index, membership in enumerate(members):
                owed = base_amount + (remainder if index == 0 else 0)
                ExpenseSplit.objects.create(
                    expense=expense,
                    user=membership.user,
                    amount_owed=owed,
                    percentage=round((owed / expense.amount) * 100, 2) if expense.amount else None,
                )
            return expense

        if split_type == Expense.SPLIT_PERCENTAGE:
            for split_data in splits_data:
                percentage = split_data.get('percentage', 0)
                owed = round(expense.amount * percentage / 100.0, 2)
                ExpenseSplit.objects.create(
                    expense=expense,
                    user=split_data['user'],
                    amount_owed=owed,
                    percentage=percentage,
                )
            return expense

        for split_data in splits_data:
            ExpenseSplit.objects.create(expense=expense, **split_data)

        return expense

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Số tiền phải lớn hơn 0.')
        return value
