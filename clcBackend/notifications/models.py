import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone


class NotifyChannel(models.TextChoices):
    WHATSAPP = 'whatsapp', 'WhatsApp'
    EMAIL = 'email', 'Email'
    IN_APP = 'in_app', 'In-app'


class NotifyStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'


class Notification(models.Model):
    """Alerts go to a role (membership), so the bell shows only the role in use."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey('clients.Client', null=True, blank=True, on_delete=models.PROTECT, related_name='notifications')
    membership = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.PROTECT, related_name='notifications')
    channel = models.CharField(max_length=16, choices=NotifyChannel.choices)
    template = models.ForeignKey('conversations.MessageTemplate', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    subject = models.TextField(null=True, blank=True)
    body = models.TextField(null=True, blank=True)
    entity_type = models.TextField(null=True, blank=True)  # 'case', 'referral', 'organization'
    entity_id = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=NotifyStatus.choices, default=NotifyStatus.PENDING)
    scheduled_for = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    attempts = models.SmallIntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['scheduled_for'], condition=Q(status='pending'), name='notifications_due'),
            models.Index(fields=['membership', 'created_at'], condition=Q(channel='in_app'), name='notifications_bell'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(client__isnull=False) | Q(membership__isnull=False),
                name='notifications_has_recipient',
            ),
        ]
