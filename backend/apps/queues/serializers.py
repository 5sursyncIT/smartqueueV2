from __future__ import annotations

from django.utils.text import slugify
from rest_framework import serializers

from .models import Queue, QueueAssignment, Service, Site


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = (
            "id",
            "name",
            "slug",
            "address",
            "city",
            "country",
            "timezone",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ServiceSerializer(serializers.ModelSerializer):
    site = SiteSerializer(read_only=True)
    site_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Service
        fields = (
            "id",
            "name",
            "site",
            "site_id",
            "sla_seconds",
            "priority_rules",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "site", "created_at", "updated_at")

    def create(self, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        site_id = validated_data.pop("site_id", None)
        if site_id:
            if not Site.objects.filter(id=site_id, tenant=tenant).exists():
                raise serializers.ValidationError({"site_id": "Site introuvable pour ce tenant."})
            validated_data["site_id"] = site_id
        validated_data["tenant"] = tenant
        return super().create(validated_data)

    def update(self, instance, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        if "site_id" in validated_data:
            site_id = validated_data.pop("site_id")
            if site_id and not Site.objects.filter(id=site_id, tenant=tenant).exists():
                raise serializers.ValidationError({"site_id": "Site introuvable pour ce tenant."})
            validated_data["site_id"] = site_id
        return super().update(instance, validated_data)


class QueueSerializer(serializers.ModelSerializer):
    site = SiteSerializer(read_only=True)
    site_id = serializers.UUIDField(write_only=True, required=False)
    service = ServiceSerializer(read_only=True)
    service_id = serializers.UUIDField(write_only=True)
    waiting_count = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(required=False)  # Auto-généré si non fourni

    class Meta:
        model = Queue
        fields = (
            "id",
            "tenant",
            "name",
            "slug",
            "site",
            "site_id",
            "service",
            "service_id",
            "algorithm",
            "status",
            "max_capacity",
            "waiting_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tenant", "site", "service", "waiting_count", "created_at", "updated_at")

    def create(self, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant

        # Auto-générer le slug si non fourni
        if "slug" not in validated_data or not validated_data["slug"]:
            base_slug = slugify(validated_data["name"])
            slug = base_slug
            counter = 1
            # Assurer l'unicité du slug pour ce tenant
            while Queue.objects.filter(tenant=tenant, slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data["slug"] = slug

        site_id = validated_data.pop("site_id", None)
        if site_id:
            if not Site.objects.filter(id=site_id, tenant=tenant).exists():
                raise serializers.ValidationError({"site_id": "Site introuvable pour ce tenant."})
            validated_data["site_id"] = site_id
        service_id = validated_data.pop("service_id")
        if not Service.objects.filter(id=service_id, tenant=tenant).exists():
            raise serializers.ValidationError({"service_id": "Service introuvable pour ce tenant."})
        validated_data["service_id"] = service_id
        validated_data["tenant"] = tenant
        return super().create(validated_data)

    def update(self, instance, validated_data):  # type: ignore[override]
        request = self.context["request"]
        tenant = request.tenant
        if "site_id" in validated_data:
            site_id = validated_data.pop("site_id")
            if site_id and not Site.objects.filter(id=site_id, tenant=tenant).exists():
                raise serializers.ValidationError({"site_id": "Site introuvable pour ce tenant."})
            validated_data["site_id"] = site_id
        if "service_id" in validated_data:
            service_id = validated_data.pop("service_id")
            if service_id and not Service.objects.filter(id=service_id, tenant=tenant).exists():
                raise serializers.ValidationError({"service_id": "Service introuvable pour ce tenant."})
            validated_data["service_id"] = service_id
        return super().update(instance, validated_data)


class QueueAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueueAssignment
        fields = ("id", "queue", "agent", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
