import google.generativeai as genai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

def get_ai_advice(incomes, expenses):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        total_income = sum(i.get('soLuong', 0) for i in incomes)
        total_expense = sum(e.get('amount', 0) for e in expenses)

        prompt = f"""
        Tổng thu nhập: {total_income}
        Tổng chi tiêu: {total_expense}
        Hãy đưa ra lời khuyên tài chính ngắn gọn.
        """

        res = model.generate_content(prompt)
        if not res:
            return "Không có phản hồi từ AI"

        return getattr(res, "text", None) or getattr(res, "output_text", None) or str(res)

    except Exception as e:
        return f"Lỗi AI: {str(e)}"
    