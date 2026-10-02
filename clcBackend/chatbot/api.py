"""REST API for the flow builder in the CLC Admin Portal (Chatbot flows screen)."""
import json
import logging

from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.models import MemberRole
from conversations.models import BotFlow, BotFlowVersion, BotSession, FlowStatus, FlowTrigger, TriggerType
from core.models import ActorType
from tracking.models import ActivityEvent, UserSession

from . import service, whatsapp
from .catalog import catalog
from .effects import SimulatedEffects
from .runtime import FlowError, Runtime
from .store import TestStore
from .validate import has_errors, validate

log = logging.getLogger('chatbot')
MAX_DEFINITION_NODES = 300


class IsClcAdmin(BasePermission):
    """Signed in, working as CLC Admin, with a portal session that is still open."""
    message = 'Only a CLC Admin can manage chatbot flows.'

    def has_permission(self, request, view):
        claims = request.auth
        if not request.user or not request.user.is_authenticated or claims is None:
            return False
        if claims.get('scope') != 'portal' or claims.get('role') != MemberRole.CLC_ADMIN:
            return False
        return UserSession.objects.filter(id=claims.get('session_id'), membership_id=claims.get('membership_id'),
                                          ended_at__isnull=True).exists()


def admin_api(methods):
    def wrap(fn):
        return api_view(methods)(authentication_classes([JWTAuthentication])(permission_classes([IsClcAdmin])(fn)))
    return wrap


def _log(request, flow_id, action, after=None):
    ActivityEvent.objects.create(
        actor_type=ActorType.STAFF, session_id=request.auth.get('session_id'),
        acting_membership_id=request.auth.get('membership_id'), entity_type='bot_flow', entity_id=flow_id,
        action=action, after_data=after,
    )


def blank_definition():
    return {'nodes': [{'id': 'start', 'type': 'start', 'position': {'x': 0, 'y': 0}, 'data': {}}],
            'edges': [], 'settings': {'languages': ['sw', 'en']}}


def _languages(definition):
    return tuple((definition.get('settings') or {}).get('languages') or ('sw', 'en'))


def _draft(flow, create=True):
    """The flow's editable draft; made from the published version when there is none."""
    draft = flow.versions.filter(status=FlowStatus.DRAFT).first()
    if draft or not create:
        return draft
    published = flow.versions.filter(status=FlowStatus.PUBLISHED).first()
    number = (flow.versions.aggregate(m=Max('version'))['m'] or 0) + 1
    return BotFlowVersion.objects.create(flow=flow, version=number, status=FlowStatus.DRAFT,
                                         definition=published.definition if published else blank_definition())


def _lookup_flow(flow_id):
    flow = BotFlow.objects.filter(id=flow_id).first()
    if flow is None:
        return None
    return {'name': flow.name, 'published': flow.versions.filter(status=FlowStatus.PUBLISHED).exists()}


def _trigger_json(t):
    return {'id': str(t.id), 'type': t.type, 'config': t.config, 'priority': t.priority, 'is_active': t.is_active}


def _flow_json(flow, with_definition=False):
    published = next((v for v in flow.versions.all() if v.status == FlowStatus.PUBLISHED), None)
    draft = next((v for v in flow.versions.all() if v.status == FlowStatus.DRAFT), None)
    data = {
        'id': str(flow.id), 'name': flow.name, 'description': flow.description, 'is_active': flow.is_active,
        'triggers': [_trigger_json(t) for t in flow.triggers.all()],
        'published': {'version': published.version, 'published_at': published.published_at,
                      'nodes': len(published.definition.get('nodes', []))} if published else None,
        'draft': {'version': draft.version, 'updated_at': draft.updated_at,
                  'nodes': len(draft.definition.get('nodes', []))} if draft else None,
        'updated_at': flow.updated_at,
    }
    if with_definition:
        d = _draft(flow)
        data['draft'] = {'version': d.version, 'updated_at': d.updated_at, 'definition': d.definition,
                         'nodes': len(d.definition.get('nodes', []))}
    return data


def _check_definition(definition):
    if not isinstance(definition, dict) or not isinstance(definition.get('nodes'), list) \
            or not isinstance(definition.get('edges'), list):
        return 'definition must be {"nodes": [...], "edges": [...]}'
    if len(definition['nodes']) > MAX_DEFINITION_NODES:
        return f'A flow can have at most {MAX_DEFINITION_NODES} blocks.'
    return None


