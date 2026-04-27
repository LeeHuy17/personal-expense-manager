from django.contrib import admin
from .models import RecentSearch

@admin.register(RecentSearch)
class RecentSearchAdmin(admin.ModelAdmin):
    list_display = ('user', 'keyword', 'searched_at')