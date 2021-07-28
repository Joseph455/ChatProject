from rest_framework import permissions


class IsMember(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if obj.__class__.__name__  == 'Membership':
            if obj.channel:
                obj = obj.channel
            elif obj.conversation:
                obj = obj.conversation
            else :
                obj = obj.group

        return bool(obj.members.all().filter(id=request.user.id))

    def has_permission(self, request, view):
        obj = view.get_object()
        return self.has_object_permission(request, view, obj)


class IsGroupMember(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        
        if obj.__class__.__name__  == 'Membership':
            return bool(obj.channel.group.members.all().filter(id=request.user.id))
        
        return bool(obj.group.members.all().filter(id=request.user.id))
        

class IsAdminOrReadOnly(permissions.BasePermission):
    
    def has_object_permission(self, request, view, obj):

        if request.method in permissions.SAFE_METHODS:
            return True

        if obj.__class__.__name__  == 'Membership':
            if obj.channel:
                obj = obj.channel
            elif obj.conversation:
                obj = obj.conversation
            else :
                obj = obj.group

        for membership in request.user.membership_set.all():
            if membership in obj.membership_set.all().filter(is_admin=True):
                return True

    def has_permission(self, request, view):
        obj = view.get_object()
        return self.has_object_permission(request, view, obj)


class IsAdmin(permissions.BasePermission):
    
    def has_object_permission(self, request, view, obj):
        if obj.__class__.__name__  == 'Membership':
            if obj.channel:
                obj = obj.channel
            elif obj.conversation:
                obj = obj.conversation
            else :
                obj = obj.group

        for membership in request.user.membership_set.all():
            if obj.__class__.__name__  == 'GroupInvite':
                if membership in obj.group.membership_set.all().filter(is_admin=True):
                    return True
            if membership in obj.membership_set.all().filter(is_admin=True):
                return True

    def has_permission(self, request, view):
        obj = view.get_object()
        return self.has_object_permission(request, view, obj)


class IsOwner(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
    
        return request.user == obj.creator


class IsReceiver(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
    
        return request.user == obj.receiver


class IsLoggedUserOrReadOnly(permissions.BasePermission):

    def has_permission(self, request, view):
        return self.has_object_permission(request, view, view.get_object())

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user == obj


class IsLoggedUserProfileOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user == obj.user


class IsLoggedUser(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user == obj


class IsSenderOrReceiver(permissions.BasePermission):
    
    def has_object_permission(self, request, view, obj):
        permit = False

        if obj.__class__.__name__ in ['File', 'Image', 'Code']:
            if request.user == obj.message.creator:
                permit = True
            elif request.user in obj.message.chat.recieved_by.all():
                permit = True

        elif obj.__class__.__name__ == 'Message':
            if request.user == obj.creator:
                permit = True
            elif request.user in obj.chat.recieved_by.all():
                permit = True    
        
        else:
            if request.user == obj.creator:
                permit = True
            elif request.user in obj.recieved_by.all():
                permit = True
        
        return permit


class ContactPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        if view.__class__.__name__ == "ContactList":
            obj = view.get_object()
            return obj == request.user
            
        elif view.__class__.__name__ == "ContactDetail":
            return self.has_object_permission(request, view, view.get_object())

    def has_object_permission(self, request, view, obj):
        return  obj.profile.user == request.user


class GroupUserStateIsUser(permissions.BasePermission):

    def has_permission(self, request, view):
        obj = view.get_object()
        return obj.user == request.user

    def has_object_permission(self, request, view, obj):
        return  obj.user == request.user