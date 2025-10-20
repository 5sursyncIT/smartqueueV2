from __future__ import annotations

from rest_framework import serializers

from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer
from apps.queues.models import Service
from apps.queues.serializers import QueueSerializer
from apps.users.serializers import AgentProfileSerializer

from .models import Appointment, Ticket


class TicketSerializer(serializers.ModelSerializer):
    queue_id = serializers.UUIDField(write_only=True)
    queue = QueueSerializer(read_only=True)
    agent = AgentProfileSerializer(read_only=True)
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.UUIDField(write_only=True, required=False)
    wait_time_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "tenant",
            "queue",
            "queue_id",
            "number",
            "channel",
            "priority",
            "status",
            "eta_seconds",
            "wait_time_seconds",
            "agent",
            "customer",
            "customer_id",
            "customer_name",
            "customer_phone",
            "called_at",
            "started_at",
            "ended_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tenant",
            "queue",
            "number",  # Le numéro est généré automatiquement
            "status",  # Le statut initial est défini automatiquement
            "eta_seconds",
            "wait_time_seconds",
            "agent",  # L'agent est assigné plus tard
            "called_at",
            "started_at",
            "ended_at",
            "created_at",
            "updated_at",
            "customer",
        )

    def get_wait_time_seconds(self, obj):
        """Calcule le temps d'attente en secondes (de created_at à called_at)."""
        if obj.called_at and obj.created_at:
            delta = obj.called_at - obj.created_at
            return int(delta.total_seconds())
        return None

    def create(self, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        queue_id = validated_data.pop("queue_id")
        customer_id = validated_data.pop("customer_id", None)

        if customer_id:
            customer = self._get_customer(tenant, customer_id)
            validated_data["customer_id"] = customer.id
            validated_data.setdefault("customer_name", customer.full_name)
            validated_data.setdefault("customer_phone", customer.phone)

        validated_data["queue_id"] = queue_id
        validated_data.setdefault("number", self._generate_ticket_number(queue_id))
        validated_data["tenant"] = tenant
        return super().create(validated_data)

    def update(self, instance, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        if "queue_id" in validated_data:
            queue_id = validated_data.pop("queue_id")
            validated_data["queue_id"] = queue_id
        if "customer_id" in validated_data:
            customer_id = validated_data.pop("customer_id")
            if customer_id:
                customer = self._get_customer(tenant, customer_id)
                validated_data["customer_id"] = customer.id
                validated_data.setdefault("customer_name", customer.full_name)
                validated_data.setdefault("customer_phone", customer.phone)
            else:
                validated_data["customer_id"] = None
        return super().update(instance, validated_data)

    def _get_customer(self, tenant, customer_id):
        try:
            return Customer.objects.get(id=customer_id, tenant=tenant)
        except Customer.DoesNotExist as exc:  # pragma: no cover - validation
            raise serializers.ValidationError({"customer_id": "Client introuvable pour ce tenant."}) from exc

    def _generate_ticket_number(self, queue_id):
        prefix = str(queue_id).split("-")[0].upper()
        count = Ticket.objects.filter(queue_id=queue_id).count() + 1
        return f"{prefix}-{count:04d}"


class AppointmentSerializer(serializers.ModelSerializer):
    service_id = serializers.UUIDField(write_only=True)
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "tenant",
            "service",
            "service_id",
            "queue",
            "customer",
            "customer_id",
            "starts_at",
            "ends_at",
            "customer_name",
            "customer_email",
            "customer_phone",
            "status",
            "metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tenant", "service", "queue", "customer", "created_at", "updated_at")

    def create(self, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        service_id = validated_data.pop("service_id")
        if not Service.objects.filter(id=service_id, tenant=tenant).exists():
            raise serializers.ValidationError({"service_id": "Service introuvable pour ce tenant."})
        customer_id = validated_data.pop("customer_id", None)
        if customer_id:
            customer = self._get_customer(tenant, customer_id)
            validated_data["customer_id"] = customer.id
            validated_data.setdefault("customer_name", customer.full_name)
            validated_data.setdefault("customer_email", customer.email)
            validated_data.setdefault("customer_phone", customer.phone)
        validated_data["service_id"] = service_id
        validated_data["tenant"] = tenant
        return super().create(validated_data)

    def update(self, instance, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        if "service_id" in validated_data:
            service_id = validated_data.pop("service_id")
            if service_id and not Service.objects.filter(id=service_id, tenant=tenant).exists():
                raise serializers.ValidationError({"service_id": "Service introuvable pour ce tenant."})
            validated_data["service_id"] = service_id
        if "customer_id" in validated_data:
            customer_id = validated_data.pop("customer_id")
            if customer_id:
                customer = self._get_customer(tenant, customer_id)
                validated_data["customer_id"] = customer.id
                validated_data.setdefault("customer_name", customer.full_name)
                validated_data.setdefault("customer_email", customer.email)
                validated_data.setdefault("customer_phone", customer.phone)
            else:
                validated_data["customer_id"] = None
        return super().update(instance, validated_data)

    def _get_customer(self, tenant, customer_id):
        try:
            return Customer.objects.get(id=customer_id, tenant=tenant)
        except Customer.DoesNotExist as exc:  # pragma: no cover - validation
            raise serializers.ValidationError({"customer_id": "Client introuvable pour ce tenant."}) from exc
