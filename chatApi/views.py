from django.db.models import Q
from django.http import Http404
from django.db.models import QuerySet
from django.shortcuts import render, get_object_or_404
from django.core.signing import SignatureExpired, TimestampSigner 
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django_filters import rest_framework as df_filters
from django.contrib.sites.models import Site
from django.utils import timezone


from rest_framework.views import APIView
from rest_framework import generics
from rest_framework import permissions
from rest_framework import authentication
from rest_framework import pagination
from rest_framework.parsers import JSONParser
from rest_framework.filters import SearchFilter
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.reverse  import reverse
from rest_framework import status
from rest_framework import filters
from rest_framework.parsers import FormParser

from chatApi.permissions import *
from chatApi.serializers import *
from chatapp.models import *


# Create your views here.


@api_view(['GET'])
def api_root(request, format=None):
    
    context = {
        'api-auth-login': reverse(viewname='api-auth:login', request=request ,format=format),
        'create-user': reverse(viewname='user-list', request=request ,format=format),
    }

    if request.user.is_authenticated:
        
        context =  {
            'api-auth-login': reverse(viewname='api-auth:login', request=request ,format=format),
            'api-auth-logout': reverse(viewname='api-auth:logout', request=request ,format=format),
            'global-search': reverse(viewname='global-search', request=request, format=format),
            'users': reverse(viewname='user-list', request=request ,format=format),
            'conversations': reverse(viewname='conversation-list', request=request ,format=format),
            'groups': reverse(viewname='group-list', request=request ,format=format),
            'files': reverse(viewname="file-list", request=request, format=format),
            'images': reverse(viewname="image-list", request=request, format=format),
        }

    return Response(context)


class Search(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def paginate(self, results, size=10):
        for key, value in results.items():
            page = results[key]
            if len(page) > size:
                page = page[:size]
            results[key] = page


    def search(self):
        models =  {
            'users': User,
            'groups': Group,
            'chats': Chat,
            'channels': Channel,
            'all': None
        }
        
        results = {}
        search_query = self.request.query_params.get('q', "")
        section = self.request.query_params.get('filter', 'all')
        model = models.get(section, None)
        if search_query:
            if model == User:
                results['users'] = User.objects.all().filter(
                    Q(username__istartswith=search_query) | 
                    Q(first_name__istartswith=search_query) |
                    Q(last_name__istartswith=search_query) |
                    Q(username__icontains=search_query) |
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query)         
                ).distinct()
            
            elif model == Group:
                results['groups'] = self.request.user.group_set.all().filter(
                    Q(title__istartswith=search_query) | 
                    Q(title__icontains=search_query)
                ).distinct()
            
            elif model == Channel:
                results['channels'] = self.request.user.channel_set.all().filter(
                    Q(title__istartswith=search_query) | 
                    Q(title__icontains=search_query)
                ).distinct()
            
            elif model == Chat:
                chats = list(self.request.user.chat_set.all().filter(
                    Q(message__text_content__icontains=search_query) |
                    Q(message__code__content__icontains=search_query)
                ).distinct())
                
                chats = chats + list(self.request.user.received_chats.all().filter(
                    Q(message__text_content__icontains=search_query) |
                    Q(message__code__content__icontains=search_query)
                ).distinct())

                results['chats'] = chats
            
            else :
                results['users'] = list(
                    User.objects.all().filter(
                        Q(username__istartswith=search_query) | 
                        Q(first_name__istartswith=search_query) |
                        Q(last_name__istartswith=search_query) |
                        Q(username__icontains=search_query) |
                        Q(first_name__icontains=search_query) |
                        Q(last_name__icontains=search_query)         
                    ).distinct()
                )

                results['groups'] = list(
                    self.request.user.group_set.all().filter(
                        Q(title__istartswith=search_query) | 
                        Q(title__icontains=search_query)
                    ).distinct()
                )

                results['channels']= list(
                    self.request.user.channel_set.all().filter(
                        Q(title__istartswith=search_query) | 
                        Q(title__icontains=search_query)
                    ).distinct()
                )

                chats =  list(
                    self.request.user.chat_set.all().filter(
                        Q(message__text_content__icontains=search_query) |
                        Q(message__code__content__icontains=search_query)
                    ).distinct()
                )

                chats += list(
                    self.request.user.received_chats.all().filter(
                        Q(message__text_content__icontains=search_query) |
                        Q(message__code__content__icontains=search_query)
                    ).distinct()
                )
                results['chats'] = chats

        return results

    def get(self, *args, **kwargs):
        _serializers =  {
            'users': UserSerializer,
            'groups': GroupSerializer,
            'channels': ChannelSerializer,
            'chats': ChatSerializer
        } 
        
        results = self.search()
        self.paginate(results)
        context = {}
        
        for key, value in results.items():
            serializer = _serializers.get(key)
            context[key] = serializer(instance=value, many=True, context={'request': self.request}).data

        return Response(data=context, status=status.HTTP_200_OK)


# class FileList(generics.ListCreateAPIView):
#     serializer_class = FileSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
#     ordering_fields = ['id']
#     filterset_fields = {"id": ["gte", "lte", "gt", "lt"]}
#     ordering = "id"

#     def get_queryset(self):
#         return self.request.user.file_set.all()

#     def post(self, request, *args, **kwargs):
#         file_path = self.request.data.get('file')
#         if type(file_path)==str:
#             file = None
#             for f in File.objects.all():
#                 if f.file.url in file_path:
#                     file = f
#                     break
#             if file:
                
