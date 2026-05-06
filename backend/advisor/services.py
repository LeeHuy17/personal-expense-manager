import os
import json
import http.client
# import google.generativeai as genai
from django.conf import settings
from django.db import models
from django.utils import timezone
from expenses.models import ChiPhi, ThuNhap
from datetime import timedelta
from .models import ChatSession, ChatMessage, SpendingHabit

# Cấu hình API Key từ settings hoặc biến môi trường
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', '')
GEMINI_MODEL = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')


def _safe_amount(value):
    return float(value or 0)


def _format_currency(amount):
    return f"{amount:,.0f}đ" if isinstance(amount, (int, float)) else "0đ"


def _aggregate_by_period(user, period):
    today = timezone.localtime().date()
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

    return _safe_amount(chi.aggregate(total=models.Sum('amount'))['total']), _safe_amount(thu.aggregate(total=models.Sum('amount'))['total'])


def _top_expense_category(user):
    top = (
        ChiPhi.objects.filter(user=user)
        .values('loai__tenLoai')
        .annotate(total=models.Sum('amount'))
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
        .annotate(total=models.Sum('amount'))
        .order_by('-total')
    )
    return [
        {
            'category': row['loai__tenLoai'] or 'Khác',
            'amount': _safe_amount(row['total'])
        }
        for row in rows
    ]


def _refresh_spending_habits(user):
    last_30 = timezone.localtime().date() - timedelta(days=30)
    expenses = (
        ChiPhi.objects.filter(user=user, date__gte=last_30)
        .values('loai__tenLoai')
        .annotate(total=models.Sum('amount'), count=models.Count('id'))
        .order_by('-total')
    )
    total_amount = sum(_safe_amount(item['total']) for item in expenses)

    for expense in expenses[:5]:
        category = expense['loai__tenLoai'] or 'Khác'
        average = _safe_amount(expense['total']) / max(1, expense['count'])
        frequency = 'Nhiều lần mỗi tháng' if average > 1000000 else 'Định kỳ hàng tháng'
        note = f'Khoản chi {category} chiếm khoảng {_format_currency(expense["total"])} trong 30 ngày qua.'
        SpendingHabit.objects.update_or_create(
            user=user,
            category=category,
            defaults={
                'average_amount': average,
                'frequency': frequency,
                'note': note,
            }
        )


def _should_refresh_spending_habits(user, max_age_hours=6):
    latest = SpendingHabit.objects.filter(user=user).order_by('-last_seen').values_list('last_seen', flat=True).first()
    if not latest:
        return True
    return timezone.now() - latest > timedelta(hours=max_age_hours)


def _build_habit_summary(user):
    if _should_refresh_spending_habits(user):
        _refresh_spending_habits(user)
    habits = SpendingHabit.objects.filter(user=user).order_by('-average_amount')[:4]
    if not habits:
        return 'Hiện tại bạn chưa có thói quen chi tiêu rõ ràng trong 30 ngày vừa qua.'

    lines = []
    for habit in habits:
        lines.append(
            f'{habit.category}: trung bình {_format_currency(habit.average_amount)} mỗi lần, {habit.frequency}. {habit.note}'
        )
    return ' '.join(lines)


def get_daily_suggestion(user):
    total_month_expense, total_month_income = _aggregate_by_period(user, 'month')
    top_category_name, top_category_amount = _top_expense_category(user)
    habit_summary = _build_habit_summary(user)

    if total_month_income <= 0:
        suggestion = 'Hãy ghi lại thu nhập và chi tiêu để AI có thể đưa ra gợi ý chính xác hơn.'
    else:
        savings_rate = max(0, (total_month_income - total_month_expense) / total_month_income * 100)
        if savings_rate < 10:
            suggestion = 'Nên giảm bớt chi tiêu không cần thiết và chuyển 5-10% thu nhập vào quỹ dự phòng mỗi ngày.'
        elif savings_rate < 25:
            suggestion = 'Bạn đang quản lý ổn định. Hãy duy trì và ưu tiên quỹ tiết kiệm cho mục tiêu tiếp theo.'
        else:
            suggestion = 'Tốt rồi! Bạn có thể thử đầu tư nhỏ vào sổ tiết kiệm hoặc quỹ ngắn hạn.'

    if top_category_name:
        suggestion += f' Chú ý danh mục chi tiêu lớn nhất hiện tại: {top_category_name}.'

    return {
        'summary': suggestion,
        'savings_rate': f'{savings_rate:.1f}%'
    }


