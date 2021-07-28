from django.urls import path

from rest_framework.urlpatterns import format_suffix_patterns

from chatApi.views import *

urlpatterns = [
    path('', api_root, name='api-root'),
    path('search/', Search.as_view(), name='global-search'),
    path('search/?q=<search_query>&filter=<filter>', Search.as_view()),
    path('files/', FileList.as_view(), name="file-list"),
    path('files/<int:pk>/', FileDetail.as_view(), name="file-detail"),
    path('images/', ImageList.as_view(), name="image-list"),
    path('images/<int:pk>/', ImageDetail.as_view(), name="image-detail"),
    path('conversations/', ConversationList.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', ConversationDetail.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/members/', ConversationMemberList.as_view(), name='conversation-member-list'),
    path('conversations/<int:pk>/chats/', ConversationChatList.as_view(), name='conversation-chat-list'),
    path('conversations/<int:pk>/chats/?q=<search_query>', ConversationChatList.as_view()),
    path('conversations/<int:pk>/chats/<int:chat_id>/', ConversationChatDetail.as_view(), name='conversation-chat-detail'),
    path('conversations/<int:pk>/chats/<int:chat_id>/read', conversation_chat_read),
    path('conversations/<int:pk>/chats/<int:chat_id>/receivers/', ConversationChatReceiverList.as_view(), name="conversation-chat-reciever-list"),
    path('conversations/<int:pk>/chats/<int:chat_id>/receivers/<int:receiver_id>/', ConversationChatReceiverDetail.as_view(), name="conversation-chat-reciever-detail"),
    
    path('groups/', GroupList.as_view(), name='group-list'), 
    path('groups/<int:pk>/', GroupDetail.as_view(), name='group-detail'),
    path('groups/<int:pk>/state/', GroupUserStateView.as_view(), name='group-state'),
    path('groups/<int:pk>/members/', GroupMemberList.as_view(), name='group-member-list'),
    path('groups/<int:pk>/members/<int:member_id>/', GroupMemberDetail.as_view(), name='group-member-detail'),
    path('groups/<int:pk>/members/invites/', GroupInviteList.as_view(), name='group-invite-list'),
    path('groups/<int:pk>/members/join/<signature>/', join_group, name='join-group'),
    path('groups/<int:pk>/members/leave/', leave_group, name="leave-group"),

    path('groups/<int:pk>/channels/', ChannelList.as_view(), name='channel-list'),
    path('groups/<int:pk>/channels/<int:channel_id>/', ChannelDetail.as_view(), name='channel-detail'),
    path('groups/<int:pk>/channels/<int:channel_id>/chats/', ChannelChatList.as_view(), name='channel-chat-list'),
    path('groups/<int:pk>/channels/<int:channel_id>/chats/?q=<search_query>', ChannelChatList.as_view()),

    path('groups/<int:pk>/channels/<int:channel_id>/chats/<int:chat_id>/', ChannelChatDetail.as_view(), name='channel-chat-detail'),
    path('groups/<int:pk>/channels/<int:channel_id>/chats/<int:chat_id>/receivers/', ChannelChatReceiverList.as_view(), name='channel-chat-reciever-list'),
    path('groups/<int:pk>/channels/<int:channel_id>/chats/<int:chat_id>/receivers/<int:receiver_id>/', ChannelChatReceiverDetail.as_view(), name='channel-chat-reciever-detail'),
    path('groups/<int:pk>/channels/<int:channel_id>/chats/<int:chat_id>/read', channel_chat_read),
    path('groups/<int:pk>/channels/<int:channel_id>/members/', ChannelMemberList.as_view(), name='channel-member-list'),
    path('groups/<int:pk>/channels/<int:channel_id>/members/<int:member_id>/', ChannelMemberDetail.as_view(), name='channel-member-detail'),
    path('groups/<int:pk>/channels/<int:channel_id>/members/join/', join_channel, name='channel-member-join'),
    path('groups/<int:pk>/channels/<int:channel_id>/members/leave/', leave_channel, name='channel-member-leave'),

    path('users/', UserList.as_view(), name='user-list'),
    path('users/<pk>/', UserDetail.as_view(), name='user-detail'),
    path('users/<pk>/profile/', UserProfileDetail.as_view(), name='profile-detail'),
    path('users/<pk>/profile/contacts/', ContactList.as_view(), name="contact-list"),
    path('users/<pk>/profile/contacts/<int:contact_id>/', ContactDetail.as_view(), name="contact-detail"),

]

urlpatterns = format_suffix_patterns(urlpatterns)