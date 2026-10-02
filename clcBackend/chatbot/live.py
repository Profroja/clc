"""LiveEffects: what the flow's system blocks do for real (cases, handover, client record)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from django.db import connection

from accounts.models import MemberRole, Membership, MembershipStatus, OrgType
from cases.models import Case, CaseStatusHistory, Document
from conversations.models import ConversationStatus
from core.models import ActorType, Channel, Service
from notifications.models import Notification, NotifyChannel
from tracking.models import ActivityEvent

from .effects import Effects

DAR = ZoneInfo('Africa/Dar_es_Salaam')
CLIENT_FIELDS = {'full_name', 'region', 'email', 'preferred_language'}


def next_reference(prefix='CLC'):
    """CLC/2026/0014: yearly counter, safe when two cases are created at once."""
    year = datetime.now(DAR).year
    with connection.cursor() as cur:
        cur.execute(
            """INSERT INTO reference_counters (prefix, year, last_value) VALUES (%s, %s, 1)
               ON CONFLICT (prefix, year) DO UPDATE SET last_value = reference_counters.last_value + 1
               RETURNING last_value""", [prefix, year])
        n = cur.fetchone()[0]
    return f'{prefix}/{year}/{n:04d}'


def notify_clc_admins(subject, body, entity_type, entity_id):
    admins = Membership.objects.filter(role=MemberRole.CLC_ADMIN, status=MembershipStatus.ACTIVE,
                                       organization__type=OrgType.CLC)
    Notification.objects.bulk_create([
        Notification(membership=m, channel=NotifyChannel.IN_APP, subject=subject, body=body,
                     entity_type=entity_type, entity_id=entity_id) for m in admins
    ])


class LiveEffects(Effects):
    def __init__(self, client, conversation):
        self.client = client
        self.conversation = conversation

    def set_client(self, field, value):
        if field in CLIENT_FIELDS:
            setattr(self.client, field, value)
            self.client.save(update_fields=[field, 'updated_at'])

    def create_case(self, *, service_code, summary, region, answers, files):
        service = Service.objects.filter(code=service_code).first() if service_code else None
        case = Case.objects.create(
            reference=next_reference('CLC'), client=self.client, conversation=self.conversation,
            service=service, channel=Channel.WHATSAPP, language=self.client.preferred_language,
            region=region, summary=summary, answers=answers,
        )
        CaseStatusHistory.objects.create(case=case, to_status=case.status, note='Created by the WhatsApp bot')
        for f in files:
            Document.objects.create(
                case=case, message_id=f.get('message_id'), file_name=f['file_name'], mime_type=f['mime_type'],
                size_bytes=f['size_bytes'], storage_key=f['storage_key'], sha256=f['sha256'],
            )
        self.conversation.case = case
        self.conversation.save(update_fields=['case'])
        ActivityEvent.objects.create(actor_type=ActorType.BOT, entity_type='case', entity_id=case.id,
                                     action='case.created',
                                     after_data={'reference': case.reference, 'service': service_code,
                                                 'documents': len(files)})
        notify_clc_admins('New case', f'{case.reference} received on WhatsApp', 'case', case.id)
        return case.reference

    def case_status(self):
        cases = (Case.objects.filter(client=self.client).select_related('current_firm')
                 .order_by('-created_at')[:3])
        return [{'reference': c.reference, 'status': c.status,
                 'firm': c.current_firm.name if c.current_firm else None} for c in cases]

    def handover(self):
        self.conversation.status = ConversationStatus.QUEUED
        self.conversation.save(update_fields=['status'])
        ActivityEvent.objects.create(actor_type=ActorType.BOT, entity_type='conversation',
                                     entity_id=self.conversation.id, action='conversation.handover')
        notify_clc_admins('Client waiting for CLC', self.client.full_name or self.client.phone_e164 or '',
                          'conversation', self.conversation.id)
