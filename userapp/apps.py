from django.apps import AppConfig


class UserappConfig(AppConfig):
    name = 'userapp'

    def ready(self) -> None:
        import userapp.signals
        return super().ready()