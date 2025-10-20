"""Serializers for Display management."""
from rest_framework import serializers
from apps.displays.models import Display
from apps.queues.serializers import QueueSerializer


class DisplaySerializer(serializers.ModelSerializer):
    """Serializer for Display model."""

    queue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="List of queue IDs to associate with this display"
    )
    queues = QueueSerializer(many=True, read_only=True)

    class Meta:
        model = Display
        fields = [
            'id', 'name', 'display_type', 'layout', 'is_active',
            'site', 'device_id', 'theme', 'auto_refresh_seconds', 'last_ping',
            'created_at', 'updated_at', 'queues', 'queue_ids',
            # Nouveaux champs de personnalisation
            'show_video', 'video_url', 'background_image',
            'custom_message', 'secondary_message', 'message_position',
            'ticket_colors'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_ping', 'device_id']

    def create(self, validated_data):
        """Create display with queue associations and auto-generate device_id."""
        queue_ids = validated_data.pop('queue_ids', [])

        # Auto-generate device_id if not provided
        if 'device_id' not in validated_data:
            import uuid
            validated_data['device_id'] = f"display-{uuid.uuid4().hex[:12]}"

        display = Display.objects.create(**validated_data)

        if queue_ids:
            display.queues.set(queue_ids)

        return display

    def update(self, instance, validated_data):
        """Update display with queue associations."""
        queue_ids = validated_data.pop('queue_ids', None)

        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update queue associations if provided
        if queue_ids is not None:
            instance.queues.set(queue_ids)

        return instance


class DisplayListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for display lists."""

    queue_count = serializers.SerializerMethodField()
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = Display
        fields = [
            'id', 'name', 'display_type', 'layout', 'is_active',
            'site', 'site_name', 'queue_count', 'last_ping', 'created_at'
        ]

    def get_queue_count(self, obj):
        """Get number of queues associated with this display."""
        return obj.queues.count()
