from django.db import models
from django.contrib.auth.models import User
from django.contrib.sites.models import Site

from rest_framework.reverse import reverse

# Create your models here.

class Contact(models.Model):
    contact = models.ForeignKey(User, related_name="contact_with", on_delete=models.CASCADE)
    profile = models.ForeignKey("Profile", on_delete=models.CASCADE)
    conversation = models.ForeignKey("chatapp.Conversation", on_delete=models.CASCADE)
    url = models.URLField(null=True)

    def save(self, *args, **kwargs):
        if self.id :
            self.url = f"{Site.objects.get_current()}{self.get_absolute_url()}?format=json"
        super(Contact, self).save(*args, **kwargs)

    def get_absolute_url(self):
        url = reverse("contact-detail", kwargs={"pk": self.profile.user.pk, "contact_id": self.id})
        return url


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    contacts = models.ManyToManyField(User, related_name="contacts", through=Contact, blank=True)
    profile_picture = models.ImageField(upload_to="userapp/users/profile-pictures", default="userapp/users/profile-pictures/default.png", blank=True)
    cover = models.ImageField(upload_to="userapp/users/cover-images", default="userapp/users/cover-images/defualt.png", blank=True)
    bio = models.TextField(max_length=300, null=True, blank=True)
    phone = models.IntegerField(null=True, blank=True)


