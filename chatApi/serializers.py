from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from rest_framework import serializers
from rest_framework.reverse import reverse
from rest_framework import permissions
from rest_framework.serializers import HyperlinkedRelatedField

from chatapp.models import *

from userapp.models import Profile, Contact


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'image', 'chat']
        
        extra_kwargs = {
            'chat': {"write_only": True, 'required': False}
        }


class FileSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = File
        fields = ['id', 'file', 'chat']
        
        extra_kwargs = {
            'chat': {"write_only": True, 'required': False},
            "file": {"required": False},
        }


class CodeSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Code
        
        fields = [
            'language', 'style',
            'linenos', 'content', 'highlight'
        ]
        
        extra_kwargs = {
            "highlight": {"read_only": True},
            "language": {"required": False},
            "stule": {"required": False},
            "linenos": {"required": False},
            "content": {"required": True}
        }


class messageSerializer(serializers.ModelSerializer):
    code = CodeSerializer(required=False, allow_null=True)
    images = ImageSerializer(many=True, allow_null=True, required=False)
    file = FileSerializer(required=False, allow_null=True, many=False)
    
    class Meta:
        model = Message

        fields = [
            'text_content', 'code', 'file', 'images',
        ]
        extra_kwargs = {
            "images": {"required": False, "allow_null": True, "many":True},
            "file": {"required": False, "allow_null": True},
            "code": {"required":False, "allow_null": True},
            "text_content":{"required": False}
        }
    
    def create(self, validated_data):
        image_data =  validated_data.get('images')
        code_data = validated_data.get('code')
        file_data = validated_data.get('file')
        message = Message.objects.create(text_content=validated_data.get("text_content"), chat=validated_data.get("chat"))

        if image_data:
            for image in image_data:
                Image.objects.create(message=message, chat=message.chat, **image)

        if code_data:
            Code.objects.create(message=message, **code_data)
        
        if file_data :
            File.objects.create(message=message, chat=message.chat, **file_data)
        
        return message
    
    def update(self, instance, validated_data):
        text_data = validated_data.get("text_content", instance.text_content)
        instance.text_content=text_data
        instance.save()
        return instance


class ComNotifiyerSerializer(serializers.ModelSerializer):
    carrier = serializers.HyperlinkedRelatedField(view_name="user-detail", read_only=True)
    recipient = serializers.HyperlinkedRelatedField(view_name="user-detail", read_only=True)
    
    class Meta:
        model = ComNotifiyer
        
        fields = [
            'carrier', 'recipient', 'action'
        ]

        extra_kwargs = {
            'action': {'read_only': True}
        }


class ChatSerializer(serializers.ModelSerializer):
    creator = serializers.HyperlinkedRelatedField(view_name="user-detail", read_only=True)
    conversation = serializers.HyperlinkedRelatedField(view_name='conversation-detail', read_only=True)
    notifiyer = ComNotifiyerSerializer(read_only=True, allow_null=True)
    message = messageSerializer(required=True)

    class Meta:
        model = Chat
        depth = 1
        
        fields = [
            'id', 'url', 'notifiyer', 'edited','creator','conversation',
            'message', 'replying', 'date_created'
        ]
        
        extra_kwargs = {
            'url': {'read_only':True},
            'is_com': {'read_only': True},
            'channel': {'read_only': True},
            'edited': {'read_only': True},
            'date_created': {'read_only':True},
            'replying': {'read_only': False, "allow_null": True},
        }

    def create(self, validated_data):
        message_data = validated_data.pop('message')
        reply_data = validated_data.pop('replying')
        replying = None
        
        if reply_data:
            try :
                replying = Chat.objects.get(**reply_data)
            except Chat.DoesNotExist:
                replying = None
        chat = Chat.objects.create(**validated_data)
        chat.replying = replying
        message = messageSerializer(data=message_data)
        
        if message.is_valid(): 
            message.save(chat=chat, creator=validated_data.get("creator"))
        else:
            raise message.errors
        chat.save()
        return chat

    def update(self, instance, validated_data):
        message_data = validated_data.get('message')
        
        if message_data:
            try:
                serializer = messageSerializer(instance=instance.message, data=message_data)
                if serializer.is_valid():
                    serializer.save()
            except Message.DoesNotExist :
                Message.objects.create(chat=instance, **message_data)
        
        return instance