def _clean_triggers(raw):
    clean = []
    for t in raw or []:
        if t.get('type') not in TriggerType.values:
            raise ValueError(f"Unknown trigger type {t.get('type')!r}")
        config = {}
        if t['type'] == TriggerType.KEYWORD:
            words = [str(w).strip() for w in (t.get('config') or {}).get('words', []) if str(w).strip()]
            if not words:
                raise ValueError('A keyword trigger needs at least one word.')
            config = {'words': words[:50],
                      'match': 'contains' if (t.get('config') or {}).get('match') == 'contains' else 'exact'}
        clean.append({'type': t['type'], 'config': config, 'priority': int(t.get('priority') or 100),
                      'is_active': bool(t.get('is_active', True))})
    return clean


# --- endpoints ---------------------------------------------------------------------

@admin_api(['GET'])
def node_types(request):
    return Response(catalog())


@admin_api(['GET', 'POST'])
def flows(request):
    if request.method == 'GET':
        qs = BotFlow.objects.prefetch_related('versions', 'triggers').order_by('name')
        return Response([_flow_json(f) for f in qs])

    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'detail': 'Give the flow a name.'}, status=400)
    if BotFlow.objects.filter(name__iexact=name).exists():
        return Response({'detail': 'A flow with this name already exists.'}, status=400)
    with transaction.atomic():
        flow = BotFlow.objects.create(name=name, description=request.data.get('description') or '')
        BotFlowVersion.objects.create(flow=flow, version=1, status=FlowStatus.DRAFT, definition=blank_definition())
        _log(request, flow.id, 'flow.created', {'name': name})
    return Response(_flow_json(BotFlow.objects.prefetch_related('versions', 'triggers').get(id=flow.id), True),
                    status=201)


