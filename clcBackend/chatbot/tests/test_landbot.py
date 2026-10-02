"""The bot rebuilt from Landbot, path by path, plus the blocks and settings it relies on:
Business hours, Notify staff, Send file, Bot files and Bot settings."""
import itertools
import shutil
import tempfile
from datetime import datetime
from unittest import mock

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings

from cases.models import Case
from chatbot import botsettings
from chatbot.effects import SimulatedEffects
from chatbot.models import MediaAsset
from chatbot.runtime import Runtime
from chatbot.store import PublishedStore
from conversations.models import BotFlow
from tracking.models import ActivityEvent

from .helpers import SECRET, envelope, make_org_users, sign_in, signed, wa_pick, wa_tap, wa_text

MEDIA = tempfile.mkdtemp()


def tap(choice_id):
    return {'kind': 'choice', 'choice_id': choice_id}


def typed(text):
    return {'kind': 'text', 'text': text}


@override_settings(MEDIA_ROOT=MEDIA)
class RebuiltBotTests(TestCase):
    """Every path of the rebuilt bot, through the engine with simulated effects."""

    @classmethod
    def setUpTestData(cls):
        call_command('import_landbot', verbosity=0)
        cls.main = BotFlow.objects.get(name='CLC WhatsApp bot').id

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def chat(self, hours, *events):
        """Plays a conversation; returns (all bot messages, effects, last turn)."""
        effects = SimulatedEffects(hours=hours)
        runtime = Runtime(PublishedStore(), effects)
        turn = runtime.start(self.main, {'lang': 'sw', 'client_name': 'Feith', 'phone': '+255700000001'})
        messages = list(turn.messages)
        for e in events:
            self.assertIsNotNone(turn.state, f'flow ended before {e}')
            turn = runtime.receive(turn.state, e)
            messages += turn.messages
        return messages, [x['effect'] for x in effects.log if x['effect'] != 'business_hours'], turn, effects

    def test_open_english_tsa_then_expert(self):
        msgs, effects, turn, _ = self.chat('open', tap('lang_en'), tap('cat_tsa'), tap('view'), tap('expert_yes'))
        self.assertEqual(msgs[0]['type'], 'media')  # welcome picture
        self.assertIn('KARIBU COMMUNITY LEGAL CLINIC', msgs[0]['caption'])  # before the language is chosen
        self.assertIn('Hello Feith', msgs[2]['text'])
        pdf = next(m for m in msgs if m['type'] == 'media' and m['media_kind'] == 'document')
        self.assertEqual(pdf['name'], 'TSA proposal (English) – PLACEHOLDER')
        self.assertEqual(turn.ended, 'handoff')
        self.assertEqual(effects, ['set_client', 'create_case', 'notify_staff', 'handover'])
        self.assertIn('Your reference: *CLC/TEST/0001*', msgs[-1]['text'])

    def test_kiswahili_tsa_sends_the_swahili_proposal(self):
        msgs, _, turn, _ = self.chat('open', tap('lang_sw'), tap('cat_tsa'), tap('view'), tap('expert_no'))
        pdf = next(m for m in msgs if m['type'] == 'media' and m['media_kind'] == 'document')
        self.assertEqual(pdf['name'], 'TSA proposal (Kiswahili) – PLACEHOLDER')
        self.assertIn('Hakuna shida', msgs[-1]['text'])
        self.assertEqual(turn.ended, 'completed')

    def test_closed_at_start_leave_a_message(self):
        msgs, effects, turn, sim = self.chat('closed', tap('lang_en'), tap('leave_message'),
                                             typed('I need help with my land title'))
        self.assertIn('Our team is currently offline', msgs[2]['text'])
        self.assertIn('Monday to Friday:* 9:00 AM – 6:00 PM', msgs[2]['text'])
        self.assertEqual(effects, ['set_client', 'create_case', 'notify_staff'])
        email = next(x for x in sim.log if x['effect'] == 'notify_staff')['detail']
        self.assertIn('godfreynjale@clc.tz, dicksonmdumula@clc.tz', email)
        self.assertIn('reference *CLC/TEST/0001*', msgs[-1]['text'])
        self.assertEqual(turn.ended, 'completed')

    def test_closed_leave_chat(self):
        msgs, effects, turn, _ = self.chat('closed', tap('lang_sw'), tap('leave_chat'))
        self.assertIn('Asante kwa kuwasiliana nasi', msgs[-1]['text'])
        self.assertEqual(effects, ['set_client'])

    def test_will_sends_template_then_phone_appointment(self):
        msgs, effects, turn, _ = self.chat('open', tap('lang_en'), tap('cat_legal'), tap('svc_will'), tap('go'),
                                           tap('appt_phone'))
        will = next(m for m in msgs if m.get('name', '').startswith('Will template'))
        self.assertIn('free Will template', will['caption'])
        proceed = next(m for m in msgs if 'you opted for' in (m.get('text') or ''))
        self.assertIn('*Drafting of Will*', proceed['text'])
        self.assertTrue(any('calendly.com/legalclinicclc/10min' in (m.get('text') or '') for m in msgs))
        self.assertEqual(turn.ended, 'handoff')

    def test_land_office_appointment_outside_hours(self):
        # Opened while open; the office closes before the client picks an appointment.
        effects = SimulatedEffects(hours='open')
        runtime = Runtime(PublishedStore(), effects)
        t = runtime.start(self.main, {'lang': 'en', 'client_name': 'Feith'})
        for e in (tap('lang_en'), tap('cat_legal'), tap('svc_land'), tap('go')):
            t = runtime.receive(t.state, e)
        effects.hours = 'closed'
        t = runtime.receive(t.state, tap('appt_office'))
        self.assertEqual(t.messages[0]['name'], 'Our offices (Dar es Salaam & Dodoma) – PLACEHOLDER')
        self.assertIn('physical appointment', t.messages[1]['text'])
        t = runtime.receive(t.state, tap('leave_message'))
        t = runtime.receive(t.state, typed('Call me tomorrow'))
        self.assertEqual(t.ended, 'completed')
        email = next(x for x in effects.log if x['effect'] == 'notify_staff')
        self.assertIn('Land & Property: office appointment (paid)', email['detail'])

    def test_other_legal_service_asks_for_a_description(self):
        msgs, effects, turn, sim = self.chat('open', tap('lang_sw'), tap('cat_legal'), tap('svc_other'),
                                             typed('Nina mgogoro wa mpaka na jirani yangu'))
        email = next(x for x in sim.log if x['effect'] == 'notify_staff')['detail']
        self.assertIn('Other legal service: Nina mgogoro wa mpaka', email)
        self.assertEqual(turn.ended, 'handoff')

    def test_not_interested_says_goodbye(self):
        msgs, effects, turn, _ = self.chat('open', tap('lang_en'), tap('cat_legal'), tap('svc_company'), tap('stop'))
        self.assertIn('No problem, Feith!', msgs[-1]['text'])
        self.assertNotIn('create_case', effects)

    def test_kiapo_from_english_switches_to_kiswahili(self):
        msgs, effects, turn, _ = self.chat('open', tap('lang_en'), tap('cat_kiapo'))
        self.assertIn('Swahili only', msgs[-2]['text'])
        self.assertIn('changamoto yako ya majina', msgs[-1]['text'])
        self.assertEqual(turn.state['vars']['lang'], 'sw')

    def test_kiapo_nssf_phone(self):
        msgs, effects, turn, sim = self.chat('open', tap('lang_sw'), tap('cat_kiapo'), tap('area_nssf'),
                                             tap('appt_phone'))
        self.assertIn('Miadi kwa Simu', msgs[-2]['text'])
        email = next(x for x in sim.log if x['effect'] == 'notify_staff')['detail']
        self.assertIn('Kiapo cha majina (NSSF): miadi ya simu', email)
        self.assertEqual(turn.ended, 'handoff')

    def test_kiapo_nida_every_topic(self):
        base = (tap('lang_sw'), tap('cat_kiapo'), tap('area_nida'))
        # change of name -> yes -> appointment
        msgs, _, turn, _ = self.chat('open', *base, tap('nida_name'), tap('nida_name_yes'))
        self.assertIn('Taarifa ya Upatikanaji wa Huduma', msgs[-1]['text'])
        # correct details -> NIDA contacts -> helped
        msgs, _, turn, _ = self.chat('open', *base, tap('nida_info'), tap('nida_info_yes'), tap('helped_yes'))
        self.assertIn('023-2210500', msgs[-2]['text'])
        self.assertEqual(turn.ended, 'completed')
        # date of birth -> either answer -> staff, with the answer in the request
        msgs, _, turn, sim = self.chat('open', *base, tap('nida_birth'), tap('nida_birth_no'))
        email = next(x for x in sim.log if x['effect'] == 'notify_staff')['detail']
        self.assertIn('ana gazeti: Hapana', email)
        # fraud -> no question -> goodbye
        msgs, effects, turn, _ = self.chat('open', *base, tap('nida_fraud'), tap('nida_fraud_no'))
        self.assertNotIn('create_case', effects)
        # public servants -> staff
        msgs, effects, turn, _ = self.chat('open', *base, tap('nida_public'), tap('nida_public_yes'))
        self.assertIn('create_case', effects)

    def test_kiapo_necta(self):
        msgs, _, turn, _ = self.chat('open', tap('lang_sw'), tap('cat_kiapo'), tap('area_necta'), tap('necta_yes'))
        self.assertEqual(msgs[-3]['name'], 'NECTA name-correction guideline – PLACEHOLDER')
        self.assertIn('Tunashukuru', msgs[-1]['text'])
        msgs, effects, turn, sim = self.chat('open', tap('lang_sw'), tap('cat_kiapo'), tap('area_necta'),
                                             tap('necta_no'), tap('more_yes'), typed('Jina langu limekosewa'))
        self.assertIn('NECTA): Jina langu limekosewa', next(x for x in sim.log if x['effect'] == 'notify_staff')['detail'])

    def test_import_is_idempotent(self):
        call_command('import_landbot', verbosity=0)
        self.assertEqual(BotFlow.objects.filter(name='CLC WhatsApp bot').count(), 1)
        self.assertEqual(MediaAsset.objects.count(), 8)


