"""Views pour la vérification d'email."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .email_verification import resend_verification_email, verify_email
from .models import User


class VerifyEmailView(APIView):
    """Vérifie l'email d'un utilisateur avec un token."""

    permission_classes = [AllowAny]

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'code': {'type': 'string', 'pattern': '^[0-9]{6}$', 'description': 'Code à 6 chiffres'},
                },
                'required': ['email', 'code'],
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'},
                },
            }
        },
    )
    def post(self, request):
        """Vérifie l'email avec le code à 6 chiffres fourni."""
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response(
                {'success': False, 'message': 'Email et code requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider le format du code (6 chiffres)
        if not code.isdigit() or len(code) != 6:
            return Response(
                {'success': False, 'message': 'Le code doit contenir exactement 6 chiffres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        success, message = verify_email(email, code)

        return Response(
            {'success': success, 'message': message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        )


class ResendVerificationEmailView(APIView):
    """Renvoie un email de vérification."""

    permission_classes = [AllowAny]

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'base_url': {'type': 'string'},
                },
                'required': ['email'],
            }
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'},
                },
            }
        },
    )
    def post(self, request):
        """Renvoie un email de vérification."""
        email = request.data.get('email')
        base_url = request.data.get('base_url')

        if not email:
            return Response(
                {'success': False, 'message': 'Email requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        success, message = resend_verification_email(email, base_url)

        return Response(
            {'success': success, 'message': message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        )


class CheckEmailVerificationView(APIView):
    """Vérifie si un email est déjà vérifié."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            {
                'name': 'email',
                'in': 'query',
                'required': True,
                'schema': {'type': 'string', 'format': 'email'},
            }
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'email_verified': {'type': 'boolean'},
                    'email_verified_at': {'type': 'string', 'format': 'date-time', 'nullable': True},
                },
            }
        },
    )
    def get(self, request):
        """Vérifie si un email est vérifié."""
        email = request.query_params.get('email')

        if not email:
            return Response(
                {'error': 'Email requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            return Response({
                'email_verified': user.email_verified,
                'email_verified_at': user.email_verified_at.isoformat() if user.email_verified_at else None,
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'Utilisateur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
