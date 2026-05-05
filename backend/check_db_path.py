import os
from pathlib import Path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()
from django.conf import settings
print('DJANGO DB PATH:', settings.DATABASES['default']['NAME'])
print('ABS PATH:', Path(settings.DATABASES['default']['NAME']).resolve())
import sqlite3
conn = sqlite3.connect(settings.DATABASES['default']['NAME'])
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='savings_savingsgoal';")
print('TABLE_EXISTS:', cursor.fetchone() is not None)
cursor.close()
conn.close()
