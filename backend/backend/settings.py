import os
from pathlib import Path
import environ



# 1. Cấu hình đường dẫn gốc
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
# Đọc file .env.local
environ.Env.read_env(os.path.join(BASE_DIR, '.env.local'))

# Cấu hình Email SMTP (Dùng chung cho cả Dev và Prod để test thật)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Đọc từ file .env.local
EMAIL_HOST_USER = env('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL')


# 2. Bảo mật & Chế độ Debug
SECRET_KEY = 'django-insecure-dev-key'
DEBUG = True  # Enable debug again
ALLOWED_HOSTS = ['*']

# 3. Định nghĩa các App
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # App của bạn
    'expenses',
    
    # Thêm DRF để làm API 
    'rest_framework',
    'rest_framework.authtoken',  # ✅ Support cho Token authentication
    
    # CORS support
    'corsheaders',

    'accounts',
]

# 4. Cấu hình Middleware (CORS phải ở trên CsrfViewMiddleware)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 👈 PHẢI ở đầu tiên
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 5. Cấu hình URL & WSGI
ROOT_URLCONF = 'backend.urls'
WSGI_APPLICATION = 'backend.wsgi.application'

# 6. Cấu hình Templates (Đã sửa để tránh lỗi admin.E403)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

# 7. Cấu hình Cơ sở dữ liệu MySQL (Theo Schema )
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

# 8. Cấu hình Ngôn ngữ & Múi giờ
LANGUAGE_CODE = 'vi-vn'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

# 9. Cấu hình Tệp tĩnh (Static files)
STATIC_URL = 'static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# 10. Cấu hình CORS (Cho phép Frontend gọi API)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# 👇 Cho phép TẤT CẢ các nguồn (Chỉ dùng khi Code Dev)
CORS_ALLOW_ALL_ORIGINS = True

# Cho phép các methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Cho phép headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# 11. Cấu hình CSRF (Tạm thời disable cho endpoints API)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# 12. Django REST Framework Config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # ✅ ADD JWT Auth
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated', # THAY ĐỔI: Chỉ cho phép người đã đăng nhập
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer', # Khuyến khích: Để xem giao diện API đẹp hơn
    ],
}

# 13. CSRF Config
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# 14. Default fields
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

ROOT_URLCONF = 'backend.urls'