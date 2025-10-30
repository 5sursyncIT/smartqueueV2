from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .email_verification_views import (
    CheckEmailVerificationView,
    ResendVerificationEmailView,
    VerifyEmailView,
)
from .jwt_views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CustomTokenVerifyView,
    JWTMeView,
    TokenBlacklistView,
)
from .views import AgentStatusViewSet, AuthViewSet, UserViewSet

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("agent-status", AgentStatusViewSet, basename="agent-status")
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # JWT endpoints
    path("jwt/token/", CustomTokenObtainPairView.as_view(), name="jwt-token"),
    path("jwt/refresh/", CustomTokenRefreshView.as_view(), name="jwt-refresh"),
    path("jwt/verify/", CustomTokenVerifyView.as_view(), name="jwt-verify"),
    path("jwt/blacklist/", TokenBlacklistView.as_view(), name="jwt-blacklist"),
    path("jwt/me/", JWTMeView.as_view(), name="jwt-me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    # Email verification endpoints
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend-verification"),
    path("check-verification/", CheckEmailVerificationView.as_view(), name="check-verification"),
]
