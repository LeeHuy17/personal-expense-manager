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


def _get_top_expense_categories(user, limit=3):
    results = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=Sum('amount'))
        .order_by('-total')[:limit]
    )
    return [
        {
            'category': row['loai__tenLoai'] or 'Khác',
            'amount': _safe_amount(row['total'])
        }
        for row in results
    ]


def _build_finance_advice(question, financial_data, top_categories):
    question_lower = question.lower()
    is_savings_question = any(keyword in question_lower for keyword in ['tiết kiệm', 'nên tiết kiệm', 'giảm chi', 'cắt giảm', 'tiết kiem'])
    is_category_question = any(keyword in question_lower for keyword in ['tiêu nhiều', 'chi nhiều', 'mục gì', 'tiêu ở mục', 'nhiều ở mục', 'chi lớn nhất'])
    is_budget_question = any(keyword in question_lower for keyword in ['ngân sách', 'budget', 'dự toán', 'quản lý tiền', 'chi tiêu hợp lý'])
    is_cashflow_question = any(keyword in question_lower for keyword in ['dòng tiền', 'thu nhập', 'chi tiêu hàng ngày', 'cashflow'])

    primary_target = 'tiết kiệm' if is_savings_question else 'chi tiêu' if is_category_question else 'ngân sách' if is_budget_question else 'dòng tiền' if is_cashflow_question else 'chi tiêu'
    top_category = top_categories[0] if top_categories else None
    second_category = top_categories[1] if len(top_categories) > 1 else None

    if is_category_question and top_category:
        reasoning = (
            f"Bạn đang chi nhiều nhất cho {top_category['category']} với khoảng {_format_currency(top_category['amount'])}. "
            "Đây thường là nơi bạn có thể tối ưu nhanh nhất. "
        )
        if second_category:
            reasoning += (
                f"Mục tiếp theo là {second_category['category']} với {_format_currency(second_category['amount'])}. "
            )
        reasoning += "Hãy xem lại các khoản này trước, rồi đặt giới hạn rõ ràng cho từng mục."
    elif is_budget_question:
        reasoning = (
            "Ngân sách tốt sẽ giúp bạn không bị chi quá tay. "
            "Hãy phân chia thu nhập theo 50% thiết yếu, 30% nhu cầu và 20% tiết kiệm. "
            "Nếu một mục chi vượt quá mức, hãy cân nhắc cắt giảm hoặc tìm phương án thay thế rẻ hơn."
        )
    elif is_cashflow_question:
        reasoning = (
            "Dòng tiền ổn định quan trọng hơn số dư tạm thời. "
            "Tập trung vào việc ghi lại thu nhập và chi tiêu mỗi ngày, rồi so sánh với mục tiêu tiết kiệm."
        )
    else:
        reasoning = (
            "Một cách đơn giản là theo dõi chi tiêu hàng ngày và xác định ba danh mục chi lớn nhất. "
            "Từ đó bạn có thể cắt giảm những khoản không thiết yếu trước."
        )

    if is_savings_question:
        advice = (
            "\n\n💡 **Gợi ý tiết kiệm:** Bắt đầu bằng cách tự động chuyển 15-20% thu nhập vào quỹ tiết kiệm ngay khi nhận lương. "
            "Nếu bạn chi nhiều nhất cho {} thì thử giảm 10-15% ở mục đó, rồi dùng phần còn lại để giữ tiền. "
            "Đặt mục tiêu nhỏ hàng tuần để dễ thực hiện hơn."
        ).format(top_category['category'] if top_category else 'các mục chi tiêu lớn')
    elif is_category_question:
        advice = (
            "\n\n💡 **Gợi ý tối ưu chi tiêu:** Giảm 10-15% ở mục chi lớn nhất trước, sau đó kiểm tra mục thứ hai. "
            "Hãy phân loại chi tiêu thành: cần thiết, mong muốn và tiết kiệm. "
            "Nếu mục chi lớn nhất là ăn uống hoặc mua sắm, hãy lập danh sách và chỉ mua những gì thực sự cần."
        )
    elif is_budget_question:
        advice = (
            "\n\n💡 **Gợi ý lập ngân sách:** Viết ra ngân sách hàng tuần và so sánh với chi tiêu thực tế. "
            "Ưu tiên các chi phí thiết yếu, rồi dành một phần cố định cho tiết kiệm. "
            "Nếu mục nào vượt ngân sách, hãy thay thế bằng lựa chọn rẻ hơn."
        )
    elif is_cashflow_question:
        advice = (
            "\n\n💡 **Gợi ý dòng tiền:** Theo dõi mỗi đồng vào/ra trong ngày. "
            "Khi thu nhập ổn hơn, tự động dành 20% cho tiết kiệm và 10% cho quỹ dự phòng. "
            "Những khoản còn lại mới dùng cho nhu cầu và tiêu xài."
        )
    else:
        advice = (
            "\n\n💡 **Lời khuyên chung:** Ghi lại chi tiêu hàng ngày, đặt ngân sách tuần và đánh giá lại cuối tuần. "
            "Một thói quen nhỏ mỗi ngày sẽ giúp bạn kiểm soát tốt hơn và tiết kiệm tự nhiên."
        )

    if top_category and not is_savings_question:
        advice += f"\n• Bắt đầu từ {top_category['category']} để thấy thay đổi nhanh hơn."

    return reasoning + advice