#                 data = {
#                     "chat": self.request.data.get("chat"),
#                     "file": file.file
#                 }

#                 serializer = self.get_serializer(data=data)
                
#                 if serializer.is_valid():
#                     file_object = serializer.save(creator=self.request.user)
#                     file_object.save()
#                     chat = file_object.chat
#                     chat.date_created = timezone.now() 
#                     chat.save()
#                     return Response(serializer.data, status=status.HTTP_201_CREATED)
#                 else :
#                     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         serializer = self.get_serializer(data=request.data)

#         if serializer.is_valid():
#             file_object = serializer.save(creator=self.request.user)
#             file_object.save()
#             chat = file_object.chat
#             chat.date_created = timezone.now() 
#             chat.save()
#             return Response(serializer.data, status=status.HTTP_201_CREATED)
#         else :
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileList(generics.ListCreateAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['id']
    filterset_fields = {"id": ["gte", "lte", "gt", "lt"]}
    ordering = "id"

    def get_queryset(self):
        return self.request.user.file_set.all()

    def post(self, request, *args, **kwargs):
        file_path = self.request.data.get('file')
        
        if type(file_path)==str:
            file = None
            loc = file_path[file_path.find("chatapp"):]
            file_query = File.objects.all().filter(file__url=loc)
            
            if file_query:
                file = file_query[0]
            
            if file:
                
                data = {
                    "chat": self.request.data.get("chat"),
                    "file": file.file
                }

                serializer = self.get_serializer(data=data)
                
                if serializer.is_valid():
                    file_object = serializer.save(creator=self.request.user)
                    file_object.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else :
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            file_object = serializer.save(creator=self.request.user)
            file_object.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else :
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileDetail(generics.RetrieveDestroyAPIView):
    serializer_class = FileSerializer
    lookup_field = "pk"
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.file_set.all()


# class ImageList(generics.ListCreateAPIView):
#     serializer_class = ImageSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
#     ordering_fields = ['id']
#     filterset_fields = {"id": ["gte", "lte", "gt", "lt"]}
#     ordering = "id"

#     def get_queryset(self):
#         return self.request.user.image_set.all()

#     def post(self, request, *args, **kwargs):
#         img_path = self.request.data.get('image')
#         if type(img_path) == str:
#             image = None
#             for i in Image.objects.all():
#                 if i.image.url in img_path:
#                     image = i.image
#                     break
#             if image:
#                 data = {
#                     "chat": self.request.data.get("chat"),
#                     "image": image
#                 }
#                 serializer = self.get_serializer(data=data)
#                 if serializer.is_valid():
#                     image_object = serializer.save(creator=self.request.user)
#                     image_object.save()
#                     chat = image_object.chat
#                     chat.date_created = timezone.now() 
#                     chat.save()
#                     return Response(serializer.data, status=status.HTTP_201_CREATED)
#                 else:
#                     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
#         serializer = self.get_serializer(data=request.data)
#         if serializer.is_valid():
#             image_object = serializer.save(creator=self.request.user)
#             image_object.save()
#             chat = image_object.chat
#             chat.date_created = timezone.now() 
#             chat.save()
#             return Response(serializer.data, status=status.HTTP_201_CREATED)
#         else :
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ImageList(generics.ListCreateAPIView):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['id']
    filterset_fields = {"id": ["gte", "lte", "gt", "lt"]}
    ordering = "id"

    def get_queryset(self):
        return self.request.user.image_set.all()

    def post(self, request, *args, **kwargs):
        img_path = self.request.data.get('image')
        if type(img_path) == str:
            image = None
            for i in Image.objects.all():
                if i.image.url in img_path:
                    image = i.image
                    break
            if image:
                data = {
                    "chat": self.request.data.get("chat"),
                    "image": image
                }
                serializer = self.get_serializer(data=data)
                if serializer.is_valid():
                    image_object = serializer.save(creator=self.request.user)
                    image_object.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            image_object = serializer.save(creator=self.request.user)
            image_object.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else :
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ImageDetail(generics.RetrieveDestroyAPIView):
    lookup_field = "pk"
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.image_set.all()


class ConversationList(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['timestamp']
    filterset_fields = {"timestamp": ["gte", "lte", "gt", "lt"]}
    ordering = "-timestamp"
 
    def get_queryset(self, *args, **kwargs):
        queryset = self.request.user.conversation_set.all()
        return queryset


class ConversationDetail(generics.RetrieveAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember]

    def get_state(self):
        state = {}
        conversation = self.get_object()
        if conversation.chats.all():
            unread_chats =  conversation.chats.all().filter(
                Q(chatreceiver__received=False, chatreceiver__read=False, chatreceiver__receiver=self.request.user) |
                Q(chatreceiver__read=False, chatreceiver__receiver=self.request.user) &
                Q(chatreceiver = None)
            ).distinct().order_by("date_created")
            state['unread_chats'] = len(unread_chats)
            state['timestamp'] = unread_chats[0].date_created if unread_chats else conversation.timestamp # timestamp of the ist unread chat
            state['id'] = unread_chats[0].id if unread_chats else None # id of the ist unread chat
        return state

    def get_queryset(self, *args, **kwargs):
        queryset = self.request.user.conversation_set.all().order_by('-timestamp')
        return queryset

    def get(self, request, pk):
        conversation = self.get_object()
        serializer = self.get_serializer(instance=conversation)
        response = serializer.data
        response['state'] = self.get_state()
        return Response(response, status=status.HTTP_200_OK)


class ConversationMemberList(generics.ListAPIView):
    serializer_class = ConversationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation = get_object_or_404(self.request.user.conversation_set,id=self.kwargs.get('pk'))
        return conversation.members.all()


class ConversationChatList(generics.GenericAPIView):
    permission_classes =  [permissions.IsAuthenticated, IsMember]
    serializer_class = ChatSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter, df_filters.DjangoFilterBackend]
    search_fields = ['message__text_content', 'message__code__content']
    ordering_fields = ['date_created']
    ordering = "-date_created"
    
    filterset_fields = {
        "date_created": ["gte", "lte", "gt", "lt"]
    }

    def get_object(self):
        conversation = get_object_or_404(Conversation, id=self.kwargs.get('pk'))
        return conversation

    def get_queryset(self):
        conversation = self.get_object()
        queryset = conversation.chats.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def recieve_chats(self, query, user):
        for chat in query.exclude(chatreceiver__received=True):
            receiver_obj = chat.chatreceiver_set.get_or_create(receiver=user)[0]
            receiver_obj.received = True
            receiver_obj.save()

    def get(self, request, *args, **kwargs):
        conversation = self.get_object()
        
        if request.user in conversation.members.all():
            chats = self.get_queryset()
            self.recieve_chats(chats, request.user)
            chats = self.paginate_queryset(chats)

            if chats is not None:
                serializer = self.get_serializer(chats, many=True)
                return self.get_paginated_response(serializer.data)
           
            serializer = ChatSerializer(chats, many=True, context={'request':request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')
    
    def post(self, request, *args, **kwargs):
        conversation = self.get_object()
        serializer = ChatSerializer(data=request.data, context={'request':request})
        if request.user in conversation.members.all():
            if serializer.is_valid():
                try :
                    chat = serializer.save(creator=request.user, conversation=conversation)
                    chat.save(request=request)
                    for user in conversation.members.all():
                        if user == self.request.user:
                            receiver = ChatReceiver.objects.get_or_create(chat=chat, receiver=self.request.user)[0]
                            receiver.read = True
                            receiver.recieved = True
                            receiver.save()
                        else :
                            ChatReceiver.objects.get_or_create(chat=chat, receiver=user)[0].save()
                except FieldError:
                    return Response({"detail": "Field Error"}, status=status.HTTP_400_BAD_REQUEST)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else :
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')


class ConversationChatDetail(generics.GenericAPIView):
    serializer_class = ChatSerializer
    permission_classes =  [permissions.IsAuthenticated, IsOwner]
    pagination_class = None

    def get_object(self):
        conversation = get_object_or_404(Conversation, id=self.kwargs.get('pk'))
        chat = get_object_or_404(conversation.chats, id=self.kwargs.get('chat_id'))
        return chat
            
    def recieve_chats(self, chat, user):
        received = chat.chatreceiver_set.get_or_create(receiver=user)[0]
        received.received = True
        received.save()

    def get(self, request, **kwargs):
        if request.user in get_object_or_404(Conversation, id=kwargs.get('pk')).members.all():
            chat = self.get_object()
            
            if request.user not in chat.receivers.all():
                self.recieve_chats(chat, request.user)
            
            serializer = ChatSerializer(chat, context={'request':request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')
    
    def patch(self, request, **kwargs):
        chat = self.get_object()
        if request.user in get_object_or_404(Conversation, id=kwargs.get('pk')).members.all():
            if request.user == chat.creator:
                serializer = ChatSerializer(instance=chat, data=request.data, context={'request':request})
                
                if serializer.is_valid():
                    chat = serializer.save()
                    chat.edited = True
                    chat.save()
                    return Response(serializer.data, status=status.HTTP_200_OK)
                
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else :
                raise permissions.exceptions.PermissionDenied()
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')

    def delete(self, request, **kwargs):
        chat = self.get_object()
        
        if request.user in get_object_or_404(Conversation, id=kwargs.get('pk')).members.all():
            if request.user == chat.creator:
                
                ComNotifiyer.objects.create(
                    chat=chat,
                    action="Delete:Chat",
                    carrier=request.user,
                    recipient=request.user,
                )
                chat.creator = None
                msg = Message.objects.get(id=chat.message.id)
                print(msg.id)
                msg.delete()
                chat.save()
                serializer = ChatSerializer(instance=chat, context={'request':request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            else :
                raise permissions.exceptions.PermissionDenied()
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')


class ConversationChatReceiverList(generics.GenericAPIView):
    serializer_class = ChatReceiverSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_received', 'date_read']
    ordering = "-date_received"
    filterset_fields = {
        "date_received": ["gte", "lte", "gt", "lt"],
        "date_read": ["gte", "lte", "gt", "lt"],
        "receiver__id": ["exact"]
    }

    def get_object(self):
        conversation = get_object_or_404(Conversation, id=self.kwargs.get('pk'))
        chat = get_object_or_404(conversation.chats, id=self.kwargs.get('chat_id'))
        return chat
    
    def get_queryset(self):
        chat = self.get_object()
        queryset = chat.chatreceiver_set.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def get(self, request, *args, **kwargs):
        if request.user in get_object_or_404(Conversation, id=kwargs.get('pk')).members.all():
            receivers = self.paginate_queryset(self.get_queryset())
            if receivers is not None:
                serializer = self.get_serializer(receivers, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(self.get_queryset(), many=True, context={'request': self.request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')
    

class ConversationChatReceiverDetail(generics.GenericAPIView):
    serializer_class = ChatReceiverSerializer
    permission_classes = [permissions.IsAuthenticated, IsReceiver]

    def get_object(self):
        conversation = get_object_or_404(Conversation, id=self.kwargs.get('pk'))
        chat = get_object_or_404(conversation.chats, id=self.kwargs.get('chat_id'))
        receiver = get_object_or_404(chat.chatreceiver_set, id=self.kwargs.get('receiver_id'))
        return receiver

    def get(self, request, *args, **kwargs):
        if request.user in get_object_or_404(Conversation, id=kwargs.get('pk')).members.all():
            serializer = self.get_serializer(instance=self.get_object(), context={'request': self.request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(instance=self.get_object(), data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@login_required
@api_view(['POST', 'GET'])
def conversation_chat_read(request, *args, **kwargs):
    if request.method == 'GET':
        return Response({'detail': 'GET method not allowed use POST method to perform action'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    elif request.method == 'POST':
        conversation = get_object_or_404(Conversation, id=kwargs.get('pk'))
        chat = get_object_or_404(conversation.chats, id=kwargs.get('chat_id'))
        
        if request.user in conversation.members.all():
            receiver = get_object_or_404(chat.chatreceiver_set, receiver=request.user)
            receiver.read = True
            receiver.date_read = timezone.now()
            receiver.received = True
            receiver.save()
            return Response({'detail': 'read status has been set to True'}, status=status.HTTP_204_NO_CONTENT)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')
   
    else :
        raise permissions.exceptions.MethodNotAllowed


class GroupList(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['title', 'date_created', 'timestamp']
    search_fields = ['title']
    ordering =  '-timestamp'
    filterset_fields = {
        "timestamp": ["gte", "lte", "gt", "lt"],
        "date_created": ["gte", "lte", "gt", "lt"],
        "creator__id": ["exact"],
    }


    def filter_queryset(self, queryset):
        date_from = self.request.query_params.get('from')
        date_to = self.request.query_params.get('to')
        if date_from and date_to:
            queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
                timestamp__gte=date_from,
                timestamp__lte=date_to
            )
        elif date_from:
            queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
                timestamp__gte=date_from
            )
        elif date_to:
            queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
                timestamp__lte=date_to
            )
        return super(GroupList, self).filter_queryset(queryset)

    def get_queryset(self):
        queryset = self.request.user.group_set.all().order_by('-timestamp')
        return queryset

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        channel = Channel.objects.create(group=group, creator=self.request.user, title='general')
        channel.save()
        user_state = group.userstate_set.create(user=self.request.user)
        user_state.save()
        g_mem =  Membership(user=self.request.user, group=group, is_admin=True)
        ch_mem = Membership(user=self.request.user, channel=channel, is_admin=True)
        # need to save twice to allow the model to add url 
        g_mem.save()
        g_mem.save()
        ch_mem.save()
        ch_mem.save()


class GroupDetail(generics.RetrieveUpdateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]

    def get_object(self):
        obj = get_object_or_404(self.request.user.group_set, id=self.kwargs.get('pk'))
        return obj

    def get_queryset(self):
        queryset = self.request.user.group_set.all().order_by('-timestamp')
        return queryset

    def get(self, request, pk):
        group = self.get_object()
        serializer = self.get_serializer(instance=group)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class GroupUserStateView(generics.GenericAPIView):
    serializer_class = GroupUserStateSerializer
    permission_classes = [permissions.IsAuthenticated, GroupUserStateIsUser]

    def get_object(self):
        group = get_object_or_404(Group, id=self.kwargs.get("pk"))
        user_state = get_object_or_404(group.userstate_set, user=self.request.user)
        return user_state

    def compute_live_state_values(self):
        state = {}
        group = self.get_object().group
        num_unread_chats = 0 
        for channel in group.channels.all():    
            if channel.chats.all():
                unread_chats = channel.chats.all().filter(
                    Q(chatreceiver__received=True, chatreceiver__read=False, chatreceiver__receiver=self.request.user) |
                    Q(chatreceiver__read=False, chatreceiver__receiver=self.request.user) &
                    Q(chatreceiver = None)
                ).distinct()
                num_unread_chats += len(unread_chats)
        state["unread_chats"] = num_unread_chats
        
        try :
            # Get the last read chat 
            # not actually the last read chat but the oldest unread chat
            unread_chats = group.channels.all().order_by("-timestamp")[0].chats.all().filter(
                chatreceiver__read=False, chatreceiver__receiver=self.request.user
            ).distinct().order_by("date_created") 
            state["last_read_chat"] = unread_chats[0].url
        except IndexError:
            state["last_read_chat"] = None
        return state

    def get(self, request, **kwargs):
        state = self.compute_live_state_values()
        serializer = self.get_serializer(instance=self.get_object())
        data = dict(**serializer.data, **state)
        return Response(data=data, status=status.HTTP_200_OK)


class GroupMemberList(generics.ListCreateAPIView):
    serializer_class = GroupMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_joined']
    ordering = '-date_joined'
    filterset_fields = {
        "user__id": ["exact"],
        "is_admin": ["exact"]
    }

    def get_object(self):
        obj = get_object_or_404(Group, id=self.kwargs.get('pk'))
        return obj

    def get_queryset(self):
        group = self.get_object()
        queryset = group.membership_set.all()
        return queryset

    def perform_create(self, serializer):
        group = get_object_or_404(Group, id=self.kwargs.get('pk'))
        
        if self.request.user in group.members.all():
            user_membership = self.request.user.membership_set.get(group=group)
            
            if user_membership.is_admin:
                user = serializer.validated_data.get('user')
                
                if user not in group.members.all():
                    serializer.save(group=group)
            
            else:
                raise permissions.exceptions.PermissionDenied('Requires group admin status')


class GroupMemberDetail(generics.RetrieveUpdateDestroyAPIView):
    lookup_field = 'pk'
    lookup_url_kwarg = 'member_id'
    queryset = Membership.objects.all()
    serializer_class = GroupMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_joined']
    ordering = '-date_joined'
    filterset_fields = {
        "user__id": ["exact"],
        "is_admin": ["exact"]
    }
    
    def get_object(self):
        group = Group.objects.get(pk=self.kwargs.get('pk'))
        obj = group.membership_set.get(id=self.kwargs.get('member_id'))
        return obj
    

class GroupInviteList(generics.ListCreateAPIView):
    serializer_class = GroupInviteSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]

    def get_queryset(self):
        invites = self.get_object().invites.all().order_by('-date_created')
        for invite in invites:
            signer = TimestampSigner(salt=f"{self.kwargs.get('pk')}")
            try:
                signer.unsign(invite.signed_value, max_age=timezone.timedelta(int(invite.duration)))
            except SignatureExpired:
                invite.delete()
        return self.get_object().invites.all().order_by('-date_created')

    def get_object(self):
        obj = get_object_or_404(Group, id=self.kwargs.get('pk'))
        return obj
    
    def perform_create(self, serializer):
        serializer.save(group=self.get_object())


@login_required
@api_view(['GET'])
def join_group(request, pk, signature):
    if request.method == 'GET':
        group = get_object_or_404(Group, id=pk)
        invite = group.invites.get(signed_value=signature)
        
        if request.user in group.members.all():
            return Response({'detail': 'already a member'}, status=status.HTTP_200_OK)
        else :
            signer = TimestampSigner(salt=f'{pk}')        
            try:
                signer.unsign(signature, max_age=timezone.timedelta(int(invite.duration)))
            except SignatureExpired:
                invite.delete()
                return Response({'detail': 'This invitation has expired'}, status=status.HTTP_404_NOT_FOUND)
            else :
                membership = Membership.objects.create(group=group, user=request.user)
                membership.save()
                chat = Chat.objects.create(channel=group.channels.all().order_by('date_created')[0])
                
                ComNotifiyer.objects.create(
                    chat=chat,
                    action="Add:Member",
                    carrier=request.user,
                    recipient=membership.user,
                )
               
                chat.save()
                return Response(status=status.HTTP_200_OK)
    

@login_required
@api_view(['POST'])
def leave_group(request, pk):
    if request.method == 'POST':
        group = get_object_or_404(Group, id=pk)
        
        if request.user in group.members.all():
            membership = group.membership_set.get(user=request.user)                
            group.members.remove(request.user)
            chat = Chat.objects.create(group=group)

            ComNotifiyer.objects.create(
                chat=chat,
                action="Remove:Member",
                carrier=request.user,
                recipient=membership.user,
            )
            
            chat.save()
            membership.delete()
            group.save()
            return Response({'detail': f"left group {group.title} "},status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this group')


class ChannelList(generics.GenericAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_created', 'timestamp']
    search_fields = ['title']
    ordering = '-date_created'
    filterset_fields = {
        "timestamp": ["gte", "lte", "gt", "lt"],
        "date_created": ["gte", "lte", "gt", "lt"],
        "creator__id": ["exact"],
        "members__id": ["exact"],
    }

    def get_object(self):
        obj = Group.objects.get(id=self.kwargs.get('pk'))
        return obj

    def get_queryset(self):
        queryset = self.get_object().channels.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def get(self, request, **kwargs):
        group = Group.objects.get(id=kwargs.get('pk'))
        
        if request.user in group.members.all():
            channels = self.paginate_queryset(self.get_queryset())
            
            if channels is not None:
                serializer = self.get_serializer(channels, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = ChannelSerializer(self.get_queryset(), many=True, context={'request': request})
            return Response(serializer.data , status=status.HTTP_200_OK)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this group')

    def post(self, request, **kwargs):
        # CREATE A CHANNEL
        group = Group.objects.get(id=kwargs.get('pk'))
        
        if request.user in group.members.all():
            user_membership = group.membership_set.get(user=request.user)
            
            if user_membership.is_admin == True:
                serializer = ChannelSerializer(data=request.data)
                
                if serializer.is_valid():
                    channel = serializer.save()
                    channel.creator = request.user
                    channel.group = group
                    channel.save()
                    member = Membership.objects.create(channel=channel, user=request.user, is_admin=user_membership.is_admin)
                    member.save()       
                    chat = Chat.objects.create(channel=channel, date_created=channel.date_created)
                    
                    ComNotifiyer.objects.create(
                        chat=chat,
                        action="Create:Channel",
                        carrier=request.user,
                        recipient=request.user,
                    )

                    return  Response(ChannelSerializer(instance=channel, context={'request':request}).data, status=status.HTTP_201_CREATED)
                else :
                    return  Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)                    
            
            else :
                raise permissions.exceptions.PermissionDenied('Group admin status Needed to create channel')
        
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this group')


class ChannelDetail(generics.GenericAPIView):
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated, IsGroupMember, IsAdminOrReadOnly]
    lookup_field = 'pk'
    lookup_url_kwarg = 'channel_id'

    def get_object(self):
        group = get_object_or_404(Group, id=self.kwargs.get('pk'))
        channel =  get_object_or_404(group.channels, id=self.kwargs.get('channel_id'))
        return channel

    def get(self, request,*args, **kwargs):
        group = get_object_or_404(Group ,id=kwargs.get('pk'))
        
        if request.user in group.members.all():
            channel = group.channels.get(id = kwargs.get('channel_id'))
            serializer = self.get_serializer(instance=channel, context={'request': request})
            return Response(serializer.data , status=status.HTTP_200_OK)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this group')
        
    def put(self, request, *args, **kwargs):
        # EDIT A CHANNEL
        channel = self.get_object()
        group = channel.group
        if request.user in group.members.all().filter():
            user_membership = group.membership_set.get(user=request.user)
            if user_membership.is_admin == True:
                serializer = ChannelSerializer(channel, data=request.data, context={'request': request})
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else :
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)                    
            else :
                raise permissions.exceptions.PermissionDenied('Group admin status Needed to create channel')
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this group')


class ChannelMemberList(generics.GenericAPIView):
    lookup_field = 'pk'
    lookup_url_kwarg = 'channel_id'
    serializer_class = ChannelMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember,  IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_joined']
    ordering = '-date_joined'

    filterset_fields = {
        "user__id": ["exact"],
        "is_admin": ["exact"]
    }

    def get_queryset(self):
        queryset = self.get_object().membership_set.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        return channel

    def get_objects(self, kwargs):
        group = get_object_or_404(Group, id=kwargs.get('pk'))
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        return {'group': group, 'channel': channel}

    def get(self, request, **kwargs):
        group, channel = self.get_objects(kwargs).values()
        
        if request.user in group.members.all() and request.user in channel.members.all():
            members = self.paginate_queryset(self.get_queryset())
            
            if members is not None:
                serializer = self.get_serializer(members, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = ChannelMembershipSerializer(self.get_queryset(), many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')
    
    def post(self, request, **kwargs):
        channel = self.get_object()
        
        if request.user in channel.members.all():
            if channel.membership_set.all().filter(user=request.user, is_admin=True):
                serializer = ChannelMembershipSerializer(data=request.data, context={'request': request})
                
                if serializer.is_valid():
                    member = serializer.save(channel=channel)
                    member.save()
                    chat = Chat.objects.create(channel=channel)
                    
                    ComNotifiyer.objects.create(
                        chat=chat,
                        action="Add:Member",
                        carrier=request.user,
                        recipient=member.user,
                    )

                    chat.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                raise permissions.exceptions.PermissionDenied('Requires channel admin status')
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')

             
class ChannelMemberDetail(generics.GenericAPIView):
    serializer_class = ChannelMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsMember, IsAdminOrReadOnly]

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        obj = get_object_or_404(channel.membership_set, id=self.kwargs.get('member_id'))
        return obj
    
    def get(self, request, **kwargs):
        serializer = ChannelMembershipSerializer(instance=self.get_object(), context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, **kwargs):
        serializer = ChannelMembershipSerializer(instance=self.get_object(), data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, **kwargs):
        membership = self.get_object()
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        chat = Chat.objects.create(channel=channel)
        
        ComNotifiyer.objects.create(
            chat=chat,
            action="Remove:Member",
            carrier=request.user,
            recipient=membership.user,
        )

        chat.save()
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChannelChatList(generics.GenericAPIView):
    permission_classes =  [permissions.IsAuthenticated]
    serializer_class = ChatSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter, df_filters.DjangoFilterBackend]
    search_fields = ['message__text_content', 'message__code__content']
    ordering_fields = ['date_created']
    ordering = "-date_created"
    filterset_fields = {
        "date_created": ["gte", "lte", "gt", "lt"]
    }

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        return channel

    def get_queryset(self):
        channel = self.get_object()
        queryset = channel.chats.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    # def filter_queryset(self, queryset):
    #     date_from = self.request.query_params.get('from')
    #     date_to = self.request.query_params.get('to')
    #     if date_from and date_to:
    #         queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
    #             date_created__gte=date_from,
    #             date_created__lte=date_to
    #         )
    #     elif date_from:
    #         queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
    #             date_created__gte=date_from
    #         )
    #     elif date_to:
    #         queryset = queryset.order_by(self.request.query_params.get('ordering', self.ordering)).filter(
    #             date_created__lte=date_to
    #         )
    #     return super(ChannelChatList, self).filter_queryset(queryset)

    def recieve_chats(self, query, user):
        for chat in query.exclude(chatreceiver__received=True):
            received = chat.chatreceiver_set.get_or_create(receiver=user)[0]
            received.received = True
            received.save()

    def get(self, request, *args, **kwargs):
        channel = self.get_object()
        
        if request.user in channel.members.all():
            chats = self.get_queryset()
            self.recieve_chats(chats, request.user)
            chats = self.paginate_queryset(chats)

            if chats is not None:
                serializer = self.get_serializer(chats, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = ChatSerializer(chats, many=True, context={'request':request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')
    
    def post(self, request, *args, **kwargs):
        channel = self.get_object()
        serializer = ChatSerializer(data=request.data, context={'request':request})
        
        if request.user in channel.members.all():
            if serializer.is_valid():
                chat = serializer.save(creator=request.user, channel=channel)
                chat.save()
                chat = serializer.save(creator=request.user, channel=channel)
                chat.save(request=request)
                for user in channel.members.all():
                    if user == request.user:
                        receiver = ChatReceiver.objects.get_or_create(chat=chat, receiver=request.user)[0]
                        receiver.read = True
                        receiver.recieved = True
                        receiver.save()
                    else :
                        ChatReceiver.objects.get_or_create(chat=chat, receiver=user)[0].save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')


class ChannelChatDetail(generics.GenericAPIView):
    serializer_class = ChatSerializer
    permission_classes =  [permissions.IsAuthenticated]

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        chat = get_object_or_404(channel.chats, id=self.kwargs.get('chat_id'))
        return chat
            
    def recieve_chats(self, chat, user):
        received = chat.chatreceiver_set.get_or_create(receiver=user)[0]
        received.received = True
        received.save()

    def get(self, request, *args, **kwargs):
        
        if request.user in get_object_or_404(Channel, id=kwargs.get('channel_id')).members.all():
            chat = self.get_object()
            
            if request.user not in chat.receivers.all():
                self.recieve_chats(chat, request.user)
            
            serializer = ChatSerializer(chat, context={'request':request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')
    
    def put(self, request, *args, **kwargs):
        chat = self.get_object()
        
        if request.user in get_object_or_404(Channel, id=kwargs.get('channel_id')).members.all():
            serializer = ChatSerializer(instance=chat, data=request.data, context={'request':request}, allow_null=True)
            
            if serializer.is_valid():
                chat = serializer.save()
                chat.edited = True
                chat.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')
    
    def delete(self, request, **kwargs):
        chat = self.get_object()
        
        if request.user in get_object_or_404(Channel, id=kwargs.get('channel_id')).members.all():
            
            if request.user == chat.creator:        
                com_chat = Chat.objects.create(
                    channel=chat.channel,
                    conversation=chat.conversation,
                    date_created=chat.date_created,
                )
                
                ComNotifiyer.objects.create(
                    chat=com_chat,
                    action="Delete:Chat",
                    carrier=request.user,
                    recipient=request.user,
                )
                
                com_chat.replies_set.set(chat.replies_set.all())
                com_chat.receivers.set(chat.receivers.all())                
                com_chat.save()
                chat.delete()
                serializer = ChatSerializer(instance=com_chat, context={'request':request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            else :
                raise permissions.exceptions.PermissionDenied()
        
        else:
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')


class ChannelChatReceiverList(generics.GenericAPIView):
    serializer_class = ChatReceiverSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['date_received', 'date_read']
    ordering = "date_received"
    filterset_fields = {
        "date_received": ["gte", "lte", "gt", "lt"],
        "date_read": ["gte", "lte", "gt", "lt"],
        "receiver__id": ["exact"]
    }

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        chat = get_object_or_404(channel.chats, id=self.kwargs.get('chat_id'))
        return chat
    
    def get_queryset(self):
        chat = self.get_object()
        queryset = chat.chatreceiver_set.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def get(self, request, *args, **kwargs):
        if request.user in get_object_or_404(Channel, id=kwargs.get('channel_id')).members.all():
            channels = self.paginate_queryset(self.get_queryset())

            if channels is not None:
                serializer = self.get_serializer(channels, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = ChatReceiverSerializer(self.get_queryset(), many=True, context={'request': self.request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this channel')


class ChannelChatReceiverDetail(generics.GenericAPIView):
    serializer_class = ChatReceiverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        channel = get_object_or_404(Channel, id=self.kwargs.get('channel_id'))
        chat = get_object_or_404(channel.chats, id=self.kwargs.get('chat_id'))
        receiver = get_object_or_404(chat.chatreceiver_set, id=self.kwargs.get('receiver_id'))
        return receiver
    
    def get(self, request, *args, **kwargs):
        if request.user in get_object_or_404(Channel, id=kwargs.get('channel_id')).members.all():
            serializer = ChatReceiverSerializer(self.get_object(), context={'request': self.request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied('Not a member of this conversation')

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(instance=self.get_object(), data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@login_required
@api_view(['POST'])
def channel_chat_read(request, *args, **kwargs):
    if request.method == 'POST':
        try :
            channel = Channel.objects.get(id=kwargs.get('channel_id'))
            chat = channel.chats.get(id=kwargs.get('chat_id'))
        except (Channel.DoesNotExist, Chat.DoesNotExist):
            raise  Http404
    else :
        raise permissions.exceptions.MethodNotAllowed


@login_required
@api_view(['POST'])
def join_channel(request, pk, channel_id):
    if request.method == 'POST':
        try :
            group = Group.objects.get(id=pk)
            channel = group.channels.get(id=channel_id)
        except (Group.DoesNotExist, Channel.DoesNotExist):
            raise Http404

        if request.user in channel.members.all():
            
            serializer = ChannelMembershipSerializer(
                            channel.membership_set.get(user__id=request.user.id),
                            context={'request': request}
                        )
            
            return Response(
                        {'details': ['Already A Member Of This Channel', serializer.data]},
                        status=status.HTTP_201_CREATED
                    )
        
        if request.user in group.members.all():
            try :
                user_membership = group.membership_set.get(user=request.user)
            except :
                raise Http404

            if user_membership.is_admin:
                serializer = MembershipSerializer(data=request.data)
                
                if serializer.is_valid():
                    serializer.save(user=request.user, channel=channel, is_admin=user_membership.is_admin)
                    chat = Chat.objects.create(channel=channel)
                    
                    ComNotifiyer.objects.create(
                        chat=chat,
                        action="Add:Member",
                        carrier=request.user,
                        recipient=request.user,
                    )

                    chat.save()
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            else :
                if channel.closed:
                    raise permissions.exceptions.PermissionDenied('Closed channel only admin can add member')
                else:
                    serializer = MembershipSerializer(data=request.data)
                    if serializer.is_valid():
                        serializer.save(user=request.user ,channel=channel)
                        return Response(serializer.data, status=status.HTTP_201_CREATED)
                    else:
                        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)                    
        else :
            raise permissions.exceptions.PermissionDenied("Not a member of channel's group")


@login_required
@api_view(['POST'])
def leave_channel(request, pk, channel_id):
    if request.method == 'POST':
        try :
            group = Group.objects.get(id=pk)
            channel = group.channels.get(id=channel_id)
        except (Group.DoesNotExist, Channel.DoesNotExist):
            raise Http404

        if request.user in group.members.all():
            if request.user not in channel.members.all():
                return Response(
                        {'details': 'Not a member of this channel'},
                        status=status.HTTP_403_FORBIDDEN)
            else :
                membership = request.user.membership_set.get(channel=channel)
         
                chat = Chat.objects.create(channel=channel)
                ComNotifiyer.objects.create(
                    chat=chat,
                    action="Remove:Member",
                    carrier=request.user,
                    recipient=request.user,
                )
                chat.save()

                membership.delete()
            return Response(status=status.HTTP_200_OK)
        else :
            raise permissions.exceptions.PermissionDenied("Not a member of channel's group")


class UserList(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ['username', 'first_name']
    search_fields = ['username', '^first_name', '^last_name']
    filterset_fields = ["id", "username"]
    ordering = "id"

    def get_queryset(self):
        queryset = QuerySet(User)
        queryset = self.filter_logged_user(queryset)
        return queryset

    def filter_logged_user(self, queryset):
        param = self.request.query_params.get("logged-in", "")
        if param.lower() == ("true"):
            return queryset.filter(id=self.request.user.id)
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        Profile.objects.create(user=user)
        login(self.request, user)


class UserDetail(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes =  [permissions.IsAuthenticatedOrReadOnly, IsLoggedUserOrReadOnly]

    def get_object(self):
        try :
            obj = User.objects.get(id=self.kwargs.get('pk'))
            return obj
        except User.DoesNotExist:
            raise Http404
    
    def perform_update(self, serializer):
        password = serializer.validated_data.get('password')
        user = serializer.save()
        user.set_password(password)
        user.save()
        login(request=self.request, user=user)
    

class UserProfileDetail(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes =  [permissions.IsAuthenticatedOrReadOnly, IsLoggedUserProfileOrReadOnly]
    queryset = QuerySet(model=Profile)

    def get_object(self):
        try :
            obj = Profile.objects.get(pk=self.kwargs.get('pk'))
            return obj
        except Profile.DoesNotExist:
            raise Http404
    
                        
class ContactList(generics.ListCreateAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, ContactPermission]
    filter_backends = [filters.OrderingFilter, df_filters.DjangoFilterBackend]
    ordering_fields = ["id"]
    ordering = "id"
    filterset_fields = ["contact__id"]


    def get_object(self):
        obj = get_object_or_404(User, pk=self.kwargs.get("pk"))
        return obj

    def get_queryset(self):
        queryset = self.request.user.profile.contact_set.all()
        queryset = self.filter_queryset(queryset)
        return queryset

    def perform_create(self, serializer):
        contact_user = serializer.validated_data.get("contact")
        if contact_user == self.request.user:
            return
        try: 
            conv = contact_user.conversation_set.get(contact__contact=self.request.user)
        except Conversation.DoesNotExist:
            try:
                conv, new = self.request.user.conversation_set.get_or_create(contact__contact=serializer.validated_data.get("contact"))
                profile = self.request.user.profile
                if new :
                    contact_obj = serializer.save(profile=profile, conversation=conv)
                    conv.members.add(contact_user)
                    contact_obj.save()
                    # contact_obj.save()
                    conv.save()
                else :
                    profile.contacts.add(contact_user)
                    profile.save()
            except Conversation.MultipleObjectsReturned:
                pass
        else :
            profile = self.request.user.profile
            contact_obj = serializer.save(profile=profile, conversation=conv)
            contact_obj.save()
            # contact_obj.save()
            conv.members.add(contact_user)
            conv.save()


class ContactDetail(generics.RetrieveDestroyAPIView):
    queryset = QuerySet(Contact)
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, ContactPermission]
    pagination_class = None

    def get_object(self):
        contact = get_object_or_404(Contact, id=self.kwargs.get("contact_id"))
        return contact

    def get(self, request, *args, **kwargs):
        contact = self.get_object()
        serializer = self.get_serializer(instance=contact, context={"request": self.request})
        return Response(serializer.data)

