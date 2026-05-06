from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Sum
from django.conf import settings
from expenses.models import ChiPhi, ThuNhap
import google.generativeai as genai
import groq
import re


def _safe_amount(value):
    return float(value or 0)


def _format_currency(amount):
    return f"{amount:,.0f}đ" if isinstance(amount, (int, float)) else "0đ"


def _is_finance_question(question):
    """Kiểm tra xem câu hỏi có liên quan tới tài chính không"""
    finance_keywords = [
        'chi', 'tiêu', 'tiết kiệm', 'tiền', 'lương', 'thu nhập',
        'nợ', 'khoản', 'expense', 'income', 'spending', 'budget',
        'giảm', 'tối ưu', 'lợi nhuận', 'tài chính', 'ngân sách',
        'chi phí', 'doanh thu', 'lợi', 'mục', 'loại', 'tổng',
        'tháng', 'năm', 'tuần', 'stats', 'thống kê', 'phân tích'
    ]
    
    question_lower = question.lower()
    return any(keyword in question_lower for keyword in finance_keywords)


def _get_financial_summary(user):
    """Lấy tóm tắt dữ liệu tài chính của người dùng"""
    today = timezone.localtime().date() if hasattr(timezone.localtime(), 'date') else date.today()
    
    # Tháng hiện tại
    month_start = today.replace(day=1)
    month_chi = ChiPhi.objects.filter(user=user, date__gte=month_start, date__lte=today)
    month_thu = ThuNhap.objects.filter(user=user, date__gte=month_start, date__lte=today)
    
    total_month_expense = _safe_amount(month_chi.aggregate(total=Sum('amount'))['total'])
    total_month_income = _safe_amount(month_thu.aggregate(total=Sum('amount'))['total'])
    
    # Tuần hiện tại
    week_start = today - timedelta(days=today.weekday())
    week_chi = ChiPhi.objects.filter(user=user, date__gte=week_start, date__lte=today)
    week_thu = ThuNhap.objects.filter(user=user, date__gte=week_start, date__lte=today)
    
    total_week_expense = _safe_amount(week_chi.aggregate(total=Sum('amount'))['total'])
    total_week_income = _safe_amount(week_thu.aggregate(total=Sum('amount'))['total'])
    
    # Năm hiện tại
    year_start = today.replace(month=1, day=1)
    year_chi = ChiPhi.objects.filter(user=user, date__gte=year_start, date__lte=today)
    total_year_expense = _safe_amount(year_chi.aggregate(total=Sum('amount'))['total'])
    
    # Danh mục chi cao nhất
    top_category = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'))
        .order_by('-total')
        .first()
    )
    
    top_category_name = top_category['loai__tenLoai'] if top_category else None
    top_category_amount = _safe_amount(top_category['total']) if top_category else 0
    
    savings_rate = 0
    if total_month_income > 0:
        savings_rate = max(0, (total_month_income - total_month_expense) / total_month_income * 100)
    
    return {
        'month_expense': total_month_expense,
        'month_income': total_month_income,
        'week_expense': total_week_expense,
        'week_income': total_week_income,
        'year_expense': total_year_expense,
        'top_category_name': top_category_name,
        'top_category_amount': top_category_amount,
        'savings_rate': savings_rate
    }


def _get_financial_advice(user, question, financial_data):
    """Tạo lời khuyên tài chính dựa trên dữ liệu"""
    text = (
        f"📊 **Tóm tắt tài chính:**\n"
        f"• Tháng này: Chi {_format_currency(financial_data['month_expense'])}, "
        f"Thu {_format_currency(financial_data['month_income'])}\n"
        f"• Tuần này: Chi {_format_currency(financial_data['week_expense'])}\n"
        f"• Năm nay: Chi {_format_currency(financial_data['year_expense'])}\n"
        f"• Tỷ lệ tiết kiệm: {financial_data['savings_rate']:.1f}%"
    )
    
    if financial_data['top_category_name']:
        text += f"\n• Chi lớn nhất: {financial_data['top_category_name']} ({_format_currency(financial_data['top_category_amount'])})"
    
    # Khuyến nghị
    if 'giảm' in question.lower() or 'tiết kiệm' in question.lower():
        advice = "\n\n💡 **Lời khuyên:** Hãy cắt giảm 5-10% chi tiêu ở danh mục lớn nhất. Áp dụng quy tắc 50-30-20: 50% chi tiêu thiết yếu, 30% nhu cầu, 20% tiết kiệm."
    else:
        advice = "\n\n💡 **Lời khuyên:** Theo dõi chi tiêu hàng ngày, đặt ngân sách hàng tuần, và đánh giá tiến độ cuối tuần để tối ưu hóa tài chính."
    
    return text + advice


