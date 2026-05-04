import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Check tables for savings
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'savings_%';")
tables = cursor.fetchall()
print('Savings tables:', tables)

# Check if savings_savingsgoal exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='savings_savingsgoal';")
result = cursor.fetchone()
if result:
    print('Table savings_savingsgoal exists')
    # Count records
    cursor.execute("SELECT COUNT(*) FROM savings_savingsgoal;")
    count = cursor.fetchone()[0]
    print('Records in savings_savingsgoal:', count)
else:
    print('Table savings_savingsgoal does NOT exist')

conn.close()