@admin_api(['GET', 'PATCH', 'DELETE'])
def flow_detail(request, flow_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    if request.method == 'GET':
        flow = BotFlow.objects.prefetch_related('versions', 'triggers').get(id=flow.id)
        return Response(_flow_json(flow, with_definition=True))

    if request.method == 'DELETE':
        if flow.versions.exclude(status=FlowStatus.DRAFT).exists() or \
                BotSession.objects.filter(flow_version__flow=flow).exists():
            return Response({'detail': 'This flow has been published. Switch it off instead of deleting it.'},
                            status=409)
        with transaction.atomic():
            _log(request, flow.id, 'flow.deleted', {'name': flow.name})
            flow.triggers.all().delete()
            flow.versions.all().delete()
            flow.delete()
        return Response(status=204)

    changes = {}
    with transaction.atomic():
        for key in ('name', 'description'):
            if key in request.data:
                value = (request.data.get(key) or '').strip()
                if key == 'name' and (not value or BotFlow.objects.filter(name__iexact=value).exclude(id=flow.id).exists()):
                    return Response({'detail': 'Choose a different, non-empty name.'}, status=400)
                setattr(flow, key, value)
                changes[key] = value
        if 'is_active' in request.data:
            flow.is_active = bool(request.data['is_active'])
            changes['is_active'] = flow.is_active
        flow.save()
        if 'triggers' in request.data:
            try:
                clean = _clean_triggers(request.data['triggers'])
            except (ValueError, TypeError) as exc:
                transaction.set_rollback(True)
                return Response({'detail': str(exc)}, status=400)
            flow.triggers.all().delete()
            FlowTrigger.objects.bulk_create([FlowTrigger(flow=flow, **t) for t in clean])
            changes['triggers'] = clean
        _log(request, flow.id, 'flow.updated', changes)
    flow = BotFlow.objects.prefetch_related('versions', 'triggers').get(id=flow.id)
    return Response(_flow_json(flow))


@admin_api(['PUT'])
def save_draft(request, flow_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    definition = request.data.get('definition')
    problem = _check_definition(definition)
    if problem:
        return Response({'detail': problem}, status=400)
    with transaction.atomic():
        draft = _draft(flow)
        draft.definition = definition
        draft.save(update_fields=['definition', 'updated_at'])
    issues = validate(definition, flow_id=flow.id, lookup_flow=_lookup_flow, languages=_languages(definition))
    return Response({'version': draft.version, 'updated_at': draft.updated_at, 'issues': issues})


@admin_api(['POST'])
def validate_flow(request, flow_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    definition = request.data.get('definition') or _draft(flow).definition
    problem = _check_definition(definition)
    if problem:
        return Response({'detail': problem}, status=400)
    return Response({'issues': validate(definition, flow_id=flow.id, lookup_flow=_lookup_flow,
                                        languages=_languages(definition))})


@admin_api(['POST'])
def publish(request, flow_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    with transaction.atomic():
        draft = _draft(flow, create=False)
        if draft is None:
            return Response({'detail': 'Nothing to publish: there are no unpublished changes.'}, status=400)
        issues = validate(draft.definition, flow_id=flow.id, lookup_flow=_lookup_flow,
                          languages=_languages(draft.definition))
        if has_errors(issues):
            return Response({'detail': 'Fix the errors before publishing.', 'issues': issues}, status=400)
        flow.versions.filter(status=FlowStatus.PUBLISHED).update(status=FlowStatus.ARCHIVED)
        draft.status = FlowStatus.PUBLISHED
        draft.published_at = timezone.now()
        draft.published_by_id = request.auth.get('membership_id')
        draft.save()
        _log(request, flow.id, 'flow.published', {'version': draft.version})
    flow = BotFlow.objects.prefetch_related('versions', 'triggers').get(id=flow.id)
    return Response({**_flow_json(flow), 'issues': issues})


@admin_api(['GET'])
def versions(request, flow_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    rows = flow.versions.select_related('published_by__user').order_by('-version')
    return Response([{
        'id': str(v.id), 'version': v.version, 'status': v.status, 'published_at': v.published_at,
        'published_by': v.published_by.user.full_name if v.published_by else None,
        'updated_at': v.updated_at, 'nodes': len(v.definition.get('nodes', [])),
    } for v in rows])


@admin_api(['POST'])
def restore_version(request, flow_id, version_id):
    flow = get_object_or_404(BotFlow, id=flow_id)
    source = get_object_or_404(BotFlowVersion, id=version_id, flow=flow)
    with transaction.atomic():
        draft = _draft(flow)
        draft.definition = source.definition
        draft.save(update_fields=['definition', 'updated_at'])
        _log(request, flow.id, 'flow.version_restored', {'from_version': source.version})
    return Response({'version': draft.version, 'definition': draft.definition})


@admin_api(['POST'])
def simulate(request, flow_id):
    """The builder's test chat. Runs the canvas as it is (saved or not); nothing is saved
    and no WhatsApp message is sent. The client keeps `state` between calls."""
    flow = get_object_or_404(BotFlow, id=flow_id)
    definition = request.data.get('definition') or _draft(flow).definition
    problem = _check_definition(definition)
    if problem:
        return Response({'detail': problem}, status=400)
    effects = SimulatedEffects()
    runtime = Runtime(TestStore(flow.id, definition), effects)
    state, event = request.data.get('state'), request.data.get('event')
    try:
        if state:
            turn = runtime.receive(state, event or {'kind': 'other'})
        else:
            lang = request.data.get('lang') if request.data.get('lang') in ('sw', 'en', 'zh') else 'sw'
            turn = runtime.start(flow.id, {'lang': lang, 'client_name': 'Test Client', 'phone': '+255700000000'})
    except FlowError as exc:
        return Response({'error': str(exc)}, status=200)
    return Response({'messages': turn.messages, 'state': turn.state, 'ended': turn.ended, 'trace': turn.trace,
                     'waiting_node': turn.waiting_node, 'effects': effects.log})


# --- Meta webhook -------------------------------------------------------------------

@csrf_exempt
def webhook(request):
    if request.method == 'GET':  # Meta's one-time check when the webhook URL is registered
        token = settings.WHATSAPP_VERIFY_TOKEN
        if request.GET.get('hub.mode') == 'subscribe' and token and request.GET.get('hub.verify_token') == token:
            return HttpResponse(request.GET.get('hub.challenge', ''))
        return HttpResponse(status=403)
    if request.method != 'POST':
        return HttpResponse(status=405)
    if not whatsapp.valid_signature(request.body, request.headers.get('X-Hub-Signature-256')):
        return HttpResponse(status=401)
    try:
        read = service.handle_payload(json.loads(request.body))
        for message_id in read:
            try:
                whatsapp.mark_read(message_id)
            except Exception:
                log.warning('mark_read failed for %s', message_id)
    except Exception:
        # Answer 200 anyway: a non-200 makes Meta resend the same payload again and again.
        log.exception('WhatsApp webhook failed')
    return HttpResponse('OK')