class HoursTests(TestCase):
    def test_is_open(self):
        hours = {'days': {'mon': [['09:00', '18:00']], 'sat': [['09:00', '13:30']]}, 'closed_dates': ['2026-12-28']}
        at = lambda s: datetime.fromisoformat(s + '+03:00')  # noqa: E731
        self.assertTrue(botsettings.is_open(hours, at('2026-10-05T09:00')))    # Monday
        self.assertFalse(botsettings.is_open(hours, at('2026-10-05T18:00')))   # closing time
        self.assertTrue(botsettings.is_open(hours, at('2026-10-03T13:29')))    # Saturday
        self.assertFalse(botsettings.is_open(hours, at('2026-10-04T10:00')))   # Sunday
        self.assertFalse(botsettings.is_open(hours, at('2026-12-28T10:00')))   # holiday (a Monday)

    def test_clean_and_describe(self):
        hours, err = botsettings.clean_hours({'days': {d: [['09:00', '18:00']] for d in botsettings.DAYS[:5]}
                                              | {'sat': [['09:00', '13:30']]}, 'closed_dates': ['2026-12-25']})
        self.assertIsNone(err)
        self.assertEqual(botsettings.describe(hours), 'Mon–Fri 09:00–18:00 · Sat 09:00–13:30')
        self.assertEqual(botsettings.clean_hours({'days': {'mon': [['18:00', '09:00']]}})[1],
                         'Monday: closing time must be after opening time.')
        self.assertEqual(botsettings.clean_emails('a@clc.tz, nope')[1], '"nope" is not an email address.')


