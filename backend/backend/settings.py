import os
from pathlib import Path
from dotenv import load_dotenv

# 📌 Load .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

# 📌 Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ===============================
# ⚙️ CẤU HÌNH CHUNG
# ===============================
SECRET_KEY = 'django-insecure-dev-key'
DEBUG = True
ALLOWED_HOSTS = ['*']

# ===============================
# 📦 APPS
# ===============================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'expenses',
    "corsheaders",
]

# ===============================
# 🔐 MIDDLEWARE
# ===============================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "corsheaders.middleware.CorsMiddleware",  # 👈 thêm CORS middleware
    
]
CORS_ALLOW_ALL_ORIGINS = True  # 👈 tạm thời cho phép tất cả, sau này nên cấu hình cụ thể hơn

# ===============================
# 🔗 URL
# ===============================
ROOT_URLCONF = 'backend.urls'
WSGI_APPLICATION = 'backend.wsgi.application'

# ===============================
# 🎨 TEMPLATE
# ===============================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],  # 👈 thêm nếu có HTML
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ===============================
# 🛢️ DATABASE
# ===============================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'personal_expense_manager',
        'USER': 'root',
        'PASSWORD': 'lehuy173',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}

# ===============================
# 🌍 TIMEZONE
# ===============================
LANGUAGE_CODE = 'vi-vn'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

# ===============================
# 📁 STATIC FILES (FIX WARNING)
# ===============================
STATIC_URL = 'static/'

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')  # ⚠️ phải tạo folder này
]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# ===============================
# 🔧 DEFAULT
# ===============================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'