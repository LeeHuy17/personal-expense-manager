# Generated migration for PasswordResetRequest model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('token', models.CharField(max_length=255, unique=True)),
                ('uid', models.CharField(max_length=255)),
                ('is_ready_to_reset', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='reset_request', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Password Reset Request',
                'verbose_name_plural': 'Password Reset Requests',
                'ordering': ['-created_at'],
            },
        ),
    ]
