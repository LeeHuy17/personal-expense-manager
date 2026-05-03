import groq
import os

# Read API key from .env.local
api_key = None
try:
    with open('backend/.env.local', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('GROQ_API_KEY='):
                api_key = line.split('=', 1)[1].strip()
                break
except Exception as e:
    print(f'Error reading .env.local: {e}')

if not api_key:
    print('❌ GROQ_API_KEY not found in .env.local')
    print('Please add GROQ_API_KEY to your .env.local file')
    print('Get API key from: https://console.groq.com/keys')
    exit(1)

print(f'🔑 API Key found: {api_key[:10]}...')
print('\n🧪 Testing Groq models:')

# Test models
models_to_test = ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']

client = groq.Groq(api_key=api_key)

for model_name in models_to_test:
    try:
        print(f'\n🧪 Testing {model_name}...')
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "Hello, can you respond in one sentence?"}],
            max_tokens=50,
            temperature=0.7,
        )

        if response.choices and response.choices[0].message.content:
            print(f'✅ {model_name} - WORKING')
            print(f'   Response: {response.choices[0].message.content[:100]}...')
            break
        else:
            print(f'⚠️ {model_name} - No response')

    except Exception as e:
        error_str = str(e)[:80]
        print(f'❌ {model_name} - ERROR: {error_str}...')

print('\n📝 Groq models tested. If all failed, check your API key and internet connection.')
print('Get Groq API key from: https://console.groq.com/keys')