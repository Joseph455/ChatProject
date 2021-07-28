from rest_framework.permissions import BasePermissionMetaclass

# this file contains permissions for consumer 


class BasePermission(metaclass=BasePermissionMetaclass):

    def __init__(self, consumer):
        self.consumer = consumer

    def has_permission(self):

        """
        Return `True` if permission is granted, `False` otherwise.
        """
        return True


class IsAutheticated(BasePermission):

    def has_permission(self):
        user = self.consumer.scope.get("user", None)
        if user:
            return user.is_authenticated
        return False


class IsConversationMember(BasePermission):
    def has_permission(self):
        user = self.consumer.scope.get("user", None)
        conversation = self.consumer.conversation
        return bool(conversation.members.all().filter(id=user.id))


class IsGroupMember(BasePermission):
    def has_permission(self):
        user = self.consumer.scope.get("user", None)
        group = self.consumer.group
        return bool(group.members.all().filter(id=user.id))


class IsChannelAdmin(BasePermission):
    def has_permission(self):
        user = self.consumer.scope.get("user")
        channel = self.consumer.channel
        if channel.is_closed:
            # that is only admin can send messages
            if (user in channel.members.filter(membership__is_admin=True)):
                pass
            else :
                # return permission denied 
                pass
