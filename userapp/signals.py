from django.db.models.signals import post_save, pre_save
from django.core.signals import request_finished
from django.dispatch import receiver
from django.contrib.auth.models import User

from userapp.models import Profile


@receiver(post_save, sender=User)
def CreateUpdateProfileSignal(sender, instance, created, **kwargs):
    uid = kwargs.get("dispatch_uid")

    # if uid=="API-CreateUser-View": # else create a profile
    if created == True:
        try :
            Profile.objects.create(user=instance)
        except:
            instance.profile.save()
    else:
        try :
            instance.profile.save()
        except (AttributeError, Profile.DoesNotExist):
            Profile.objects.create(user=instance)
    try :
        if instance.profile:
            instance.profile.save()
    except:
        try:
            Profile.objects.create(user=instance)
        except:
            pass

