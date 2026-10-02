"""A client chatting on WhatsApp, end to end: signed webhook calls, PostgreSQL, Meta's API faked."""
import itertools
import shutil
import tempfile
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from cases.models import Case, Document
from chatbot.starter import intake_flow
from clients.models import Client
from conversations.models import (BotFlow, BotFlowVersion, BotSession, Conversation, FlowStatus, FlowTrigger,
                                  Message)
from notifications.models import Notification
from tracking.models import ActivityEvent

from .helpers import SECRET, envelope, make_org_users, signed, wa_photo, wa_pick, wa_tap, wa_text

MEDIA = tempfile.mkdtemp()


@override_settings(META_APP_SECRET=SECRET, WHATSAPP_VERIFY_TOKEN='verify-me', MEDIA_ROOT=MEDIA,
                   WHATSAPP_PHONE_NUMBER_ID='PNID')
class WhatsAppTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        make_org_users()
        call_command('seed_chatbot', verbosity=0)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.sent = []
        ids = itertools.count(1)

        def fake_send(to, payload):
            self.sent.append(payload)
            return f'wamid.out.{next(ids)}'

        for target, kwargs in [
            ('chatbot.whatsapp.send', {'side_effect': fake_send}),
            ('chatbot.whatsapp.mark_read', {}),
            ('chatbot.whatsapp.download_media', {'side_effect': lambda media_id, filename=None: {
                'storage_key': f'whatsapp/test/{media_id}.jpg', 'sha256': 'a' * 64, 'size_bytes': 1234,
                'mime_type': 'image/jpeg', 'file_name': 'photo.jpg'}}),
        ]:
            p = mock.patch(target, **kwargs)
            p.start()
            self.addCleanup(p.stop)

    def say(self, *messages, secret=SECRET):
        raw, sig = signed(envelope(messages), secret)
        start = len(self.sent)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post('/api/whatsapp/webhook/', raw, content_type='application/json',
                                   headers={'X-Hub-Signature-256': sig})
        self.last_status = res.status_code
        return self.sent[start:]

    @staticmethod
    def body(p):
        return p['text']['body'] if p['type'] == 'text' else p['interactive']['body']['text']

    def test_webhook_verification_and_signature(self):
        ok = self.client.get('/api/whatsapp/webhook/', {'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me',
                                                        'hub.challenge': '42'})
        self.assertEqual((ok.status_code, ok.content), (200, b'42'))
        self.assertEqual(self.client.get('/api/whatsapp/webhook/', {'hub.mode': 'subscribe',
                                                                    'hub.verify_token': 'no'}).status_code, 403)
        self.say(wa_text('Habari'), secret='wrong-secret')
        self.assertEqual(self.last_status, 401)
        self.assertFalse(Message.objects.exists())

    def test_full_intake_creates_case(self):
        first = self.say(wa_text('Habari'))
        self.assertEqual(first[0]['interactive']['type'], 'button')
        self.assertEqual([b['reply']['title'] for b in first[0]['interactive']['action']['buttons']],
                         ['Kiswahili', 'English', '中文'])
        menu = self.say(wa_tap('lang_sw', 'Kiswahili'))
        self.assertIn('ridhaa', self.body(menu[0]))
        self.assertEqual(len(menu[1]['interactive']['action']['sections'][0]['rows']), 7)
        self.say(wa_pick('svc_deed', 'Badilisha jina'))
        self.say(wa_text('Feith Moses Livingstone'))
        self.say(wa_text('Dodoma'))
        retry = self.say(wa_text('Jina'))
        self.assertIn('maneno zaidi', self.body(retry[0]))
        self.say(wa_text('Jina langu kwenye NIDA ni tofauti na vyeti vyangu vya shule.'))
        got = self.say(wa_photo())
        self.assertIn('Nimepokea nyaraka 1', self.body(got[0]))
        done = self.say(wa_tap('__done', 'Nimemaliza'))

        case = Case.objects.get()
        self.assertIn(case.reference, self.body(done[0]))
        self.assertEqual((case.service.code, case.region, case.status), ('deed_poll', 'Dodoma', 'new'))
        self.assertEqual(Document.objects.get(case=case).file_name, 'photo.jpg')
        client = Client.objects.get()
        self.assertEqual((client.full_name, client.preferred_language, client.region),
                         ('Feith Moses Livingstone', 'sw', 'Dodoma'))
        conv = Conversation.objects.get()
        self.assertEqual((conv.status, conv.case_id), ('queued', case.id))
        self.assertEqual(BotSession.objects.get().end_reason, 'handoff')
        self.assertTrue(Notification.objects.filter(entity_id=case.id).exists())
        self.assertTrue(ActivityEvent.objects.filter(entity_id=case.id, action='case.created').exists())
        # Everything on record: every reply sent and stored.
        self.assertEqual(Message.objects.filter(direction='outbound', status='sent').count(), len(self.sent))

        # The chat is now with CLC: the bot stays quiet, and another document still lands on the case.
        self.assertEqual(self.say(wa_text('Mmefikia wapi?')), [])
        self.say(wa_photo())
        self.assertEqual(Document.objects.filter(case=case).count(), 2)

    def test_duplicate_delivery_and_status_reports(self):
        m = wa_text('Habari')
        self.assertEqual(len(self.say(m)), 1)
        self.assertEqual(self.say(m), [])  # Meta retried: ignored
        wamid = Message.objects.get(direction='outbound').provider_message_id
        for status in ('read', 'delivered'):  # out of order on purpose
            raw, sig = signed(envelope(statuses=[{'id': wamid, 'status': status, 'timestamp': '1790000000'}]))
            self.client.post('/api/whatsapp/webhook/', raw, content_type='application/json',
                             headers={'X-Hub-Signature-256': sig})
        out = Message.objects.get(direction='outbound')
        self.assertEqual(out.status, 'read')
        self.assertIsNotNone(out.delivered_at)

    def test_keyword_trigger_beats_new_conversation(self):
        flow = BotFlow.objects.create(name='Wills')
        BotFlowVersion.objects.create(flow=flow, version=1, status=FlowStatus.PUBLISHED, definition={
            'nodes': [{'id': 's', 'type': 'start', 'data': {}},
                      {'id': 'm', 'type': 'message', 'data': {'text': {'sw': 'Karibu kwenye huduma ya wosia.'}}}],
            'edges': [{'source': 's', 'sourceHandle': 'next', 'target': 'm'}]})
        FlowTrigger.objects.create(flow=flow, type='keyword', priority=10,
                                   config={'words': ['wosia'], 'match': 'contains'})
        reply = self.say(wa_text('Nataka kuandika WOSIA wangu'))
        self.assertEqual(self.body(reply[0]), 'Karibu kwenye huduma ya wosia.')
        self.assertEqual(BotSession.objects.get().end_reason, 'completed')
        # "wosiaa" is not the word "wosia": falls through to the intake flow.
        self.assertEqual(self.say(wa_text('wosiaa', wa='255700000002'))[0]['interactive']['type'], 'button')

    def test_menu_word_restarts_and_returning_client_keeps_language(self):
        self.say(wa_text('Habari'))
        self.say(wa_tap('lang_en', 'English'))
        restart = self.say(wa_text('menu'))
        self.assertEqual(restart[0]['interactive']['type'], 'button')  # back to the start
        self.assertEqual(BotSession.objects.filter(end_reason='abandoned').count(), 1)

    def test_talk_to_clc(self):
        self.say(wa_text('Habari'))
        self.say(wa_tap('lang_en', 'English'))
        reply = self.say(wa_pick('menu_human', 'Talk to CLC'))
        self.assertIn('CLC team will reply', self.body(reply[0]))
        self.assertEqual(Conversation.objects.get().status, 'queued')

    def test_editing_a_flow_does_not_break_running_sessions(self):
        self.say(wa_text('Habari'))  # session pinned to v1, waiting at "language"
        flow = BotFlow.objects.get(name='CLC intake')
        v1 = flow.versions.get(status=FlowStatus.PUBLISHED)
        changed = intake_flow()
        next(n for n in changed['nodes'] if n['id'] == 'privacy')['data']['text']['en'] = 'Version two notice.'
        v1.status = FlowStatus.ARCHIVED
        v1.save()
        BotFlowVersion.objects.create(flow=flow, version=2, status=FlowStatus.PUBLISHED, definition=changed)
        reply = self.say(wa_tap('lang_en', 'English'))
        self.assertIn('without your consent', self.body(reply[0]))  # still v1 for this client
        new_client = self.say(wa_text('Habari', wa='255700000009'))
        self.say(wa_tap('lang_en', 'English', wa='255700000009'))
        self.assertEqual(self.body(self.sent[-2]), 'Version two notice.')
        self.assertTrue(new_client)
