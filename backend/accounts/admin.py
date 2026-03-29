from django.contrib import admin
from .models import PasswordResetRequest

@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'is_ready_to_reset', 'is_expired_status', 'created_at', 'expires_at')
    list_filter = ('is_ready_to_reset', 'created_at')
    search_fields = ('email', 'user__username')
    readonly_fields = ('created_at', 'token', 'uid')
    
    fieldsets = (
        ('User Info', {
            'fields': ('user', 'email')
        }),
        ('Reset Token', {
            'fields': ('token', 'uid')
        }),
        ('Status', {
            'fields': ('is_ready_to_reset',)
        }),
        ('Timeline', {
            'fields': ('created_at', 'expires_at')
        }),
    )
    
    def is_expired_status(self, obj):
        """Display whether the reset request is expired"""
        return "✅ Active" if not obj.is_expired() else "❌ Expired"
    is_expired_status.short_description = "Status"
