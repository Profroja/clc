import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import Lang


class Client(models.Model):
    """People and companies who come to CLC through WhatsApp."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.TextField(null=True, blank=True)
    phone_e164 = models.TextField(null=True, blank=True, unique=True)
    wa_id = models.TextField(null=True, blank=True, unique=True)  # WhatsApp user id
    email = models.TextField(null=True, blank=True)
    preferred_language = models.CharField(max_length=2, choices=Lang.choices, default=Lang.SW)
    region = models.TextField(null=True, blank=True)
    privacy_notice_version = models.TextField(null=True, blank=True)  # the notice shown at W1
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        constraints = [
            models.CheckConstraint(
                condition=Q(phone_e164__isnull=False) | Q(wa_id__isnull=False),
                name='clients_phone_or_wa_id',
            ),
        ]

    def __str__(self):
        return self.full_name or self.phone_e164 or self.wa_id
