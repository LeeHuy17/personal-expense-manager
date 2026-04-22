from django.contrib import admin
from .models import ChatSession, ChatMessage, SpendingHabit


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'is_active', 'updated_at')
    search_fields = ('user__username', 'name')
    list_filter = ('is_active',)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'created_at')
    search_fields = ('session__user__username', 'content')
    list_filter = ('role',)


@admin.register(SpendingHabit)
class SpendingHabitAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'average_amount', 'frequency', 'last_seen')
    search_fields = ('user__username', 'category')
