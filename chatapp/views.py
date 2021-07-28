from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate


@login_required
def home(request):
    return render(request, 'home.html')

@login_required
def base(request):
    return render(request, 'Base.html')

@login_required
def chat_view(request):
    return render(request, 'chats.html')

@login_required
def group_view(request):
    return render(request, 'groups.html')