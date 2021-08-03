"""
ASGI config for websocket project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/asgi/
"""

import os
import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.conf import settings
import chatApi.routing

django.setup()

if not settings.configured:
    settings.configure()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ChatProject.settings')


application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "https": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chatApi.routing.websocket_urlpatterns
        )
    ),
})


# application = get_asgi_application()