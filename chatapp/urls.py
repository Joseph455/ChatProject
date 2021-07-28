from django.urls import path
from django.contrib.auth.decorators import login_required

from chatapp import views

app_name = "chatapp"

urlpatterns = [
    # path('', views.home, name="home"),
    path('base/', views.base, name="base"),
    path('', views.chat_view, name="chats"),
    path('groups/', views.group_view, name="groups"),
]