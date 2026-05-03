# Custom filters or utilities for search
from datetime import datetime

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None

def parse_float(value_str):
    if not value_str:
        return None
    try:
        return float(value_str)
    except ValueError:
        return None

def parse_int(value_str):
    if not value_str:
        return None
    try:
        return int(value_str)
    except ValueError:
        return None