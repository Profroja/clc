"""Meta WhatsApp Cloud API: signature check, sending, media download, and turning the
engine's abstract messages into WhatsApp messages."""
import hashlib
import hmac
import logging
import uuid
from datetime import timedelta

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone

log = logging.getLogger('chatbot')


class MetaError(Exception):
    pass


def valid_signature(body: bytes, header: str) -> bool:
    """Meta signs every webhook call with the app secret (X-Hub-Signature-256)."""
    secret = settings.META_APP_SECRET
    if not secret:
        return False
    expected = 'sha256=' + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(header or '', expected)


def _graph(path, method='POST', body=None):
    res = requests.request(
        method, f'{settings.GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/{path}', json=body, timeout=15,
        headers={'Authorization': f'Bearer {settings.WHATSAPP_TOKEN}'},
    )
    try:
        data = res.json()
    except ValueError:
        data = {}
    if not res.ok:
        raise MetaError(f"Meta API {res.status_code}: {data.get('error', {}).get('message', 'unknown error')}")
    return data


def send(to, payload):
    data = _graph(f'{settings.WHATSAPP_PHONE_NUMBER_ID}/messages',
                  body={'messaging_product': 'whatsapp', 'recipient_type': 'individual', 'to': to, **payload})
    return data['messages'][0]['id']


def mark_read(message_id):
    _graph(f'{settings.WHATSAPP_PHONE_NUMBER_ID}/messages',
           body={'messaging_product': 'whatsapp', 'status': 'read', 'message_id': message_id})


MEDIA_TTL = timedelta(days=25)  # Meta keeps uploaded media for 30 days


def media_id(asset):
    """Meta's id for one of our files (MediaAsset), uploading it when there is no fresh one."""
    if asset.meta_media_id and asset.meta_uploaded_at and timezone.now() - asset.meta_uploaded_at < MEDIA_TTL:
        return asset.meta_media_id
    with default_storage.open(asset.storage_key, 'rb') as fh:
        res = requests.post(
            f'{settings.GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/media',
            headers={'Authorization': f'Bearer {settings.WHATSAPP_TOKEN}'}, timeout=60,
            data={'messaging_product': 'whatsapp', 'type': asset.mime_type},
            files={'file': (asset.file_name, fh, asset.mime_type)})
    data = res.json() if res.content else {}
    if not res.ok:
        raise MetaError(f"Meta media upload {res.status_code}: {data.get('error', {}).get('message', 'unknown error')}")
    asset.meta_media_id, asset.meta_uploaded_at = data['id'], timezone.now()
    asset.save(update_fields=['meta_media_id', 'meta_uploaded_at'])
    return asset.meta_media_id


EXT = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
       'application/msword': 'doc',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'}


def download_media(media_id, filename=None):
    """Meta's media links expire within minutes, so files are saved as soon as they arrive."""
    info = _graph(media_id, method='GET')
    res = requests.get(info['url'], timeout=30, headers={'Authorization': f'Bearer {settings.WHATSAPP_TOKEN}'})
    res.raise_for_status()
    data, mime = res.content, info.get('mime_type') or 'application/octet-stream'
    now = timezone.now()
    ext = EXT.get(mime) or (filename.rsplit('.', 1)[-1] if filename and '.' in filename else 'bin')
    key = default_storage.save(f'whatsapp/{now:%Y/%m}/{uuid.uuid4()}.{ext}', ContentFile(data))
    return {'storage_key': key, 'sha256': hashlib.sha256(data).hexdigest(), 'size_bytes': len(data),
            'mime_type': mime, 'file_name': filename or f'whatsapp-{now:%Y-%m-%d}.{ext}'}


# --- engine message -> WhatsApp message ------------------------------------

def _cut(s, n):
    s = s or ''
    return s if len(s) <= n else s[: n - 1] + '…'


def render(msg):
    """The validator keeps flows inside WhatsApp's limits; _cut is only a safety net.
    A media message carries our asset id; service._send swaps it for Meta's media id."""
    if msg['type'] == 'media':
        kind = msg['media_kind']
        body = {'asset_id': msg['asset_id']}
        if msg.get('caption'):
            body['caption'] = _cut(msg['caption'], 1024)
        if kind == 'document':
            body['filename'] = msg['file_name']
        return {'type': kind, kind: body}
    if msg['type'] == 'buttons':
        return {'type': 'interactive', 'interactive': {
            'type': 'button', 'body': {'text': _cut(msg['text'], 1024)},
            'action': {'buttons': [{'type': 'reply', 'reply': {'id': b['id'], 'title': _cut(b['title'], 20)}}
                                   for b in msg['buttons'][:3]]}}}
    if msg['type'] == 'list':
        rows = []
        for r in msg['rows'][:10]:
            row = {'id': r['id'], 'title': _cut(r['title'], 24)}
            if r.get('description'):
                row['description'] = _cut(r['description'], 72)
            rows.append(row)
        section = {'rows': rows}
        if msg.get('section'):
            section['title'] = _cut(msg['section'], 24)
        return {'type': 'interactive', 'interactive': {
            'type': 'list', 'body': {'text': _cut(msg['text'], 1024)},
            'action': {'button': _cut(msg['button'], 20), 'sections': [section]}}}
    return {'type': 'text', 'text': {'body': _cut(msg['text'], 4096), 'preview_url': False}}


def parse(m):
    """A Meta webhook message -> (engine event, message type for the database, plain body)."""
    kind = m.get('type')
    if kind == 'text':
        body = m['text']['body']
        return {'kind': 'text', 'text': body}, 'text', body
    if kind == 'interactive':
        reply = m['interactive'].get('button_reply') or m['interactive'].get('list_reply') or {}
        return {'kind': 'choice', 'choice_id': reply.get('id'), 'text': reply.get('title')}, 'interactive', reply.get('title')
    if kind == 'button':  # quick reply on a template
        return ({'kind': 'choice', 'choice_id': m['button'].get('payload'), 'text': m['button'].get('text')},
                'interactive', m['button'].get('text'))
    if kind in ('image', 'document'):
        media = m[kind]
        return {'kind': 'file', 'media_id': media['id'], 'filename': media.get('filename')}, kind, media.get('caption')
    if kind in ('audio', 'video', 'location'):
        return {'kind': 'other'}, kind, None
    return {'kind': 'other'}, 'system', f'[{kind}]'
