from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from .models import RecentSearch
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from .services import TransactionSearchService
from .serializers import TransactionSerializer
from .filters import parse_date, parse_float, parse_int


@method_decorator(cache_page(60), name='dispatch')  # Cache for 60 seconds
class TransactionSearchView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination

    def get(self, request):
        # Extract query parameters
        keyword = request.query_params.get('keyword', '')
        date_from = parse_date(request.query_params.get('dateFrom', None))
        date_to = parse_date(request.query_params.get('dateTo', None))
        category = parse_int(request.query_params.get('category', None))
        transaction_type = request.query_params.get('type', None)  # expense, income, shared
        amount_min = parse_float(request.query_params.get('amountMin', None))
        amount_max = parse_float(request.query_params.get('amountMax', None))
        sort_by = request.query_params.get('sort', 'date-desc')
        page = request.query_params.get('page', 1)

        # Get user
        user = request.user

        # Use service to get filtered transactions
        service = TransactionSearchService()
        transactions = service.search_transactions(
            user=user,
            keyword=keyword,
            date_from=date_from,
            date_to=date_to,
            category=category,
            transaction_type=transaction_type,
            amount_min=amount_min,
            amount_max=amount_max,
            sort_by=sort_by
        )

        # Save recent search if keyword provided
        if keyword:
            service.save_recent_search(user, keyword)

        # Paginate
        paginator = self.pagination_class()
        paginated_transactions = paginator.paginate_queryset(transactions, request)

        # Serialize
        serializer = TransactionSerializer(paginated_transactions, many=True)

        return paginator.get_paginated_response(serializer.data)


class RecentSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        recent_searches = RecentSearch.objects.filter(user=user).order_by('-searched_at')[:10]
        data = [{'keyword': rs.keyword, 'searched_at': rs.searched_at} for rs in recent_searches]
        return Response(data)