class SocketChatSerializer(serializers.ModelSerializer):
    notifiyer = ComNotifiyerSerializer(read_only=True, allow_null=True)
    message = messageSerializer(required=True)

    class Meta:
        model = Chat
        depth = 1
         
        fields = [
            'id', 'url', 'notifiyer', 'edited','creator','conversation',
            'channel', 'message', 'replying', 'date_created'
        ]
        
        extra_kwargs = {
            'url': {'read_only':True},
            'is_com': {'read_only': True},
            'channel': {'read_only': True},
            'edited': {'read_only': True},
            'date_created': {'read_only':True},
            'replying': {'read_only': False, "allow_null": True},
        }

    def create(self, validated_data):
        message_data = validated_data.pop('message')
        reply_data = validated_data.pop('replying')
        replying = None
        
        if reply_data:
            try :
                replying = Chat.objects.get(**reply_data)
            except Chat.DoesNotExist:
                replying = None
        chat = Chat.objects.create(**validated_data)
        chat.replying = replying
        message = messageSerializer(data=message_data)
        
        if message.is_valid(): 
            message.save(chat=chat, creator=validated_data.get("creator"))
        else:
            raise message.errors
        chat.save()
        return chat

    def update(self, instance, validated_data):
        message_data = validated_data.get('message')
        
        if message_data:
            try:
                serializer = messageSerializer(instance=instance.message, data=message_data)
                if serializer.is_valid():
                    serializer.save()
            except Message.DoesNotExist :
                Message.objects.create(chat=instance, **message_data)
        
        return instance


class ChatReceiverSerializer(serializers.ModelSerializer):
    receiver = serializers.HyperlinkedRelatedField(view_name='user-detail', read_only=True)
    
    class Meta:
        model = ChatReceiver
        
        fields = [
            'id', 'url', 'receiver', 'received', 'read', 'date_received', 'date_read'
        ]
        
        extra_kwargs = {
            'date_received': {'read_only': True},
            'date_read': {'read_only': True}
        }


class MembershipSerializer(serializers.ModelSerializer):

    class Meta:        
        model = Membership

        fields = [
            'id', "url", 'user', 'conversation',
            'channel', 'group', 'date_joined', 'is_admin'
        ]

        extra_kwargs = {
            "url": {'read_only': False},
            'is_admin': {'required': False},
            'date_joined': {'read_only': True},
            'user':{'required': False, 'read_only': False},
        }


class CreateConversationMembershipSerializer(serializers.ModelSerializer):
    
    class Meta:        
        model = Membership
        
        fields = [
            'id', 'user', 'conversation'
        ]


class ConversationMembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        
        fields = [
            'id', 'url', 'username',
            'email', 'first_name', 'last_name'
        ]

        extra_kwargs = {
            'username': {'read_only': True},
            'email': {'read_only': True},
            'first_name': {'read_only': True},
            'last_name': {'read_only': True},
        }


class ConversationSerializer(serializers.HyperlinkedModelSerializer):

    class Meta:
        model = Conversation
        fields = ['id', 'url', 'members', 'timestamp']


class SocketConversationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Conversation
        fields = ["id", "members", "timestamp"]


class ChannelSerializer(serializers.HyperlinkedModelSerializer):
    group = serializers.HyperlinkedRelatedField(view_name='group-detail', read_only=True)
    creator = serializers.HyperlinkedRelatedField(view_name='user-detail', read_only=True)
    
    class Meta:
        model = Channel
        
        fields = [
            'id', 'url','creator', 'group', 'title',
            'closed', 'read_only', 'date_created', 'timestamp'
        ]

        extra_kwargs = {
            'url': {'read_only': True},
            'date_created':{'read_only': True},
            'title': {'required': True}
        }


class SocketChannelSerializer(serializers.ModelSerializer):

    class Meta:
        models = Channel
        depth = 1

        fields = [
            "id", "url", "creator", "group", "title",
            "closed", "read_only", "date_created", "timestamp"
        ]

        extra_kwargs = {
            'url': {'read_only': True},
            'date_created':{'read_only': True},
            'title': {'required': True}
        }