@override_settings(META_APP_SECRET=SECRET, MEDIA_ROOT=MEDIA, WHATSAPP_PHONE_NUMBER_ID='PNID')
class LiveRebuiltBotTests(TestCase):
    """The rebuilt bot over the real webhook: files go to Meta, staff get an email, a case is saved."""

    @classmethod
    def setUpTestData(cls):
        make_org_users()
        call_command('import_landbot', verbosity=0)

    def setUp(self):
        self.sent = []
        ids = itertools.count(1)

        def fake_send(to, payload):
            self.sent.append(payload)
            return f'wamid.out.{next(ids)}'
        for target, kwargs in [('chatbot.whatsapp.send', {'side_effect': fake_send}),
                               ('chatbot.whatsapp.mark_read', {}),
                               ('chatbot.whatsapp.media_id', {'return_value': 'META-MEDIA-1'})]:
            p = mock.patch(target, **kwargs)
            p.start()
            self.addCleanup(p.stop)

    def say(self, message):
        raw, sig = signed(envelope([message]))
        start = len(self.sent)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post('/api/whatsapp/webhook/', raw, content_type='application/json',
                             headers={'X-Hub-Signature-256': sig})
        return self.sent[start:]

    def test_out_of_hours_message_becomes_a_case_and_an_email(self):
        with mock.patch('chatbot.botsettings.is_open', return_value=False):
            first = self.say(wa_text('Habari'))
            self.assertEqual(first[0], {'type': 'image', 'image': {'caption': '*KARIBU COMMUNITY LEGAL CLINIC*',
                                                                   'id': 'META-MEDIA-1'}})
            self.say(wa_tap('lang_en'))
            self.say(wa_tap('leave_message'))
            last = self.say(wa_text('Please call me about my will'))
        case = Case.objects.get()
        self.assertEqual(case.summary, 'Please call me about my will')
        self.assertIn(case.reference, last[0]['text']['body'])
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['godfreynjale@clc.tz', 'dicksonmdumula@clc.tz'])
        self.assertIn('outside working hours', email.subject)
        self.assertIn('"Please call me about my will"', email.body)
        self.assertIn('https://wa.me/255700000001', email.body)
        self.assertIn(f'Case: {case.reference}', email.body)
        self.assertTrue(ActivityEvent.objects.filter(action='staff.notified').exists())

    def test_list_reply_and_document(self):
        with mock.patch('chatbot.botsettings.is_open', return_value=True):
            self.say(wa_text('Hi'))
            self.say(wa_tap('lang_en'))
            self.say(wa_tap('cat_legal'))
            out = self.say(wa_pick('svc_will'))
        self.assertEqual(out[0]['type'], 'document')
        self.assertEqual(out[0]['document']['filename'], 'CLC Will template.pdf')
        self.assertEqual(out[0]['document']['id'], 'META-MEDIA-1')


