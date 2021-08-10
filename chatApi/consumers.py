import json
from string import ascii_letters
from asgiref.sync import sync_to_async

from channels.generic.websocket import WebsocketConsumer, AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from chatapp.models import (Conversation, Chat, ChatReceiver, Image, File,
                            Channel as ChannelModel,
                            Group as GroupModel
                            )

from chatApi.consumer_permissions import IsAutheticated, IsConversationMember, IsGroupMember

from chatApi.serializers import (
    ChatSerializer, SocketChatSerializer, SocketChannelSerializer
)

from django.http.request import HttpRequest

from django.utils import timezone
# This file containes all consumers for the chatAPi app

# conversation consumers
# channel consumers
# group consumer


class ChatConsumer(AsyncWebsocketConsumer):
    # when inhertiing from this class add the connet, receive and disconnect methods
    #  to the child class
    # Also make sure that the send_chat_event method is used when sending chat  through channel layers

    permission_classes = []

    @sync_to_async
    def receive_chat(self, event):
        chat = Chat.objects.get(id=event.get("chat_id"))

        try:
            receiver, created = ChatReceiver.objects.get_or_create(
                chat=chat, receiver=self.scope["user"])
            if created:
                receiver.received = True
                receiver.save()
        except ChatReceiver.MultipleObjectsReturned:
            # delete the extra Receiver objects
            receivers = ChatReceiver.objects.all().filter(
                chat=chat, receiver=self.scope["user"])
            for obj in receiver[0:-1]:
                del obj
            self.receive_chat(event)

    def clean_data(self, data):
        initial_data = data.copy()
        initial_data["message"]["file"] = None
        initial_data["message"]["images"] = []
        return initial_data

    @sync_to_async
    def link_chat_media(self, chat, raw_data):
        start = timezone.now()
        message_data = raw_data.get("message")

        if message_data:
            file = message_data.get("file")
            images = message_data.get("images")

            if file:
                location = file["file"]
                location = location[location.find("chatapp"):]

                try:
                    file_obj, _ = File.objects.get_or_create(file=location)
                except File.MultipleObjectsReturned:
                    file_obj = File.objects.get_queryset(file=location)[0]

                file_obj.chat = chat
                file_obj.save()

            if images:
                for i in range(len(images)):
                    location = images[i]["image"]
                    location = location[location.find("chatapp"):]

                    try:
                        img, _ = Image.objects.get_or_create(image=location)
                    except Image.MultipleObjectsReturned:
                        img = Image.objects.get_queryset(image=location)[0]
                    img.chat = chat
                    img.save()
        chat.save()

    @sync_to_async
    def serialize_chat(self, chat):
        serializer = SocketChatSerializer(instance=chat, allow_null=True)
        return serializer.data

    @sync_to_async
    def permit(self):
        for kls in self.permission_classes:
            p_cls = kls(self)
            if not p_cls.has_permission():
                return False
        return True

    @sync_to_async
    def get_model(self, id, klass):
        try:
            obj = klass.objects.get(id=id)
            return obj
        except klass.DoesNotExist:
            return None

    @database_sync_to_async
    def get_serializer_data(self, serializer):
        return serializer.validated_data

    @sync_to_async
    def create_chat(self, raw_data, serializer, **kwargs):
        user = self.scope["user"]
        channel = kwargs.get("channel", None)
        conversation = kwargs.get("conversation", None)
        chat = serializer.save(
            creator=user, conversation=conversation, channel=channel)
        chat.save(scope=self.scope)
        return chat

    def clean_serialized_user_data(self, data):
        if data.get("creator"):

            secret_data = [
                "password", "is_staff", "is_superuser",
                "is_active", "last_login", "date_joined", "user_permissions",
            ]

            for i in secret_data:
                if i in data["creator"].keys():
                    del data["creator"][i]

        return data

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))
        serialized_data = self.clean_serialized_user_data(await self.serialize_chat(chat))

        await self.send(json.dumps(
            {"chat": serialized_data}
        ))

        await self.receive_chat(event)


