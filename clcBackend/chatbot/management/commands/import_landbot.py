"""Loads CLC's WhatsApp bot rebuilt from Landbot (chatbot/landbot.py): its services, the files it
sends, opening hours, staff emails and three published flows.

    python manage.py import_landbot --media-dir ../docs/landbot/media

--media-dir is a folder with the files downloaded from Landbot, named as in Landbot
(e.g. VL4PXV4O8ACADCOQBE2Z6M2570DTLA8G.pdf). A file that is missing gets a clearly labelled
placeholder; replace it later in Admin > Chatbot flows > Bot files (the flows keep working).

Safe to run again: existing files, settings and flows are left as they are.
"""
import hashlib
import io
import struct
import zlib
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, OutputWrapper
from django.db import transaction
from django.utils import timezone

from chatbot import botsettings, landbot
from chatbot.models import BotSetting, MediaAsset, MediaKind
from chatbot.validate import has_errors, validate
from conversations.models import BotFlow, BotFlowVersion, FlowStatus, FlowTrigger, TriggerType
from core.models import Service

MAIN, KIAPO, WRAP_UP = 'CLC WhatsApp bot', 'Kiapo cha Majina', 'Connect to staff or leave a message'
HOURS = {'days': {'mon': [['09:00', '18:00']], 'tue': [['09:00', '18:00']], 'wed': [['09:00', '18:00']],
                  'thu': [['09:00', '18:00']], 'fri': [['09:00', '18:00']], 'sat': [['09:00', '13:30']], 'sun': []},
         'closed_dates': []}
STAFF = ['godfreynjale@clc.tz', 'dicksonmdumula@clc.tz']
MIME = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'pdf': 'application/pdf'}


def placeholder(ext, label):
    """A small file that says plainly it must be replaced."""
    if ext == 'pdf':
        text = f'PLACEHOLDER - replace with: {label}'.replace('(', '[').replace(')', ']')
        stream = f'BT /F1 18 Tf 40 400 Td ({text}) Tj ET'.encode()
        objs = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R '
                b'/Resources << /Font << /F1 5 0 R >> >> >>',
                b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream',
                b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
        out, offsets = b'%PDF-1.4\n', []
        for i, o in enumerate(objs, 1):
            offsets.append(len(out))
            out += b'%d 0 obj\n' % i + o + b'\nendobj\n'
        xref = len(out)
        out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1)
        out += b''.join(b'%010d 00000 n \n' % off for off in offsets)
        return out + b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, xref)
    # 64x64 grey PNG
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    raw = b''.join(b'\x00' + b'\xc8\xc8\xc8' * 64 for _ in range(64))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 64, 64, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


