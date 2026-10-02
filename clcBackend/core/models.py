import uuid

from django.db import models


class Lang(models.TextChoices):
    SW = 'sw', 'Swahili'
    EN = 'en', 'English'
    ZH = 'zh', 'Chinese'


class Channel(models.TextChoices):
    WHATSAPP = 'whatsapp', 'WhatsApp'
    WEB = 'web', 'Web'
    EMAIL = 'email', 'Email'
    PHONE = 'phone', 'Phone'
    WALK_IN = 'walk_in', 'Walk-in'


class ActorType(models.TextChoices):
    CLIENT = 'client', 'Client'
    BOT = 'bot', 'Bot'
    STAFF = 'staff', 'Staff'
    SYSTEM = 'system', 'System'


class Priority(models.TextChoices):
    LOW = 'low', 'Low'
    NORMAL = 'normal', 'Normal'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class Service(models.Model):
    """Service in the bot menu and on firm profiles."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.TextField(unique=True)  # 'tsa_miner', 'gold_investor', 'deed_poll', 'will', 'general'
    name_sw = models.TextField()
    name_en = models.TextField()
    name_zh = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)  # shown in the bot menu
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'services'
        ordering = ['sort_order', 'code']

    def __str__(self):
        return self.name_en


class OfficeHours(models.Model):
    weekday = models.SmallIntegerField(primary_key=True)  # 0 = Sunday
    opens_at = models.TimeField()
    closes_at = models.TimeField()

    class Meta:
        db_table = 'office_hours'
        verbose_name_plural = 'office hours'
        constraints = [
            models.CheckConstraint(condition=models.Q(weekday__gte=0, weekday__lte=6), name='office_hours_weekday_range'),
            models.CheckConstraint(condition=models.Q(closes_at__gt=models.F('opens_at')), name='office_hours_closes_after_opens'),
        ]


class PublicHoliday(models.Model):
    holiday_date = models.DateField(primary_key=True)
    name = models.TextField()

    class Meta:
        db_table = 'public_holidays'


class ReferenceCounter(models.Model):
    """Yearly counters behind matter references: CLC/2026/0014."""
    prefix = models.TextField()
    year = models.SmallIntegerField()
    last_value = models.IntegerField(default=0)

    class Meta:
        db_table = 'reference_counters'
        constraints = [
            models.UniqueConstraint(fields=['prefix', 'year'], name='reference_counters_pk'),
        ]