def _get_financial_advice(user, question, financial_data):
    """Tạo lời khuyên tài chính dựa trên dữ liệu với phong cách thân thiện, hài hước."""
    month_expense = financial_data['month_expense']
    month_income = financial_data['month_income']
    savings_rate = financial_data['savings_rate']
    top_category_name = financial_data['top_category_name']
    top_category_amount = financial_data['top_category_amount']

    balance = month_income - month_expense
    if month_income > 0:
        if balance >= 0:
            mood = "Ví tiền còn xanh lá, nhẹ nhàng đi tiếp nhé."
        elif balance >= -0.2 * month_income:
            mood = "Tình hình hơi căng nhưng vẫn có thể xoay được, hãy chú ý vài khoản chi."
        else:
            mood = "Đang hơi đỏ quá rồi, cần khóa chặt vài hẻm chi tiêu trước khi ví bị 'xuống'."
    else:
        mood = "Chưa có thu nhập tháng này, hãy cập nhật thêm thu nhập để mình có thể tính kỹ hơn nhé."

    top_categories = _get_top_expense_categories(user, limit=3)
    extra_summary = ''
    if len(top_categories) > 1:
        extra_summary = (
            f"• Mục 2: {top_categories[1]['category']} {_format_currency(top_categories[1]['amount'])}\n"
            f"• Mục 3: {top_categories[2]['category']} {_format_currency(top_categories[2]['amount'])}\n"
        ) if len(top_categories) > 2 else f"• Mục 2: {top_categories[1]['category']} {_format_currency(top_categories[1]['amount'])}\n"

    text = (
        f"📊 **Tóm tắt tài chính:**\n"
        f"• Tháng này: Chi {_format_currency(month_expense)}, Thu {_format_currency(month_income)}\n"
        f"• Tuần này: Chi {_format_currency(financial_data['week_expense'])}\n"
        f"• Năm nay: Chi {_format_currency(financial_data['year_expense'])}\n"
        f"• Tỷ lệ tiết kiệm: {savings_rate:.1f}%\n"
    )

    if top_category_name:
        text += f"• Chi lớn nhất: {top_category_name} ({_format_currency(top_category_amount)})\n"
    text += extra_summary
    text += f"\n💬 {mood}\n"
    text += _build_finance_advice(question, financial_data, top_categories)

    return text


def _build_ai_system_prompt(user):
    """Tạo prompt hệ thống cho AI trả lời với phong cách thân thiện và hài hước."""
    return (
        f"Bạn là một trợ lý AI tiếng Việt vui tính, thân thiện và dí dỏm. "
        f"Thông tin người dùng: {user.first_name or user.username}. "
        f"Hãy trả lời giống như một người bạn thân, dễ hiểu và nhẹ nhàng. "
        f"Nếu người dùng hỏi về tài chính, hãy đưa vào vài bình luận hài hước nhưng vẫn hữu ích. "
        f"Trả lời bằng tiếng Việt nếu câu hỏi của người dùng là tiếng Việt."
    )


def _extract_response_text(response):
    if not response:
        return ''
    response_text = getattr(response, 'output_text', None)
    if isinstance(response_text, str) and response_text.strip():
        return response_text.strip()

    output = getattr(response, 'output', None)
    if isinstance(output, str):
        return output.strip()
    if isinstance(output, list):
        parts = []
        for item in output:
            if isinstance(item, dict):
                content = item.get('content') or item.get('text')
                if isinstance(content, str):
                    parts.append(content)
        return ' '.join(parts).strip()
    if isinstance(output, dict):
        content = output.get('content') or output.get('text')
        if isinstance(content, str):
            return content.strip()
    return str(response).strip()


def _get_gemini_response(question, user):
    """Lấy phản hồi từ Gemini API với prompt thân thiện và hài hước."""
    try:
        api_key = settings.GEMINI_API_KEY
        preferred_model = settings.GEMINI_MODEL
        if not api_key:
            return {
                'text': '⚠️ Lỗi: Chưa cấu hình Gemini API key. Vui lòng liên hệ quản trị viên.',
                'cards': []
            }

        genai.configure(api_key=api_key)
        prompt = _build_ai_system_prompt(user) + f"\n\nUser: {question}"
        response = genai.responses.create(
            model=preferred_model,
            input=prompt,
            temperature=0.75,
            max_output_tokens=500,
        )
        response_text = _extract_response_text(response)
        if not response_text:
            response_text = 'Xin lỗi, tôi không thể xử lý câu hỏi của bạn lúc này.'
        return {
            'text': response_text,
            'cards': [],
            'data': {'is_financial': False}
        }
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini API Error: {error_msg}")
        return {
            'text': f'❌ Lỗi khi gọi Gemini AI: {error_msg[:100]}',
            'cards': []
        }


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
                system_prompt = _build_ai_system_prompt(user)

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