def _create_session(user):
    session, _ = ChatSession.objects.get_or_create(user=user, is_active=True)
    return session


def _append_message(session, role, content):
    return ChatMessage.objects.create(session=session, role=role, content=content)

def _load_recent_messages(user, limit=8):
    session = _create_session(user)
    return session.messages.order_by('-created_at')[:limit][::-1]


def _build_system_prompt(user):
    habit_summary = _build_habit_summary(user)
    daily_hint = get_daily_suggestion(user)['summary']
    return (
        f"Bạn là một trợ lý tài chính tiếng Việt chuyên tư vấn thu chi cá nhân. "
        f"Dựa trên thói quen: {habit_summary}. Gợi ý: {daily_hint}. "
        "Hãy trả lời ngắn gọn, cụ thể. Khuyến khích nguyên tắc 50/30/20."
    )


def _build_message_payload(user, question):
    recent = _load_recent_messages(user)
    messages = [
        {'role': 'system', 'content': _build_system_prompt(user)},
    ]
    for message in recent:
        messages.append({'role': message.role, 'content': message.content})
    messages.append({'role': 'user', 'content': question})
    return messages


def _build_gemini_prompt(messages):
    prompt_lines = []
    for message in messages:
        role = message.get('role', 'user')
        content = message.get('content', '')
        if role == 'system':
            prompt_lines.append(f'[SYSTEM] {content}')
        elif role == 'assistant':
            prompt_lines.append(f'Assistant: {content}')
        else:
            prompt_lines.append(f'User: {content}')
    prompt_lines.append('Assistant:')
    return '\n'.join(prompt_lines)


def _extract_gemini_text(response):
    if not isinstance(response, dict):
        return ''

    candidates = response.get('candidates') or []
    if candidates and isinstance(candidates, list):
        first = candidates[0]
        if isinstance(first, dict):
            output = first.get('output') or first.get('content')
            if isinstance(output, str):
                return output.strip()
            if isinstance(output, list):
                parts = []
                for chunk in output:
                    if isinstance(chunk, dict):
                        text = chunk.get('text')
                        if isinstance(text, str):
                            parts.append(text)
                return ' '.join(parts).strip()

    output = response.get('output')
    if isinstance(output, str):
        return output.strip()

    return ''


def _call_gemini(messages):
    if not GEMINI_API_KEY:
        raise RuntimeError('Missing Gemini API key')

    prompt_text = _build_gemini_prompt(messages)
    payload = {
        'model': GEMINI_MODEL,
        'prompt': {
            'text': prompt_text,
        },
        'temperature': 0.8,
        'max_output_tokens': 500,
    }
    body = json.dumps(payload)
    conn = http.client.HTTPSConnection('generativelanguage.googleapis.com', timeout=120)
    headers = {
        'Content-Type': 'application/json',
    }
    conn.request('POST', f'/v1beta2/models/{GEMINI_MODEL}:generateText?key={GEMINI_API_KEY}', body, headers)
    response = conn.getresponse()
    raw = response.read()
    if response.status != 200:
        raise RuntimeError(f'Gemini error {response.status}: {raw.decode("utf-8", errors="replace")}')
    return json.loads(raw.decode('utf-8'))


def _stream_gemini_response(messages):
    if not GEMINI_API_KEY:
        yield 'Gemini API key chưa cấu hình. Vui lòng đặt biến môi trường GEMINI_API_KEY.'
        return

    try:
        response = _call_gemini(messages)
        assistant_text = _extract_gemini_text(response)
        yield assistant_text
    except Exception as exc:
        yield f'Lỗi Gemini: {exc}'


def get_advisor_response(user, question):
    return {
        'text': 'AI Advisor is temporarily unavailable.',
        'cards': [],
        'history': []
    }   


def stream_advisor_response(user, question):
    session = _create_session(user)
    _append_message(session, 'user', question)
    messages = _build_message_payload(user, question)
    for delta in _stream_gemini_response(messages):
        yield delta
    # Save full assistant answer after streaming is completed
    # Note: final text isn't available here, but chat history is at least recorded by chunks


def load_chat_history(user):
    session = _create_session(user)
    return session.messages.order_by('created_at')[:50]