class GroupMembershipSerializer(serializers.ModelSerializer):
    group = serializers.HyperlinkedRelatedField(view_name='group-detail', read_only=True)
    user = serializers.HyperlinkedRelatedField(view_name='user-detail', queryset=User.objects.all())
    
    class Meta:
        model = Membership
        fields = [
            'id', 'url','user', 'group','date_joined',
            'is_admin'
        ]
        
        extra_kwargs = {
            'url': {'read_only': True},
            'date_joined': {'read_only': True}
        }


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    creator = serializers.HyperlinkedRelatedField(view_name='user-detail', read_only=True)    
    
    class Meta:
        model = Group
        
        fields = [
            'id', 'url', 'title','creator',
            'icon', 'closed', 'date_created', 'timestamp'
        ]

        extra_kwargs = {
            'date_created': {'read_only': True}
        }


class GroupInviteSerializer(serializers.HyperlinkedModelSerializer):
    group = serializers.HyperlinkedRelatedField(view_name='group-detail', read_only=True)

    class Meta:
        model = GroupInvite
        
        fields = [
            'id', 'group', 'duration', 'signed_value',
            'link', 'date_created'
        ]
        
        extra_kwargs = {
            'signed_value': {'read_only': True},
            'link': {'read_only': True},
            'date_created': {'read_only': True},
        }


class UserSerializer(serializers.HyperlinkedModelSerializer):
    profile = serializers.HyperlinkedIdentityField(view_name='profile-detail', read_only=True)
    
    class Meta:
        model = User
        
        fields = [
            'id', 'url', 'profile', 'username',
            'email', 'first_name', 'last_name', 'password'
        ]
        
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        
        user = User(
            username=validated_data.get('username'),
            email=validated_data.get('email'),
            first_name=validated_data.get('first_name'),
            last_name=validated_data.get('last_name'),
        )

        user.set_password(validated_data.get('password'))
        user.save()
        return user


class ChannelMembershipSerializer(serializers.ModelSerializer):
    user = serializers.HyperlinkedRelatedField(view_name='user-detail', queryset=User.objects.all())

    class Meta:
        model = Membership
        
        fields = [
            'id', 'url', 'user', 'date_joined', 'is_admin'
        ]

        extra_kwargs = {
            'url': {'read_only': True},
            'date_joined': {'read_only': True},
            'is_admin': {'read_only': False, 'required': False},
            'user': {'read_only': False, 'required': True},
        }
    
    def create(self, validated_data):
        user = validated_data.get('user')
        channel = validated_data.pop('channel')
        validated_data.pop('user')
        if user in channel.group.members.all():
            if user in channel.members.all():
                return channel.membership_set.get(user=user)
            member = Membership.objects.create(user=user, channel=channel, **validated_data)
            return member
        else :
            raise permissions.exceptions.PermissionDenied('User is  not a member of this group')

        
class ProfileSerializer(serializers.HyperlinkedModelSerializer):
    user = serializers.HyperlinkedIdentityField(view_name='user-detail', read_only=True)

    class Meta:
        model = Profile
        
        fields = [
            'id', 'url', 'user', 'profile_picture',
            'cover', 'bio', 'phone'
        ]

        extra_kwargs = {
            "user": {"read_only": True}
        }
    

class ContactSerializer(serializers.HyperlinkedModelSerializer):
    profile = serializers.HyperlinkedRelatedField("profile-detail", read_only=True)
    contact = serializers.HyperlinkedRelatedField("user-detail", read_only=False, queryset=User.objects.all())
    conversation = serializers.HyperlinkedRelatedField("conversation-detail", read_only=True)

    class Meta:
        model = Contact

        fields = [
            "id", "url", "contact", "profile", "conversation"
        ]
    
        extra_kwargs = {
            "url": {"read_only": True}
        }
        

class GroupUserStateSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = GroupUserState

        fields = [
            "user", "group", "muted"
        ]

        extra_kwargs = {
            "user": {"read_only": True},
            "group": {"read_only": True}
        }