@override_settings(MEDIA_ROOT=MEDIA)
class BotFilesAndSettingsApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        make_org_users()

    def setUp(self):
        self.auth = {'Authorization': f"Bearer {sign_in(self.client, 'admin@clc.tz', 'S3cure-pass!', 'clc_admin')}"}

    def test_upload_replace_preview_delete(self):
        res = self.client.post('/api/chatbot/media/', {'file': SimpleUploadedFile('guide.pdf', b'%PDF-1.4 x', 'application/pdf'),
                                                        'name': 'Guide'}, headers=self.auth)
        self.assertEqual(res.status_code, 201)
        f = res.json()
        self.assertEqual((f['name'], f['kind']), ('Guide', 'document'))
        self.assertEqual(self.client.get(f['url']).status_code, 200)               # signed preview link
        self.assertEqual(self.client.get(f['url'][:-3] + 'abc').status_code, 404)  # tampered link
        bad = self.client.post('/api/chatbot/media/', {'file': SimpleUploadedFile('x.exe', b'MZ', 'application/x-msdownload')},
                               headers=self.auth)
        self.assertEqual(bad.status_code, 400)
        res = self.client.post(f"/api/chatbot/media/{f['id']}/", {'file': SimpleUploadedFile('guide-v2.pdf', b'%PDF-1.4 yy',
                                                                                            'application/pdf')}, headers=self.auth)
        self.assertEqual(res.json()['file_name'], 'guide-v2.pdf')
        # A file a flow sends cannot be deleted.
        fid = self.client.post('/api/chatbot/flows/', {'name': 'Files'}, content_type='application/json',
                               headers=self.auth).json()['id']
        definition = {'nodes': [{'id': 'start', 'type': 'start', 'position': {'x': 0, 'y': 0}, 'data': {}},
                                {'id': 'f', 'type': 'send_media', 'position': {'x': 0, 'y': 0},
                                 'data': {'media': {'sw': f['id']}}}],
                      'edges': [{'id': 'e', 'source': 'start', 'sourceHandle': 'next', 'target': 'f'}]}
        self.client.put(f'/api/chatbot/flows/{fid}/draft/', {'definition': definition}, content_type='application/json',
                        headers=self.auth)
        res = self.client.delete(f"/api/chatbot/media/{f['id']}/", headers=self.auth)
        self.assertEqual(res.status_code, 409)
        self.assertIn('Files', res.json()['detail'])

    def test_settings(self):
        res = self.client.get('/api/chatbot/settings/', headers=self.auth)
        self.assertEqual(res.json()['staff_emails'], [])
        res = self.client.put('/api/chatbot/settings/', {'staff_emails': 'A@clc.tz, b@clc.tz', 'business_hours': {
            'days': {'mon': [['09:00', '18:00']]}, 'closed_dates': []}}, content_type='application/json', headers=self.auth)
        self.assertEqual(res.json()['staff_emails'], ['a@clc.tz', 'b@clc.tz'])
        self.assertEqual(res.json()['hours_summary'], 'Mon 09:00–18:00')
        res = self.client.put('/api/chatbot/settings/', {'staff_emails': 'nope'}, content_type='application/json',
                              headers=self.auth)
        self.assertEqual(res.status_code, 400)