class ConversationChatConsumer(ChatConsumer):
    permission_classes = [IsAutheticated, IsConversationMember]
    groups = []

    @sync_to_async
    def get_conversation_members(self):
        return list(self.conversation.members.all())

    @sync_to_async
    def create_chat(self, raw_data, serializer, **kwargs):
        user = self.scope["user"]
        conversation = kwargs.get("conversation", None)
        channel = kwargs.get("channel", None)
        chat = serializer.save(
            creator=user, conversation=conversation, channel=channel)
        chat.save(scope=self.scope)
        return chat

    def get_user_conversations_group_name(self):
        name = f"all_consumers_for_conversations_{self.conversation.id}"
        return name

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["conversation_id"])

        self.channel_name = f"conv_consumer_{id}"
        self.group_name = f"conversation_{id}"
        self.conversation = await self.get_model(id, Conversation)

        if await self.permit():
            if self.group_name not in self.groups:
                self.groups.append(self.group_name)

                for group in self.groups:

                    await self.channel_layer.group_add(
                        group,
                        self.channel_name
                    )

            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):
        for group in self.groups:
            await self.channel_layer.group_discard(
                group,
                self.channel_name
            )

        await self.close(close_code)

    async def receive(self, text_data):
        data = json.loads(text_data)
        serializer = SocketChatSerializer(data=self.clean_data(data))

        if await sync_to_async(serializer.is_valid)():

            chat = await self.create_chat(
                raw_data=data,
                serializer=serializer,
                conversation=self.conversation
            )

            if chat:
                await self.link_chat_media(chat, json.loads(text_data))

                message = await self.get_serializer_data(serializer)

                for group in self.groups:
                    await self.channel_layer.group_send(
                        group,
                        {
                            "type": "send_chat_event",
                            "message": message,
                            "creator_id": self.scope["user"].id,
                            "chat_id": chat.id,
                        }
                    )

            else:
                await self.send(text_data=json.dumps({
                    "errors": serializer.errors,
                }))


class UserConversationsConsumer(AsyncWebsocketConsumer):
    #  connects all the conversation consumers for a user
    permission_classes = [IsAutheticated]
    groups = []

    @sync_to_async
    def permit(self):
        for kls in self.permission_classes:
            p_cls = kls(self)
            if not p_cls.has_permission():
                return False
        return True

    @sync_to_async
    def has_chat_permission(self, chat):
        return bool(self.scope["user"] in chat.conversation.members.all())

    @sync_to_async
    def receive_chat(self, event):
        chat = Chat.objects.get(id=event.get("chat_id"))

        try:
            receiver, created = ChatReceiver.objects.get_or_create(
                chat=chat, receiver=self.scope["user"])
            if created:
                receiver.received = True
                receiver.save()
        except ChatReceiver.MultipleObjectsReturned:
            # delete the extra Receiver objects
            receivers = ChatReceiver.objects.all().filter(
                chat=chat, receiver=self.scope["user"])
            for obj in receiver[0:-1]:
                del obj
            self.receive_chat(event)

    @sync_to_async
    def serialize_chat(self, chat):
        serializer = SocketChatSerializer(instance=chat, allow_null=True)
        return serializer.data

    def get_group_name(self, conversation):
        name = f"conversation_{conversation.id}"
        return name

    @sync_to_async
    def add_consumer_to_all_conversation_groups(self):
        user = self.scope["user"]
        conversations = user.conversation_set.all()

        for conv in conversations:
            group_name = self.get_group_name(conv)

            if group_name not in self.groups:
                self.channel_layer.group_add(
                    group_name,
                    self.channel_name,
                )

                self.groups.append(group_name)

    @sync_to_async
    def remove_consumer_to_all_conversation_groups(self):
        for group in self.groups:

            self.channel_layer.group_discard(
                group,
                self.channel_name,
            )

            self.groups.remove(group)

    async def connect(self):
        user = self.scope["user"]
        self.channel_name = f"user_{user.id}_conversations"

        if await self.permit():
            await self.add_consumer_to_all_conversation_groups()
            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):
        await self.remove_consumer_to_all_conversation_groups()
        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))

        # if await self.has_chat_permission(chat):
        serialized_data = await self.serialize_chat(chat)

        await self.send(json.dumps(
            {"chat": serialized_data}
        ))

        await self.receive_chat(event)


# NOTE THAT THE CHANNEL MUST CONNECT BEFORE THE GROUP CONNECT

