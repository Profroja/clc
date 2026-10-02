"""Handling what Meta sends to the webhook: client messages (run the bot) and delivery reports."""
import logging
import re
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from cases.models import CaseStatus, Document
from clients.models import Client
from conversations.models import (BotFlow, BotSession, BotSessionStep, Conversation, ConversationStatus,
                                  DeliveryStatus, FlowStatus, FlowTrigger, Message, MessageStatusEvent,
                                  MsgDirection, SessionEnd, TriggerType)
from core.models import ActorType, Channel

from . import whatsapp
from .live import LiveEffects
from .runtime import FlowError, Runtime
from .store import PublishedStore

log = logging.getLogger('chatbot')
SESSION_IDLE = timedelta(hours=24)
RESTART_WORDS = {'menu', 'menyu', '菜单', '#'}  # always start over from the New-conversation flow
STATUS_RANK = {'queued': 0, 'sent': 1, 'delivered': 2, 'read': 3}


def _norm(s):
    return ' '.join((s or '').lower().split())


# --- triggers -------------------------------------------------------------------

def _live_triggers():
    return (FlowTrigger.objects.filter(is_active=True, flow__is_active=True,
                                       flow__versions__status=FlowStatus.PUBLISHED)
            .select_related('flow').order_by('priority', 'created_at').distinct())


def keyword_matches(trigger, typed):
    words = [_norm(w) for w in (trigger.config or {}).get('words', []) if _norm(w)]
    if (trigger.config or {}).get('match') == 'contains':
        return any(re.search(rf'(?<!\w){re.escape(w)}(?!\w)', typed) for w in words)
    return typed in words


def match_flow(text, restart=False):
    """Which flow a message starts when no flow is running: keywords first (by priority),
    then the New-conversation flow."""
    triggers = list(_live_triggers())
    typed = _norm(text)
    if typed and not restart:
        for t in triggers:
            if t.type == TriggerType.KEYWORD and keyword_matches(t, typed):
                return t.flow
    return next((t.flow for t in triggers if t.type == TriggerType.NEW_CONVERSATION), None)


# --- outbox ---------------------------------------------------------------------

def queue_outbound(conversation, to, engine_message):
    payload = whatsapp.render(engine_message)
    msg = Message.objects.create(
        conversation=conversation, direction=MsgDirection.OUTBOUND, sender_type=ActorType.BOT,
        type=payload['type'], body=engine_message.get('text'), payload={'meta': payload},
        status=DeliveryStatus.QUEUED,
    )
    # Sent only after the database commits: nothing goes out for work that rolled back.
    transaction.on_commit(lambda: _send(msg.id, to, payload))
    return msg


def _send(message_id, to, payload):
    try:
        wamid = whatsapp.send(to, payload)
        Message.objects.filter(id=message_id).update(provider_message_id=wamid, status=DeliveryStatus.SENT)
    except Exception as exc:  # network or Meta error: keep a record, don't break the webhook
        log.exception('WhatsApp send failed')
        Message.objects.filter(id=message_id).update(status=DeliveryStatus.FAILED, error_detail=str(exc)[:500])


# --- inbound ----------------------------------------------------------------------

def handle_payload(payload):
    """Everything in one webhook call. Returns ids of client messages to mark as read."""
    read = []
    for entry in payload.get('entry', []):
        for change in entry.get('changes', []):
            if change.get('field') != 'messages':
                continue
            value = change.get('value', {})
            for st in value.get('statuses', []):
                handle_status(st)
            names = {c['wa_id']: c.get('profile', {}).get('name') for c in value.get('contacts', [])}
            for m in value.get('messages', []):
                handle_message(m, names.get(m['from']))
                read.append(m['id'])
    return read


def handle_message(m, profile_name=None):
    wa_id = m['from']
    event, db_type, body = whatsapp.parse(m)
    if event['kind'] == 'file':
        try:
            event['file'] = whatsapp.download_media(event['media_id'], event.get('filename'))
        except Exception:
            log.exception('Could not download media %s', event['media_id'])
            event['file'] = None

    with transaction.atomic():
        # One client's messages are handled one at a time, in order.
        with connection.cursor() as cur:
            cur.execute('SELECT pg_advisory_xact_lock(hashtext(%s))', [wa_id])
        client = _client(wa_id, profile_name)
        conv = (Conversation.objects.select_for_update()
                .filter(client=client, channel=Channel.WHATSAPP).exclude(status=ConversationStatus.CLOSED)
                .order_by('-opened_at').first()) or Conversation.objects.create(client=client)

        sent_at = datetime.fromtimestamp(int(m.get('timestamp') or 0), tz=dt_timezone.utc) if m.get('timestamp') else timezone.now()
        inbound, created = Message.objects.get_or_create(provider_message_id=m['id'], defaults={
            'conversation': conv, 'direction': MsgDirection.INBOUND, 'sender_type': ActorType.CLIENT,
            'type': db_type, 'body': body, 'payload': m, 'status': DeliveryStatus.RECEIVED, 'created_at': sent_at,
        })
        if not created:
            return  # Meta delivered this message twice: already handled
        conv.last_inbound_at = timezone.now()
        conv.save(update_fields=['last_inbound_at'])
        if event.get('file'):
            event['file']['message_id'] = str(inbound.id)

        if conv.status != ConversationStatus.BOT:
            # With CLC or a firm: no bot reply. Files still land on the case.
            if event.get('file') and conv.case_id:
                f = event['file']
                Document.objects.create(case_id=conv.case_id, message=inbound, file_name=f['file_name'],
                                        mime_type=f['mime_type'], size_bytes=f['size_bytes'],
                                        storage_key=f['storage_key'], sha256=f['sha256'])
            return
        for reply in run_bot(client, conv, event):
            queue_outbound(conv, wa_id, reply)


