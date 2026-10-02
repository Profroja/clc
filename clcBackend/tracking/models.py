import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import ActorType


class SessionEndReason(models.TextChoices):
    SIGN_OUT = 'sign_out', 'Sign out'
    SWITCHED_ROLE = 'switched_role', 'Switched role'
    EXPIRED = 'expired', 'Expired'
    SUSPENDED = 'suspended', 'Suspended'


class UserSession(models.Model):
    """One portal session = one "Working as" choice."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='portal_sessions')
    membership = models.ForeignKey('accounts.Membership', on_delete=models.PROTECT, related_name='sessions')
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=16, choices=SessionEndReason.choices, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [models.Index(fields=['user', 'started_at'], name='user_sessions_by_user')]


class ActivityEvent(models.Model):
    """Every action, logged under the role it was done as. Never changed or deleted
    (enforced by a database trigger)."""
    id = models.BigAutoField(primary_key=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    actor_type = models.CharField(max_length=8, choices=ActorType.choices)
    session = models.ForeignKey(UserSession, null=True, blank=True, on_delete=models.PROTECT, related_name='+')
    acting_membership = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.PROTECT, related_name='+')  # "Working as"
    actor_client = models.ForeignKey('clients.Client', null=True, blank=True, on_delete=models.PROTECT, related_name='+')
    entity_type = models.TextField()  # 'case', 'referral', 'document', 'organization'
    entity_id = models.UUIDField()
    action = models.TextField()  # 'referral.accepted', 'document.downloaded', 'role.switched'
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'activity_events'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id', 'occurred_at'], name='activity_events_timeline'),
            models.Index(fields=['acting_membership', 'occurred_at'], name='activity_events_by_member'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(actor_type='staff') | (Q(acting_membership__isnull=False) & Q(session__isnull=False)),
                name='activity_staff_needs_role_and_session',
            ),
            models.CheckConstraint(
                condition=~Q(actor_type='client') | Q(actor_client__isnull=False),
                name='activity_client_needs_client',
            ),
        ]