class ChannelChatConsumer(ChatConsumer):
    permission_classes = [IsAutheticated]
    groups = []

    @sync_to_async
    def get_channel_members(self):
        return list(self.channelModel.members.all())

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["channel_id"])
        self.channel = await self.get_model(id=id, klass=ChannelModel)
        self.group_name = f"channel_{id}"

        if await self.permit():
            if not self.group_name in self.groups:
                await self.channel_layer.group_add(
                    self.group_name,
                    self.channel_name
                )

                self.groups.append(self.group_name)
            await self.accept()

        else:
            error_msg = "Permission Denied"

            await self.send(
                text_data=error_msg,
                close=True
            )

    async def disconnect(self, close_code):

        for group in self.groups:

            await self.channel_layer.group_discard(
                group,
                self.channel_name
            )
            self.groups.remove(group)

        self.close(close_code)

    async def receive(self, text_data):
        data = json.loads(text_data)
        serializer = SocketChatSerializer(data=self.clean_data(data))

        if await sync_to_async(serializer.is_valid)():

            chat = await self.create_chat(
                raw_data=data,
                serializer=serializer,
                channel=self.channel
            )

            if chat:
                await self.link_chat_media(chat, json.loads(text_data))
                message = await self.get_serializer_data(serializer)

                # #relay message to self
                await self.send_chat_event({
                    "message": message,
                    "creator_id": self.scope["user"].id,
                    "chat_id": chat.id,
                    "broadcast_level": 0,
                })

                # relay message to the group consumer

                # for group in self.groups:
                #     await self.channel_layer.group_send(
                #         group,
                #         {
                #             "type": "send_chat_event",
                #             "message": message,
                #             "creator_id": self.scope["user"].id,
                #             "chat_id": chat.id,
                #             "broadcast_level": 0,                        }
                #     )

        else:
            await self.send(text_data=json.dumps({
                "errors": serializer.errors,
            }))

    async def send_chat_event(self, event):
        lvl = event.get("broadcast_level", 0)
        
        if lvl == 0:
            await super().send_chat_event(event)

            event["broadcast_level"] = 1
            event["type"] = "send_chat_event"
            print("ATTEMPTING TO RELAY TO LVL1")
            print(event)
            for group in self.groups:
                await self.channel_layer.group_send(
                    group,
                    event
                )


class GroupChatConsumer(AsyncWebsocketConsumer):

    # this consumer connects all the channels in a group

    permission_classes = [IsAutheticated, IsGroupMember]
    groups = []

    @sync_to_async
    def permit(self):
        for kls in self.permission_classes:
            p_cls = kls(self)
            if not p_cls.has_permission():
                return False
        return True

    @sync_to_async
    def get_model(self, id, klass):
        try:
            obj = klass.objects.get(id=id)
            return obj
        except klass.DoesNotExist:
            return None

    @sync_to_async
    def receive_chat(self, event):
        chat = Chat.objects.get(id=event.get("chat_id"))

        try:
            receiver, created = ChatReceiver.objects.get_or_create(
                chat=chat, receiver=self.scope["user"])
            if created:
                receiver.received = True
                receiver.save()
        except ChatReceiver.MultipleObjectsReturned:
            # delete the extra Receiver objects
            receivers = ChatReceiver.objects.all().filter(
                chat=chat, receiver=self.scope["user"])
            for obj in receivers[0:-1]:
                del obj
            self.receive_chat(event)

    @sync_to_async
    def serialize_chat(self, chat):
        serializer = SocketChatSerializer(instance=chat, allow_null=True)
        return serializer.data

    @sync_to_async
    def has_chat_permission(self, chat):
        return bool(chat.channel.members.filter(id=self.scope["user"].id))

    def get_group_name(self, channel):
        return f"channel_{channel.id}"

    @sync_to_async
    def add_consumer_to_all_mchannel_groups(self):
        user = self.scope["user"]
        channels = self.group.channels.filter(members__id=user.id)

        for char in channels:
            group_name = self.get_group_name(char)

            if group_name not in self.groups:

                self.channel_layer.group_add(
                    group_name,
                    self.channel_name,
                )

                self.groups.append(group_name)

    @sync_to_async
    def remove_consumer_from_all_mchannel_groups(self):

        for group in self.groups:
            self.channel_layer.group_discard(
                group,
                self.channel_name,
            )

            self.groups.remove(group)

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["group_id"])
        user = self.scope['user']
        self.group = await self.get_model(id=id, klass=GroupModel)
        # self.channel_name = f"consumer_{user.id}_group_{id}"
        self.group_name = f"group_{id}"

        if await self.permit():

            if not self.group_name in self.groups:
                await self.channel_layer.group_add(
                    self.group_name,
                    self.channel_name
                )

                self.groups.append(self.group_name)

            await self.add_consumer_to_all_mchannel_groups()
            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):
        await self.remove_consumer_from_all_mchannel_groups()
        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))
        lvl = event.get("broadcast_level", 0)

        print("RELAYED TO LVL 1")
        if lvl == 1 :
            if await self.has_chat_permission(chat):
                serialized_data = await self.serialize_chat(chat)

                await self.send(json.dumps(
                    {"chat": serialized_data}
                ))

                await self.receive_chat(event)

                print("ATTEMPTING TO RELAY TO LVL 2")
                for group in filter(lambda name: 'group' in name, self.groups):
                    await self.channel_layer.group_send(
                        group,
                        {
                            "type": "send_chat_event",
                            "message": serialized_data,
                            "creator_id": self.scope["user"].id,
                            "chat_id": chat.id,
                            "broadcast_level": 2
                        }
                    )


