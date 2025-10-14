from __future__ import annotations

import django_filters

from .models import Queue


class QueueFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    status = django_filters.CharFilter(field_name="status")
    site = django_filters.UUIDFilter(field_name="site_id")

    class Meta:
        model = Queue
        fields = ("name", "status", "algorithm", "site")
