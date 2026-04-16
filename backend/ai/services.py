from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Sum
from expenses.models import ChiPhi, ThuNhap


def _safe_amount(value):
    return float(value or 0)


def _format_currency(amount):
    return f"{amount:,.0f}đ" if isinstance(amount, (int, float)) else "0đ"


def _relative_period(date_obj):
    return date_obj.strftime('%d/%m/%Y')


def _aggregate_by_period(user, period):
    today = timezone.localtime().date() if hasattr(timezone.localtime(), 'date') else date.today()
    if period == 'month':
        start = today.replace(day=1)
    elif period == 'week':
        start = today - timedelta(days=today.weekday())
    elif period == 'year':
        start = today.replace(month=1, day=1)
    else:
        start = today - timedelta(days=30)

    chi = ChiPhi.objects.filter(user=user, date__gte=start, date__lte=today)
    thu = ThuNhap.objects.filter(user=user, date__gte=start, date__lte=today)

    return _safe_amount(chi.aggregate(total=Sum('amount'))['total']), _safe_amount(thu.aggregate(total=Sum('amount'))['total'])


def _top_expense_category(user):
    top = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'))
        .order_by('-total')
        .first()
    )
    if not top or not top.get('loai__tenLoai'):
        return None, 0
    return top['loai__tenLoai'], _safe_amount(top['total'])


def _category_spending_summary(user):
    rows = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )
    return [{
        'category': row['loai__tenLoai'] or 'Khác',
        'amount': _safe_amount(row['total'])
    } for row in rows]


def get_ai_advice(user, question):
    # Nếu chưa đăng nhập, trả về gợi ý đăng nhập
    if not user or not user.is_authenticated:
        return {
            'text': 'Vui lòng đăng nhập để truy cập dữ liệu tài chính và nhận phân tích cá nhân hóa.',
            'cards': [
                {'title': 'Cần Đăng Nhập', 'value': 'Hãy đăng nhập trước khi hỏi AI.'}
            ]
        }

    total_month_expense, total_month_income = _aggregate_by_period(user, 'month')
    total_week_expense, total_week_income = _aggregate_by_period(user, 'week')
    total_year_expense, total_year_income = _aggregate_by_period(user, 'year')

    top_category_name, top_category_amount = _top_expense_category(user)
    categories = _category_spending_summary(user)

    if total_month_income <= 0:
        savings_rate = 0
    else:
        savings_rate = max(0, (total_month_income - total_month_expense) / total_month_income * 100)

    # Xây dựng phản hồi cơ bản
    basic_text = (
        f"Tháng này bạn chi { _format_currency(total_month_expense) } và thu { _format_currency(total_month_income) }. "
        f"Tuần này chi { _format_currency(total_week_expense) }, năm nay chi { _format_currency(total_year_expense)}. "
        f"Tỷ lệ tiết kiệm tạm tính: {savings_rate:.1f}%.")

    if top_category_name:
        basic_text += f" Khoản chi lớn nhất: {top_category_name} ({_format_currency(top_category_amount)})."

    if 'giảm' in question.lower() or 'tiết kiệm' in question.lower() or 'tối ưu' in question.lower():
        advice = 'Hãy cắt giảm 5-10% chi tiêu ở danh mục lớn nhất và chuyển vào quỹ tiết kiệm. Giữ 50% thu nhập cho chi tiêu thiết yếu, 30% cho nhu cầu, 20% cho tiết kiệm.'
    else:
        advice = 'Để cải thiện tài chính, theo dõi chặt chẽ các khoản chi nhỏ hằng ngày và ưu tiên trả nợ sớm. Bạn có thể đặt ngân sách tuần và đánh giá mỗi cuối tuần.'

    cards = [
        {'title': 'Tổng chi tháng', 'value': _format_currency(total_month_expense)},
        {'title': 'Tổng thu tháng', 'value': _format_currency(total_month_income)},
        {'title': 'Chi lớn nhất', 'value': f'{top_category_name}: {_format_currency(top_category_amount)}' if top_category_name else 'Chưa có dữ liệu'},
        {'title': 'Lời khuyên', 'value': advice},
    ]

    return {
        'text': basic_text,
        'cards': cards,
        'data': {
            'category_breakdown': categories
        }
    }
