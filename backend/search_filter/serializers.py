from rest_framework import serializers


class TransactionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    type = serializers.CharField()
    amount = serializers.FloatField()
    date = serializers.DateField()
    description = serializers.CharField()
    highlighted_description = serializers.CharField()
    category_name = serializers.CharField(allow_null=True)
    category_type = serializers.CharField(allow_null=True)
    fund_name = serializers.CharField(allow_null=True)