class Command(BaseCommand):
    help = "Load CLC's WhatsApp bot rebuilt from Landbot"

    def add_arguments(self, parser):
        parser.add_argument('--media-dir', help='Folder with the files downloaded from Landbot')

    def handle(self, *args, media_dir=None, **opts):
        if opts.get('verbosity') == 0:
            self.stdout = OutputWrapper(io.StringIO())
        folder = Path(media_dir) if media_dir else None
        with transaction.atomic():
            for code, sw, en, order in landbot.SERVICES:
                Service.objects.get_or_create(code=code, defaults={'name_sw': sw, 'name_en': en, 'sort_order': order})
            if not BotSetting.objects.filter(key='business_hours').exists():
                botsettings.put('business_hours', HOURS)
                self.stdout.write('Opening hours: ' + botsettings.describe(HOURS))
            if not BotSetting.objects.filter(key='staff_emails').exists():
                botsettings.put('staff_emails', STAFF)
                self.stdout.write('Staff emails: ' + ', '.join(STAFF))

            media, placeholders = {}, []
            for key, (landbot_name, name, file_name) in landbot.MEDIA.items():
                ext = landbot_name.rsplit('.', 1)[1]
                source = folder / landbot_name if folder else None
                asset = MediaAsset.objects.filter(name=name).first()
                stand_in = MediaAsset.objects.filter(name=f'{name} – PLACEHOLDER').first()
                if asset is None and stand_in and source and source.exists():
                    # The real file arrived: swap it in, so the flows that send it get it.
                    data = source.read_bytes()
                    old = stand_in.storage_key
                    stand_in.storage_key = default_storage.save(f'bot-files/{landbot_name}', ContentFile(data))
                    stand_in.name, stand_in.size_bytes, stand_in.mime_type = name, len(data), MIME[ext]
                    stand_in.sha256, stand_in.meta_media_id, stand_in.meta_uploaded_at = \
                        hashlib.sha256(data).hexdigest(), '', None
                    stand_in.save()
                    default_storage.delete(old)
                    self.stdout.write(f'Replaced the placeholder for "{name}".')
                    asset = stand_in
                asset = asset or stand_in
                if asset is not None and asset.name.endswith('PLACEHOLDER'):
                    placeholders.append(asset.name)
                if asset is None:
                    if source and source.exists():
                        data = source.read_bytes()
                    else:
                        data = placeholder(ext, name)
                        name = f'{name} – PLACEHOLDER'
                        placeholders.append(name)
                    key_path = default_storage.save(f'bot-files/{landbot_name}', ContentFile(data))
                    asset = MediaAsset.objects.create(
                        name=name, kind=MediaKind.DOCUMENT if ext == 'pdf' else MediaKind.IMAGE, file_name=file_name,
                        mime_type=MIME[ext] if name == landbot.MEDIA[key][1] else MIME[ext].replace('jpeg', 'png'), size_bytes=len(data), storage_key=key_path,
                        sha256=hashlib.sha256(data).hexdigest())
                media[key] = str(asset.id)

            wrap_up = self._flow(WRAP_UP, 'Every request ends here: during working hours a case, an email to staff '
                                 'and a handover to an agent; outside them the client leaves a message.',
                                 lambda: landbot.wrap_up_flow())
            kiapo = self._flow(KIAPO, 'Name changes (Deed Poll) for NSSF, NIDA and NECTA. Kiswahili only.',
                               lambda: landbot.kiapo_flow(media, str(wrap_up.id)))
            main = self._flow(MAIN, 'Rebuilt from the Landbot bot "LEGAL SERVICES - 2025/2026": TSA, legal services '
                              'and Kiapo cha Majina, in Kiswahili and English.',
                              lambda: landbot.main_flow(media, str(kiapo.id), str(wrap_up.id)),
                              trigger=True)
        for name in placeholders:
            self.stdout.write(self.style.WARNING(f'No file for "{name}": replace it in Bot files.'))
        self.stdout.write(self.style.SUCCESS(f'Ready: "{main.name}" starts every new WhatsApp conversation.'))

    def _flow(self, name, description, make, trigger=False):
        flow = BotFlow.objects.filter(name=name).first()
        if flow:
            self.stdout.write(f'"{name}" already exists; left unchanged.')
            return flow
        flow = BotFlow.objects.create(name=name, description=description)
        definition = make()
        lookup = {str(f.id): {'name': f.name, 'published': True} for f in BotFlow.objects.all()}
        issues = validate(definition, flow_id=flow.id, lookup_flow=lookup.get,
                          lookup_media=lambda a: MediaAsset.objects.filter(id=a).exists(),
                          languages=definition['settings']['languages'])
        if has_errors(issues):
            raise SystemExit(f'"{name}" is invalid: ' + '; '.join(
                f"{i['node']}: {i['message']}" for i in issues if i['level'] == 'error'))
        for i in issues:
            self.stdout.write(self.style.WARNING(f'{name} / {i["node"]}: {i["message"]}'))
        BotFlowVersion.objects.create(flow=flow, version=1, status=FlowStatus.PUBLISHED, definition=definition,
                                      published_at=timezone.now())
        if trigger:  # wins over other "New conversation" flows (lower number first)
            FlowTrigger.objects.create(flow=flow, type=TriggerType.NEW_CONVERSATION, priority=50)
        self.stdout.write(self.style.SUCCESS(f'Published "{name}" ({len(definition["nodes"])} blocks).'))
        return flow