def _client(wa_id, profile_name):
    client = Client.objects.select_for_update().filter(Q(wa_id=wa_id) | Q(phone_e164=f'+{wa_id}')).first()
    if client is None:
        return Client.objects.create(wa_id=wa_id, phone_e164=f'+{wa_id}', full_name=profile_name)
    if not client.wa_id:
        client.wa_id = wa_id
        client.save(update_fields=['wa_id', 'updated_at'])
    return client


def run_bot(client, conv, event):
    """Feed one client message to the engine; returns the engine's replies."""
    session = (BotSession.objects.select_for_update().select_related('flow_version')
               .filter(conversation=conv, ended_at__isnull=True).first())
    restart = event['kind'] == 'text' and _norm(event.get('text')) in RESTART_WORDS
    if session and (restart or timezone.now() - session.last_step_at > SESSION_IDLE):
        _end(session, SessionEnd.ABANDONED if restart else SessionEnd.TIMEOUT)
        session = None

    runtime = Runtime(PublishedStore(), LiveEffects(client, conv))
    input_label = event.get('choice_id') or event.get('text') or event['kind']
    try:
        if session:
            state = {'flow': str(session.flow_version.flow_id), 'version': str(session.flow_version_id),
                     'node': session.current_step, 'vars': session.variables, 'stack': session.stack}
            turn = runtime.receive(state, event)
        else:
            # A client with an open case goes to whoever holds it, unless they ask for the menu.
            open_case = client.cases.exclude(status=CaseStatus.CLOSED).order_by('-created_at').first()
            if open_case and not restart:
                conv.case = open_case
                conv.status = ConversationStatus.WITH_STAFF if open_case.current_firm_id else ConversationStatus.QUEUED
                conv.save(update_fields=['case', 'status'])
                return []
            flow = match_flow(event.get('text'), restart)
            if flow is None:
                return []
            turn = runtime.start(flow.id, {'lang': client.preferred_language, 'client_name': client.full_name or '',
                                           'phone': client.phone_e164 or ''})
            started_version = PublishedStore().current(flow.id)[0]
            session = BotSession.objects.create(conversation=conv, flow_version_id=started_version)
    except FlowError:
        log.exception('Flow failed for conversation %s', conv.id)
        if session and session.pk:
            _end(session, SessionEnd.ABANDONED)
        return []

    BotSessionStep.objects.create(session=session, step_id=session.current_step or 'start',
                                  client_input=str(input_label)[:500],
                                  bot_output={'trace': turn.trace, 'messages': len(turn.messages)})
    if turn.state:
        session.flow_version_id = turn.state['version']
        session.current_step = turn.state['node']
        session.variables = turn.state['vars']
        session.stack = turn.state['stack']
        session.last_step_at = timezone.now()
        session.save()
    else:
        _end(session, turn.ended)
    return turn.messages


def _end(session, reason):
    session.ended_at = timezone.now()
    session.end_reason = reason
    session.save(update_fields=['ended_at', 'end_reason'])


# --- delivery reports ----------------------------------------------------------

def handle_status(st):
    new = st.get('status')
    if new not in ('sent', 'delivered', 'read', 'failed'):
        return
    msg = Message.objects.filter(provider_message_id=st.get('id')).first()
    if msg is None:
        return
    at = datetime.fromtimestamp(int(st.get('timestamp') or 0), tz=dt_timezone.utc)
    MessageStatusEvent.objects.create(message=msg, status=new, occurred_at=at, raw=st)
    if new == 'failed':
        msg.status = DeliveryStatus.FAILED
        msg.error_detail = '; '.join(e.get('title', '') for e in st.get('errors', [])) or 'failed'
    elif STATUS_RANK[new] > STATUS_RANK.get(msg.status, 0):  # never move backwards
        msg.status = new
        if new in ('delivered', 'read') and not msg.delivered_at:
            msg.delivered_at = at
        if new == 'read':
            msg.read_at = at
    msg.save()


def flow_is_live(flow: BotFlow):
    return flow.is_active and flow.versions.filter(status=FlowStatus.PUBLISHED).exists()
