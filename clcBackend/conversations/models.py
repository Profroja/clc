import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import ActorType, Channel, Lang


class ConversationStatus(models.TextChoices):
    BOT = 'bot', 'Bot'
    QUEUED = 'queued', 'Queued'
    WITH_STAFF = 'with_staff', 'With staff'
    CLOSED = 'closed', 'Closed'


class MsgDirection(models.TextChoices):
    INBOUND = 'inbound', 'Inbound'
    OUTBOUND = 'outbound', 'Outbound'


class MsgType(models.TextChoices):
    TEXT = 'text', 'Text'
    INTERACTIVE = 'interactive', 'Interactive'
    TEMPLATE = 'template', 'Template'
    IMAGE = 'image', 'Image'
    DOCUMENT = 'document', 'Document'
    AUDIO = 'audio', 'Audio'
    VIDEO = 'video', 'Video'
    LOCATION = 'location', 'Location'
    SYSTEM = 'system', 'System'


class DeliveryStatus(models.TextChoices):
    RECEIVED = 'received', 'Received'
    QUEUED = 'queued', 'Queued'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'


class FlowStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'


class SessionEnd(models.TextChoices):
    COMPLETED = 'completed', 'Completed'
    HANDOFF = 'handoff', 'Handoff'
    TIMEOUT = 'timeout', 'Timeout'
    ABANDONED = 'abandoned', 'Abandoned'


class ApprovalStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SUBMITTED = 'submitted', 'Submitted'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    PAUSED = 'paused', 'Paused'


class MessageTemplate(models.Model):
    """WhatsApp templates approved by Meta (for messages sent 24 h+ after the client's last message)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    language = models.CharField(max_length=2, choices=Lang.choices)
    body = models.TextField()
    variables = models.JSONField(default=list)
    meta_template_id = models.TextField(null=True, blank=True)
    approval_status = models.CharField(max_length=16, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_templates'
        constraints = [
            models.UniqueConstraint(fields=['name', 'language'], name='message_templates_name_lang_uq'),
        ]


class BotFlow(models.Model):
    """A chatbot flow built in the admin's flow builder. What starts it lives in FlowTrigger;
    its nodes and edges live in BotFlowVersion.definition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, default='')
    service = models.ForeignKey('core.Service', null=True, blank=True, on_delete=models.PROTECT)
    is_entry_flow = models.BooleanField(default=False)  # superseded by FlowTrigger(type='new_conversation')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bot_flows'
        constraints = [
            models.UniqueConstraint(fields=['is_entry_flow'], condition=Q(is_entry_flow=True), name='bot_flows_one_entry'),
        ]


class BotFlowVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey(BotFlow, on_delete=models.PROTECT, related_name='versions')
    version = models.IntegerField()
    definition = models.JSONField()  # {"nodes": [...], "edges": [...]} from the flow builder
    status = models.CharField(max_length=16, choices=FlowStatus.choices, default=FlowStatus.DRAFT)
    published_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bot_flow_versions'
        constraints = [
            models.UniqueConstraint(fields=['flow', 'version'], name='bot_flow_versions_flow_version_uq'),
            models.UniqueConstraint(fields=['flow'], condition=Q(status='published'), name='bot_flow_versions_one_live'),
            models.UniqueConstraint(fields=['flow'], condition=Q(status='draft'), name='bot_flow_versions_one_draft'),
        ]


class TriggerType(models.TextChoices):
    NEW_CONVERSATION = 'new_conversation', 'New conversation'
    KEYWORD = 'keyword', 'Keyword or link code'


class FlowTrigger(models.Model):
    """What starts a flow. Checked in priority order when a client writes with no flow running.
    config for 'keyword': {"words": ["wosia", "will"], "match": "exact" | "contains"}"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey(BotFlow, on_delete=models.CASCADE, related_name='triggers')
    type = models.CharField(max_length=24, choices=TriggerType.choices)
    config = models.JSONField(default=dict, blank=True)
    priority = models.IntegerField(default=100)  # lower runs first
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'flow_triggers'
        ordering = ['priority', 'created_at']


class Conversation(models.Model):
    """One open chat per client per channel."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='conversations')
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.WHATSAPP)
    status = models.CharField(max_length=16, choices=ConversationStatus.choices, default=ConversationStatus.BOT)
    taken_over_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # C2 "Take over"
    last_inbound_at = models.DateTimeField(null=True, blank=True)  # opens WhatsApp's 24-hour window
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)
    case = models.ForeignKey('cases.Case', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        db_table = 'conversations'
        constraints = [
            models.UniqueConstraint(
                fields=['client', 'channel'], condition=~Q(status='closed'), name='conversations_one_open',
            ),
        ]


class BotSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.PROTECT, related_name='bot_sessions')
    flow_version = models.ForeignKey(BotFlowVersion, on_delete=models.PROTECT)
    current_step = models.TextField(null=True, blank=True)  # id of the node waiting for the client
    variables = models.JSONField(default=dict)  # answers so far
    stack = models.JSONField(default=list, blank=True)  # flows to return to after "Go to flow"
    started_at = models.DateTimeField(default=timezone.now)
    last_step_at = models.DateTimeField(default=timezone.now)  # idle 24 h -> session restarts
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=16, choices=SessionEnd.choices, null=True, blank=True)

    class Meta:
        db_table = 'bot_sessions'
        constraints = [
            models.UniqueConstraint(fields=['conversation'], condition=Q(ended_at__isnull=True), name='bot_sessions_one_active'),
        ]


class BotSessionStep(models.Model):
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(BotSession, on_delete=models.PROTECT, related_name='steps')
    step_id = models.TextField()
    client_input = models.TextField(null=True, blank=True)
    bot_output = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'bot_session_steps'


class Message(models.Model):
    """Every message in and out. Staff messages record the role they were sent as."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.PROTECT, related_name='messages')
    direction = models.CharField(max_length=8, choices=MsgDirection.choices)
    sender_type = models.CharField(max_length=8, choices=ActorType.choices)
    sent_as_membership = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    template = models.ForeignKey(MessageTemplate, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    type = models.CharField(max_length=16, choices=MsgType.choices, default=MsgType.TEXT)
    body = models.TextField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)  # buttons, button reply id, media
    provider_message_id = models.TextField(null=True, blank=True, unique=True)  # WhatsApp id; stops duplicates
    status = models.CharField(max_length=16, choices=DeliveryStatus.choices)
    error_detail = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'messages'
        indexes = [models.Index(fields=['conversation', 'created_at'], name='messages_by_conversation')]
        constraints = [
            models.CheckConstraint(
                condition=~Q(sender_type='staff') | Q(sent_as_membership__isnull=False),
                name='messages_staff_needs_membership',
            ),
        ]


class MessageStatusEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    message = models.ForeignKey(Message, on_delete=models.PROTECT, related_name='status_events')
    status = models.CharField(max_length=16, choices=DeliveryStatus.choices)
    occurred_at = models.DateTimeField()
    raw = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'message_status_events'
