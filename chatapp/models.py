import re

from pygments.lexers import get_all_lexers, get_lexer_by_name
from pygments.styles import get_all_styles
from pygments.formatters.html import HtmlFormatter
from pygments import highlight

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User, AnonymousUser
from django.template.defaultfilters import slugify
from django.core.signing import TimestampSigner
from django.contrib.sites.models import Site
from django.shortcuts import Http404

from rest_framework.reverse import reverse

from userapp.models import Profile

# Create your models here.

LEXERS = [item for item in get_all_lexers() if item[1]]
LANGUAGE_CHOICES = sorted([(item[1][0], item[0]) for item in LEXERS])
STYLE_CHOICES = sorted([(item, item) for item in get_all_styles()])


class FieldError(Exception):
    pass


class Image(models.Model):
    message = models.ManyToManyField("Message", related_name='images')
    image = models.ImageField(upload_to="chatapp/users/images/%Y%m%d", max_length=150)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    chat = models.ForeignKey("Chat", on_delete=models.CASCADE, null=True)

    def save(self, *args, **kwargs):
        if self.chat and self.id:
            self.message.add(self.chat.message)
        super(Image, self).save(*args, **kwargs)


class File(models.Model):
    message = models.OneToOneField("Message",on_delete=models.CASCADE, related_name="file",null=True, blank=True)
    file = models.FileField(upload_to="chatapp/users/files/%Y%m%d", max_length=150, null=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    chat = models.ForeignKey("Chat", on_delete=models.CASCADE, null=True)
    
    def save(self, *args, **kwargs):
        if self.chat and self.id:
            self.message = self.chat.message
        super(File, self).save(*args, **kwargs)


class Code(models.Model):
    message = models.OneToOneField('Message', on_delete=models.CASCADE)    
    language = models.CharField(max_length=100, choices=LANGUAGE_CHOICES, default='javascript')
    style = models.CharField(max_length=100, choices=STYLE_CHOICES, default='friendly')
    linenos =  models.BooleanField(default=False)
    content = models.TextField()
    highlight = models.TextField(null=True)

    def save(self, *args, **kwargs):
        lexer = get_lexer_by_name(self.language)
        linenos = 'table' if self.linenos else False
        formatter = HtmlFormatter(style=self.style, linenos=linenos, full=True)
        self.highlight = highlight(self.content, lexer, formatter)
        super(Code, self).save(*args, **kwargs)


class Message(models.Model):
    chat = models.OneToOneField('Chat', on_delete=models.CASCADE, null=True)    
    text_content = models.TextField(max_length=300, null=True, blank=True)
    is_code = models.BooleanField(default=False)
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text_content


class ComNotifiyer(models.Model):
    ACTION_CHOICES = [
        ('Delete:Chat', 'Delete:Chat'),
        ('Create:Group', 'Create:Group'),
        ('Create:Channel', 'Create:Channel'),
        ('Join:Group', 'Join:Group'),
        ('Leave:Group', 'Leave:Group'),
        ('Join:Channel', 'Join:Channel'),
        ('Leave:Channel', 'Leave:Channel'),
        ('Add:Member', 'Add:Member'),
        ('Remove:Member', 'Remove:Member'),

    ] 

    carrier = models.ForeignKey(User, related_name="com_notifiyer_cset", null=True, on_delete=models.CASCADE)
    recipient = models.ForeignKey(User, related_name="com_notifiyer_rset", null=True, on_delete=models.CASCADE)
    chat = models.OneToOneField('Chat', related_name="notifiyer", on_delete=models.CASCADE)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, default="Delete:Chat")

    def __str__(self):
        return f"{self.carrier.username} {self.action} {self.recipient.username} ({self.id})"


