"""The flow builder API, signed in through the real accounts endpoints."""
from django.test import TestCase

from chatbot.starter import intake_flow
from conversations.models import BotFlowVersion, FlowStatus
from tracking.models import ActivityEvent

from .helpers import make_org_users, sign_in


class BuilderApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        make_org_users()

    def setUp(self):
        self.token = sign_in(self.client, 'admin@clc.tz', 'S3cure-pass!', 'clc_admin')

    def api(self, method, url, data=None, token=None):
        return getattr(self.client, method)(f'/api/chatbot/{url}', data, content_type='application/json',
                                            headers={'Authorization': f'Bearer {token or self.token}'})

    def test_only_clc_admin_can_use_builder(self):
        self.assertEqual(self.client.get('/api/chatbot/flows/').status_code, 401)
        firm_token = sign_in(self.client, 'admin@clc.tz', 'S3cure-pass!', 'firm_admin')
        self.assertEqual(self.api('get', 'flows/', token=firm_token).status_code, 403)  # same person, firm role
        self.assertEqual(self.api('get', 'flows/').status_code, 200)

    def test_catalog(self):
        data = self.api('get', 'node-types/').json()
        types = {t['type'] for t in data['node_types']}
        self.assertTrue({'start', 'message', 'ask_buttons', 'ask_list', 'condition', 'create_case', 'handover'} <= types)
        self.assertEqual([t['id'] for t in data['trigger_types']], ['new_conversation', 'keyword'])

    def test_create_edit_publish_and_restore(self):
        res = self.api('post', 'flows/', {'name': 'Wills intake'})
        self.assertEqual(res.status_code, 201)
        flow = res.json()
        fid = flow['id']
        self.assertEqual([n['type'] for n in flow['draft']['definition']['nodes']], ['start'])
        self.assertEqual(self.api('post', 'flows/', {'name': 'wills INTAKE'}).status_code, 400)  # duplicate name

        # Publishing an unconnected Start is refused with the reason.
        res = self.api('post', f'flows/{fid}/publish/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Start is not connected to anything.', [i['message'] for i in res.json()['issues']])

        # Save the CLC intake as the draft; it validates clean, then publish.
        res = self.api('put', f'flows/{fid}/draft/', {'definition': intake_flow()})
        self.assertEqual(res.status_code, 200)
        self.assertFalse([i for i in res.json()['issues'] if i['level'] == 'error'])
        res = self.api('patch', f'flows/{fid}/', {'triggers': [
            {'type': 'keyword', 'config': {'words': ['wosia', 'will'], 'match': 'contains'}, 'priority': 10}]})
        self.assertEqual(res.json()['triggers'][0]['config'], {'words': ['wosia', 'will'], 'match': 'contains'})
        res = self.api('post', f'flows/{fid}/publish/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['published']['version'], 1)
        self.assertIsNone(res.json()['draft'])
        self.assertTrue(ActivityEvent.objects.filter(entity_id=fid, action='flow.published').exists())

        # Editing again creates draft v2 from the published version; publishing archives v1.
        self.assertEqual(self.api('get', f'flows/{fid}/').json()['draft']['version'], 2)
        self.api('post', f'flows/{fid}/publish/')
        statuses = dict(BotFlowVersion.objects.filter(flow_id=fid).values_list('version', 'status'))
        self.assertEqual(statuses, {1: FlowStatus.ARCHIVED, 2: FlowStatus.PUBLISHED})

        # Restore v1 into a new draft.
        v1 = next(v for v in self.api('get', f'flows/{fid}/versions/').json() if v['version'] == 1)
        res = self.api('post', f"flows/{fid}/versions/{v1['id']}/restore/")
        self.assertEqual(res.json()['version'], 3)

        # A published flow cannot be deleted, only switched off.
        self.assertEqual(self.api('delete', f'flows/{fid}/').status_code, 409)
        self.assertFalse(self.api('patch', f'flows/{fid}/', {'is_active': False}).json()['is_active'])

    def test_bad_input_is_refused(self):
        fid = self.api('post', 'flows/', {'name': 'X'}).json()['id']
        self.assertEqual(self.api('put', f'flows/{fid}/draft/', {'definition': {'nodes': 'nope'}}).status_code, 400)
        res = self.api('patch', f'flows/{fid}/', {'triggers': [{'type': 'keyword', 'config': {'words': []}}]})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.api('patch', f'flows/{fid}/', {'triggers': [{'type': 'cron'}]}).status_code, 400)
        self.assertEqual(self.api('delete', f'flows/{fid}/').status_code, 204)  # never published: deletable

    def test_simulate_runs_unsaved_canvas(self):
        fid = self.api('post', 'flows/', {'name': 'Sim'}).json()['id']
        res = self.api('post', f'flows/{fid}/simulate/', {'definition': intake_flow(), 'lang': 'en'}).json()
        self.assertEqual(res['waiting_node'], 'language')
        self.assertEqual(res['messages'][0]['type'], 'buttons')
        res = self.api('post', f'flows/{fid}/simulate/', {'definition': intake_flow(), 'state': res['state'],
                                                          'event': {'kind': 'choice', 'choice_id': 'lang_en'}}).json()
        self.assertEqual(res['waiting_node'], 'menu')
        self.assertEqual(res['trace'], ['language', 'privacy', 'menu'])
        res = self.api('post', f'flows/{fid}/simulate/', {'definition': intake_flow(), 'state': res['state'],
                                                          'event': {'kind': 'choice', 'choice_id': 'menu_human'}}).json()
        self.assertEqual(res['ended'], 'handoff')
        self.assertEqual(res['effects'][0]['effect'], 'handover')
