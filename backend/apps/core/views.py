from __future__ import annotations

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthcheckView(APIView):
    authentication_classes: list = []
    permission_classes: list = []

    @extend_schema(
        responses={
            200: inline_serializer(
                name="HealthcheckResponse",
                fields={"status": serializers.CharField()},
            )
        }
    )
    def get(self, request, *args, **kwargs):  # noqa: D401
        """Retourne un statut simple permettant de vérifier que l'API répond."""

        return Response({"status": "ok"})
