import os
import sys
import django
from django.db import connection

sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("SELECT DISTINCT user_id FROM expenses_profile")
    ids = [r[0] for r in cursor.fetchall()]
    print('profile user_ids:', ids)
    if ids:
        cursor.execute('SELECT id FROM auth_user WHERE id IN (%s)' % ','.join(str(i) for i in ids))
        auth_ids = {r[0] for r in cursor.fetchall()}
        print('auth user ids:', sorted(auth_ids))
        print('missing:', [i for i in ids if i not in auth_ids])
    else:
        print('no profile rows')
