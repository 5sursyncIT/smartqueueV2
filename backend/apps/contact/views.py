"""Vues pour la gestion des messages de contact et demandes d'essai."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContactMessage, TrialRequest
from .serializers import ContactMessageSerializer, TrialRequestSerializer


class ContactMessageCreateView(APIView):
    """Endpoint pour créer un nouveau message de contact."""
    
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """Créer un nouveau message de contact."""
        serializer = ContactMessageSerializer(data=request.data)
        
        if serializer.is_valid():
            # Ajouter les informations de requête
            contact_message = serializer.save(
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # TODO: Envoyer une notification email si nécessaire
            
            return Response({
                'success': True,
                'message': 'Votre message a été envoyé avec succès. Nous vous répondrons bientôt.',
                'data': ContactMessageSerializer(contact_message).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'message': 'Erreur de validation du formulaire',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        """Récupérer l'adresse IP du client."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TrialRequestCreateView(APIView):
    """Endpoint pour créer une demande d'essai gratuit."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Créer une nouvelle demande d'essai."""
        serializer = TrialRequestSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            trial_request = serializer.save()

            # TODO: Envoyer notification email à l'équipe commerciale
            # TODO: Envoyer email de confirmation au client

            return Response({
                'success': True,
                'message': 'Votre demande d\'essai a été envoyée avec succès. Notre équipe vous contactera dans les plus brefs délais.',
                'data': TrialRequestSerializer(trial_request).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'message': 'Erreur de validation du formulaire',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)