class Chat(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    url = models.URLField(null=True, blank=True)
    conversation = models.ForeignKey('Conversation', related_name='chats', on_delete=models.CASCADE, null=True, blank=True)
    channel = models.ForeignKey('Channel', related_name='chats',on_delete=models.CASCADE, null=True, blank=True)
    replying = models.ForeignKey('Chat', related_name="replies_set", on_delete=models.CASCADE, null=True, blank=True)
    receivers = models.ManyToManyField(User, related_name="received_chats", through="ChatReceiver")
    edited = models.BooleanField(default=False)
    date_created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date_created']
    
    def get_absolute_url(self):
        initial_url = None
        if self.conversation:
            initial_url = reverse(viewname="conversation-detail", kwargs={'pk':self.conversation.id})
        elif self.channel:
            kwargs = {
                'pk':self.channel.group.id,
                'channel_id': self.channel.id
            } 
            initial_url = reverse(viewname="channel-detail", kwargs=kwargs)
        if initial_url:
            initial_url = f'{initial_url}chats/{self.id}/'
            initial_url = initial_url.replace('/', '', 1)
        return initial_url

    def replying_same_container(self):
        if self.replying:
            if self.channel :
                if self.channel != self.replying.channel:
                    raise FieldError(f"{self.__class__.__name__} replying chat must be from the same channel/conversation")
            elif self.conversation:
                if self.conversation != self.replying.conversation:
                    raise FieldError(f"{self.__class__.__name__} replying chat must be from the same channel/conversation")
    
    def get_container(self):
        return self.conversation or self.channel

    def update_container_timestamp(self, *args, **kwargs):
        
        # use request for Http
        # use scope for websocket 
        request = kwargs.get("request", None)
        scope = kwargs.get("scope", None)
        
        if self.id:
            if scope:
                user = scope.get("user")
            elif request:
                user = request.user
            else :
                return None
            receiver, created = self.chatreceiver_set.get_or_create(receiver=user)
            if created == True:
                receiver.received = True
                receiver.read = True
                receiver.save()
            if (receiver.received==True and receiver.read==False) or created==True:
                container = self.get_container()
                if container :
                    if container.timestamp < self.date_created:
                        container.reset_timestamp(self)


    def save(self, *args, **kwargs):
        self.replying_same_container()
        if self.conversation and self.channel:
            raise FieldError(f"{self.__class__.__name__} can't have both conversation and channel fields")
        if self.id:
            self.url = f"{Site.objects.get_current()}{self.get_absolute_url()}?format=json"
            self.update_container_timestamp(**kwargs)

        kwargs = {}
        super(Chat, self).save(*args, **kwargs)
    


class ChatReceiver(models.Model):
    url = models.URLField(null=True, blank=True)
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, null=True)
    received = models.BooleanField(default=False)
    read = models.BooleanField(default=False)
    date_received = models.DateTimeField(auto_now_add=True)
    date_read =  models.DateTimeField(null=True, blank=True)

    def get_absolute_url(self):
        url = None
        if self.id and (self.chat and self.receiver):
            if self.chat.url:
                url = self.chat.url.replace("?format=json","")
                url = f"{url}receivers/{self.id}/?format=json"
        return url

    def save(self, *args, **kwargs):
        if self.read==True and self.date_read==None:
            self.date_read = timezone.now()
        if self.id:
            self.url = self.get_absolute_url()
        super(ChatReceiver, self).save(*args, **kwargs) 


class Reaction(models.Model):
    chat = models.ForeignKey('Chat', on_delete=models.CASCADE)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    reaction_type = models.TextChoices('ReactionType', 'Like Hate Happy Sad Upvote DownVote')
    reaction = models.CharField(blank=False, choices=reaction_type.choices, max_length=20)


