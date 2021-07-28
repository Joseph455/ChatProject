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
                # files = File.objects.all().filter(file=location)
                # if not files:
                #     file_obj = File.objects.create(file=file)
                # else:
                #     file_obj = files[0]

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
                    # if not imgs:
                    #     img = Image.objects.create(image=location)
                    # else :
                    #     img = imgs[0]

                    img.chat = chat
                    img.save()
        chat.save()
        end = timezone.now()
        print(end-start, "seconds for link chat media")

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

    @sync_to_async
    def get_conversation_members(self):
        return list(self.conversation.members.all())

    @sync_to_async
    def create_chat(self, raw_data, serializer, **kwargs):
        user = self.scope["user"]
        conversation = kwargs.get("conversation", None)
        channel = kwargs.get("channel", None)
        chat = serializer.save(creator=user, conversation=conversation, channel=channel)
        chat.save(scope=self.scope)
        return chat

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.conversation_name = f"conv_consumer_{id}"

        # contains only the consumers in the conversations
        self.group_name = f"conversation_{id}"

        user = self.scope["user"]
        # contains all conversation consumers
        self.user_conversations_group_name = f"{user.username}_{user.id}_conversations"
        self.conversation = await self.get_model(id, Conversation)

        if await self.permit():
            # add consumer to group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):
        # remove consumer from conversation group
        await self.channel_layer.group_discard(
            self.user_conversations_group_name,
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

                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "send_chat_event",
                        "message": message,
                        "creator_id": self.scope["user"].id,
                        "chat_id": chat.id,
                    }
                )

                await self.channel_layer.group_send(
                    f"__all__conversations",
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
    permission_classes = [IsAutheticated]

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

    async def connect(self):
        user = self.scope["user"]
        # contains all conversation consumers
        self.group_name = f"{user.username}_{user.id}_conversations"
        if await self.permit():

            await self.channel_layer.group_add(
                "__all__conversations",
                self.channel_name,
            )

            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):

        await self.channel_layer.group_add(
            "__all__conversations",
            self.channel_name,
        )

        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))

        if await self.has_chat_permission(chat):
            end = timezone.now()
            serialized_data = await self.serialize_chat(chat)

            await self.send(json.dumps(
                {"chat": serialized_data}
            ))

            await self.receive_chat(event)


class ChannelChatConsumer(ChatConsumer):
    permission_classes = [IsAutheticated]

    @sync_to_async
    def get_channel_members(self):
        return list(self.channelModel.members.all())

    @sync_to_async
    def get_group_name(self):
        valid_characters = "" + ascii_letters + "_-."
        name = f"{self.channelModel.group.title}_{self.channelModel.group.id}_channels"
        valid_name = ""

        for i in name:
            if i in valid_characters:
                valid_name += i
        return valid_name

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["channel_id"])
        self.channelModel = await self.get_model(id=id, klass=ChannelModel)

        self.consumer_name = f"channel_consumer_{id}"

        # contains all ChannelChatConsumers in ChannelModel
        self.group_name = f"channel_{id}"

        # contains all ChannelChatConsumers in all ChannelModel in self.channel.group
        self.channels_group_name = await self.get_group_name()
        print(self.channels_group_name)

        if await self.permit():
            print(self.channels_group_name)

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.channel_layer.group_add(
                self.channels_group_name,
                self.channel_name
            )

            await self.accept()

            await self.send(json.dumps(
                {"chat": "This is a send test"}
            ))

            print("It has been sent")

        else:
            error_msg = "Permission Denied"
            await self.send(
                text_data=error_msg,
                close=True
            )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        await self.channel_layer.group_discard(
            self.channels_group_name,
            self.channel_name
        )

        self.close(close_code)

    async def receive(self, text_data):
        data = json.loads(text_data)
        serializer = SocketChatSerializer(data=self.clean_data(data))

        if await sync_to_async(serializer.is_valid)():

            chat = await self.create_chat(
               raw_data=data,
               serializer=serializer,
               channel=self.channelModel
            )

            if chat:
                await self.link_chat_media(chat, json.loads(text_data))
                message = await self.get_serializer_data(serializer)

                # relays message to channel consumer
                await self.channel_layer.group_send(
                    self.channels_group_name,
                    {
                        "type": "send_chat_event",
                        "message": message,
                        "creator_id": self.scope["user"].id,
                        "chat_id": chat.id,
                    }
                )

                # relay message to the group consumer
                await self.channel_layer.group_send(
                    self.group_name,
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


class GroupChatConsumer(ChatConsumer):
    permission_classes = [IsAutheticated, IsGroupMember]

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

    async def connect(self):
        id = int(self.scope["url_route"]["kwargs"]["group_id"])
        user = self.scope["user"]

        self.group_model = self.get_model(id=id, klass=GroupModel)

        self.group_name = f"{self.group_model.title}_{self.group_model.id}_channels"

        self.user_group_list_name = f"{user.username}_{user.id}_groups"

        if await self.permit():

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )

            await self.channel_layer.group_add(
                self.user_group_list_name,
                self.channel_name,
            )

            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

        await self.channel_layer.group_discard(
            self.user_group_list_name,
            self.channel_name,
        )

        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))

        if await self.has_chat_permission(chat):
            serialized_data = await self.serialize_chat(chat)

            await self.send(json.dumps(
                {"chat": serialized_data}
            ))

            # relay message to UserGroupsConsumer
            await self.channel_layer.group_send(
                self.user_group_list_name,
                {
                    "type": "send_chat_event",
                    "message": message,
                    "creator_id": self.scope["user"].id,
                    "chat_id": chat.id,
                }
            )

            await self.receive_chat(event)


class UserGroupsConsumer(AsyncWebsocketConsumer):
    permission_classes = [IsAutheticated]

    @sync_to_async
    def permit(self):
        for kls in self.permission_classes:
            p_cls = kls(self)
            if not p_cls.has_permission():
                return False
        return True

    @sync_to_async
    def has_chat_permission(self, chat):
        return bool(self.scope["user"] in chat.channel.members.all())

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

    async def connect(self):
        user = self.scope["user"]
        # contains all group consumers
        self.group_name = f"{user.username}_{user.id}_groups"

        if await self.permit():
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )

            await self.accept()
        else:
            await self.close(code=1002)

    async def disconnect(self, close_code):

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )

        await self.close(close_code)

    async def send_chat_event(self, event):
        chat = await database_sync_to_async(Chat.objects.get)(id=event.get("chat_id"))

        if await self.has_chat_permission(chat):
            serialized_data = await self.serialize_chat(chat)

            await self.send(json.dumps(
                {"chat": serialized_data}
            ))

            await self.receive_chat(event)

