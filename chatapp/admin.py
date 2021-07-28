from django.contrib import admin
from chatapp.models import (
    Image, File, Message,
    Chat, Reaction, Channel, GroupInvite,
    Group, Conversation, ChatReceiver, Membership,
    Code, GroupUserState)
from django.contrib.sites.models import Site


# Register your models here.

admin.site.register(GroupInvite)
admin.site.register(Image)
admin.site.register(File)
admin.site.register(Code)
admin.site.register(Message)
admin.site.register(Chat)
admin.site.register(Reaction)
admin.site.register(Channel)
admin.site.register(Group)
admin.site.register(Conversation)
admin.site.register(ChatReceiver)
admin.site.register(Membership)
admin.site.register(GroupUserState)