class Membership(models.Model):
    
    url = models.URLField(null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    conversation = models.ForeignKey('Conversation', on_delete=models.CASCADE, null=True, blank=True)
    channel = models.ForeignKey('Channel', on_delete=models.CASCADE, null=True, blank=True)
    group =  models.ForeignKey('Group', on_delete=models.CASCADE, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_admin = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        table = {
            "conversation": bool(self.conversation),
            "channel": bool(self.channel),
            "group": bool(self.group),
        }
        
        if list(table.values()).count(True) > 1:
            cauth = filter(lambda item: table.get(item)==True, table)
            cauth_list = []
            for key in cauth:
                cauth_list.append(key)
            raise FieldError(f"{self.__class__.__name__} can only have one of these fields {[ err for err in cauth_list ]}")
        
        if self.channel or self.group:
            url = self.get_absolute_url()
            if url:
                self.url = f"{Site.objects.get_current()}{url}?format=json"
        super(Membership, self).save(*args, **kwargs)
    

    def get_absolute_url(self):
        url = None
        if self.id:
            if self.channel:
                url = reverse(viewname="channel-member-detail", kwargs={
                    "pk":self.channel.group.id,
                    "channel_id": self.channel.id,
                    "member_id": self.id,
                })
            elif self.group:
                url = reverse(viewname="group-member-detail", kwargs={
                    "pk": self.group.id,
                    "member_id": self.id,
                }) 
        return url
    

class ConBase(models.Model):
    
    members = models.ManyToManyField(User, through='Membership')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
    
    def reset_timestamp(self, chat):
        self.timestamp = chat.date_created
        self.save()


class Conversation(ConBase):
    # conversations holds Direct messages betweet 2 users
    pass


class Channel(ConBase):
    
    creator = models.ForeignKey(User, related_name="created_channels", on_delete=models.CASCADE, null=True)
    group = models.ForeignKey('Group', related_name='channels', on_delete=models.CASCADE, null=True)
    title = models.CharField(max_length=50, blank=True)
    title_slug = models.SlugField(null=True, blank=True)
    closed = models.BooleanField(default=False)
    read_only = models.BooleanField(default=False)
    url = models.URLField(blank=True, null=True)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.id})"

    def reset_timestamp(self, chat):
        self.timestamp = chat.date_created
        self.save()
        self.group.reset_timestamp() 

    def get_absolute_url(self):
        initial_url =  reverse("channel-detail", kwargs={"pk": self.group.id, 'channel_id': self.id})
        return initial_url.replace('/', '', 1)

    def save(self, *args, **kwargs):
        self.title_slug = slugify(self.title)
        if self.group and self.id:
            self.url = f"{Site.objects.get_current()}{self.get_absolute_url()}?format=json"
        super(Channel, self).save(*args, **kwargs)


class Group(ConBase):
    
    creator = models.ForeignKey(User, related_name="created_groups", on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=50, blank=True)
    title_slug = models.SlugField(null=True, blank=True)
    icon = models.ImageField(upload_to="chatapp/groups/icons", max_length=150, default="chatapp/groups/icons/default.png")
    closed = models.BooleanField(default=False)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.id})"

    def save(self, *args, **kwargs):
        self.title_slug = slugify(self.title)
        super(Group, self).save(*args, **kwargs)

    def reset_timestamp(self):
        try :
            latest_channel = self.channels.all().order_by('-timestamp')[0]
            self.timestamp = latest_channel.timestamp
            self.save()
        except IndexError:
            pass


class GroupUserState(models.Model):
    user = models.ForeignKey(User, related_name="group_state", on_delete=models.CASCADE, null=True)
    group = models.ForeignKey(Group, related_name="userstate_set", on_delete=models.CASCADE, null=True)
    muted = models.BooleanField(default=False)


class GroupInvite(models.Model):
    DurationChoice = [(str(i), f"{i} day{'s' if i > 1 else ''}") for i in range(1, 11)]
    
    group = models.ForeignKey('Group', related_name='invites', on_delete=models.CASCADE)
    duration = models.CharField(max_length=2, default='1', choices=DurationChoice, help_text='Duration between 1-10 days')
    signed_value = models.CharField(max_length=150, default='', blank=True)
    link = models.URLField(null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True) 

    def save(self, *args, **kwargs):
        signer = TimestampSigner(salt=f"{self.group.id}")
        self.signed_value = signer.sign(value=f'{self.group.title}')
        link = reverse(viewname="join-group", kwargs={'pk':self.group.id, 'signature':self.signed_value})
        self.link = f"{Site.objects.get_current()}{link}"
        super(GroupInvite, self).save(*args, **kwargs)