class UserGroupsConsumer(AsyncWebsocketConsumer):

    # this consumer connects all the groups a specific user uses

    permission_classes = [IsAutheticated]
    groups = []

    @sync_to_async
    def permit(self):
        for kls in self.permission_classes:
            p_cls = kls(self)
            if not p_cls.has_permission():
                return False
        return True

    @sync_to_async
    def has_chat_permission(self, chat):
        user = self.scope["user"]
        return bool(chat.channel.members.filter(id=user.id))

    @sync_to_async
    def receive_chat(self, event):
        chat = Chat.objects.get(id=event.get("chat_id"))

        try:
            receiver, created = ChatReceiver.objects.get_or_create(
                chat=chat, receiver=self.scope["user"])
            if created:
                receiver.received = True
                receiver.save()
        except ChatReceiver.MultipleObjectsReturned:
            # delete the extra Receiver objects
            receivers = ChatReceiver.objects.all().filter(
                chat=chat, receiver=self.scope["user"])
            for obj in receivers[0:-1]:
                del obj
            self.receive_chat(event)

    @sync_to_async
    def serialize_chat(self, chat):
        serializer = SocketChatSerializer(instance=chat, allow_null=True)
        return serializer.data

    def get_group_name(self, group):
        return f"group_{group.id}"

    @sync_to_async
    def add_consumer_to_all_mgroup_groups(self):
        user = self.scope["user"]
        groups = GroupModel.objects.filter(members__id=user.id)

        for group in groups:
            group_name = self.get_group_name(group)

            if group_name not in self.groups:
                
                self.channel_layer.group_add(
                    group_name,
                    self.channel_name,
                )

                self.groups.append(group_name)

            channels = group.channels.filter(members__id=user.id)
            for char in channels:
                char_name = f"channel_{char.id}"

                if char_name not in self.groups:
                    self.channel_layer.group_add(
                        char_name,
                        self.channel_name
                    )
                    self.groups.append(char_name)

    @sync_to_async
    def remove_consumer_from_all_mgroup_groups(self):

        for group in self.groups:
            self.channel_layer.group_discard(
                group,
                self.channel_name,
            )

            self.groups.remove(group)

    async def connect(self):
        # connects to group containing all Mgroup consumers
        user = self.scope["user"]
        # self.channel_name = f"consumer_{user.id}_groups"

        if await self.permit():
            await self.add_consumer_to_all_mgroup_groups()
            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):
        await self.remove_consumer_from_all_mgroup_groups()
        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))
        lvl = event.get("broadcast_level", 0)
        
        if await self.has_chat_permission(chat):
            if lvl == 2:
                serialized_data = await self.serialize_chat(chat)

                await self.send(json.dumps(
                    {"chat": serialized_data}
                ))
                await self.receive_chat(event)
            elif lvl == 1:
                serialized_data = await self.serialize_chat(chat)

                await self.send(json.dumps(
                    {"chat": serialized_data}
                ))
                await self.receive_chat(event)


