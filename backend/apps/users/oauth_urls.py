"""URLs pour l'authentification OAuth."""

from django.urls import path

from .oauth_views import (
    oauth_callback,
    oauth_connections,
    oauth_disconnect,
    oauth_get_url,
    oauth_link_account,
)

urlpatterns = [
    path("get-url/", oauth_get_url, name="oauth-get-url"),
    path("callback/", oauth_callback, name="oauth-callback"),
    path("connections/", oauth_connections, name="oauth-connections"),
    path("disconnect/<str:provider>/", oauth_disconnect, name="oauth-disconnect"),
    path("link/", oauth_link_account, name="oauth-link"),
]
