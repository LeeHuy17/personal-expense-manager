# Utility functions for search_filter

def highlight_keyword(text, keyword):
    if not keyword or not text:
        return text[:200]  # Limit to 200 characters
    # Simple highlight, wrap keyword with <mark>
    highlighted = text.replace(keyword, f'<mark>{keyword}</mark>')
    return highlighted[:200]  # Limit highlighted text to 200 characters

def get_sort_key(sort_by):
    sort_options = {
        'date-desc': ('-date',),
        'date-asc': ('date',),
        'amount-desc': ('-amount',),
        'amount-asc': ('amount',),
        'category': ('category_name', '-date'),
    }
    return sort_options.get(sort_by, ('-date',))