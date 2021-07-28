from django.urls import re_path

from chatApi.consumers import *

websocket_urlpatterns = [
    re_path(r"ws/conversations/$", UserConversationsConsumer.as_asgi()),
    re_path(r"ws/conversations/(?P<conversation_id>\d+)/$", ConversationChatConsumer.as_asgi()),
    re_path(r"ws/groups/(?P<group_id>\d+)/channels/(?P<channel_id>\d+)/$", ChannelChatConsumer.as_asgi()),
    re_path(r"ws/groups/", UserGroupsConsumer.as_asgi()),
    re_path(r"ws/groups/(?P<group_id>\d+)/$", GroupChatConsumer.as_asgi()),
]