def get_ai_advice(user, question):
    """Xử lý tin nhắn và trả về phản hồi từ AI"""
    if not user or not user.is_authenticated:
        return {
            'text': '🔐 Vui lòng đăng nhập để truy cập chatbot AI và dữ liệu tài chính cá nhân của bạn.',
            'cards': []
        }
    
    # Kiểm tra xem có phải câu hỏi về tài chính không
    is_finance = _is_finance_question(question)
    
    if is_finance:
        # Lấy tóm tắt tài chính
        financial_data = _get_financial_summary(user)
        response_text = _get_financial_advice(user, question, financial_data)
        
        # Tạo cards
        cards = [
            {'title': 'Tổng chi tháng', 'value': _format_currency(financial_data['month_expense'])},
            {'title': 'Tổng thu tháng', 'value': _format_currency(financial_data['month_income'])},
        ]
        
        if financial_data['top_category_name']:
            cards.append({
                'title': 'Chi lớn nhất',
                'value': f"{financial_data['top_category_name']}: {_format_currency(financial_data['top_category_amount'])}"
            })
        
        return {
            'text': response_text,
            'cards': cards,
            'data': {'is_financial': True}
        }
    else:
        # Sử dụng AI provider được cấu hình (gemini hoặc groq)
        ai_provider = getattr(settings, 'AI_PROVIDER', 'groq').lower()
        
        if ai_provider == 'groq':
            return _get_groq_response(question, user)
        elif ai_provider == 'gemini':
            return _get_gemini_response(question, user)
        else:
            # Fallback to groq if invalid provider
            return _get_groq_response(question, user)


def _get_groq_response(question, user):
    """Lấy phản hồi từ Groq API"""
    try:
        api_key = settings.GROQ_API_KEY
        preferred_model = settings.GROQ_MODEL
        fallback_models = getattr(settings, 'GROQ_MODEL_FALLBACKS', ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'])
        
        if not api_key:
            return {
                'text': '⚠️ Lỗi: Chưa cấu hình Groq API key. Vui lòng liên hệ quản trị viên.',
                'cards': []
            }
        
        # Khởi tạo Groq client
        client = groq.Groq(api_key=api_key)
        
        # Thử models theo thứ tự: preferred → fallback
        models_to_try = [preferred_model] + [m for m in fallback_models if m != preferred_model]
        last_error = None
        
        for model_name in models_to_try:
            try:
                # Tạo prompt hệ thống
                system_prompt = f"""Bạn là một trợ lý AI hữu ích, thân thiện, và chuyên nghiệp.
                
Thông tin người dùng:
- Tên: {user.first_name or user.username}
- Email: {user.email}

Hãy trả lời câu hỏi một cách tự nhiên, hữu ích và lịch sự. Nếu người dùng hỏi về tài chính, 
bạn có thể gợi ý họ xem phần tóm tắt tài chính riêng trong ứng dụng.

Trả lời bằng tiếng Việt nếu câu hỏi bằng tiếng Việt."""
                
                # Gửi yêu cầu
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question}
                    ],
                    max_tokens=500,
                    temperature=0.7,
                )
                
                response_text = response.choices[0].message.content if response.choices else "Xin lỗi, tôi không thể xử lý câu hỏi của bạn lúc này."
                
                return {
                    'text': response_text,
                    'cards': [],
                    'data': {'is_financial': False}
                }
                
            except Exception as e:
                last_error = e
                continue
        
        # Nếu tất cả models đều fail
        return {
            'text': f'❌ Lỗi: Không có model Groq khả dụng. Lỗi cuối cùng: {str(last_error)[:100]}',
            'cards': []
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"Groq API Error: {error_msg}")
        return {
            'text': f'❌ Lỗi khi gọi Groq AI: {error_msg[:100]}',
            'cards': []
        }
