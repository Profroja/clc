"""The runtime and validator on their own: no database, no WhatsApp."""
import copy

from django.test import SimpleTestCase

from chatbot.effects import SimulatedEffects
from chatbot.runtime import FlowError, FlowStore, Runtime
from chatbot.starter import intake_flow
from chatbot.validate import has_errors, validate


class MemoryStore(FlowStore):
    def __init__(self, flows):
        self.flows = flows  # {flow_id: definition}

    def current(self, flow_id):
        return ('v1', self.flows[flow_id]) if flow_id in self.flows else None

    def version(self, flow_id, version_id):
        return self.flows.get(flow_id)


def choice(cid):
    return {'kind': 'choice', 'choice_id': cid}


def text(t):
    return {'kind': 'text', 'text': t}


class EngineTests(SimpleTestCase):
    def setUp(self):
        self.effects = SimulatedEffects()
        self.rt = Runtime(MemoryStore({'intake': intake_flow()}), self.effects)

    def test_starter_flow_is_valid(self):
        issues = validate(intake_flow(), languages=('sw', 'en', 'zh'))
        self.assertFalse(has_errors(issues), issues)

    def test_full_intake(self):
        turn = self.rt.start('intake')
        self.assertEqual(turn.messages[0]['type'], 'buttons')
        self.assertEqual(turn.waiting_node, 'language')

        turn = self.rt.receive(turn.state, choice('lang_en'))
        self.assertIn('without your consent', turn.messages[0]['text'])   # English chosen
        self.assertEqual(turn.messages[1]['type'], 'list')
        self.assertEqual(len(turn.messages[1]['rows']), 7)

        turn = self.rt.receive(turn.state, text('Change my name'))          # typed title works
        self.assertEqual(turn.state['vars']['service'], 'deed_poll')
        turn = self.rt.receive(turn.state, text('Fe'))                      # too short
        self.assertEqual(turn.waiting_node, 'ask_name')
        turn = self.rt.receive(turn.state, text('Feith Moses'))
        turn = self.rt.receive(turn.state, text('Dodoma'))
        turn = self.rt.receive(turn.state, text('My NIDA name differs from my school certificates.'))
        turn = self.rt.receive(turn.state, {'kind': 'file', 'file': {'storage_key': 'k1'}})
        self.assertIn('Received 1', turn.messages[0]['text'])
        turn = self.rt.receive(turn.state, choice('__done'))

        self.assertIsNone(turn.state)
        self.assertEqual(turn.ended, 'handoff')
        self.assertIn('CLC/TEST/0001', turn.messages[0]['text'])
        self.assertIn('Feith Moses', turn.messages[0]['text'])
        effects = [e['effect'] for e in self.effects.log]
        self.assertEqual(effects, ['set_client', 'set_client', 'set_client', 'create_case', 'handover'])
        self.assertIn('documents=1', self.effects.log[3]['detail'])

    def test_wrong_input_repeats_question(self):
        turn = self.rt.start('intake')
        turn = self.rt.receive(turn.state, text('banana'))
        self.assertEqual(turn.waiting_node, 'language')
        self.assertTrue(turn.messages[0]['text'].startswith('Samahani'))

    def test_condition_and_set_variable(self):
        flow = {'nodes': [
            {'id': 's', 'type': 'start', 'data': {}},
            {'id': 'a', 'type': 'ask_text', 'data': {'text': {'en': 'Age?'}, 'save_as': 'age'}},
            {'id': 'c', 'type': 'condition', 'data': {'rules': [
                {'id': 'adult', 'variable': 'age', 'operator': 'greater_than', 'value': '17'}]}},
            {'id': 'y', 'type': 'set_variable', 'data': {'name': 'group', 'value': 'adult-{{age}}'}},
            {'id': 'm', 'type': 'message', 'data': {'text': {'en': 'Group {{group}}'}}},
            {'id': 'n', 'type': 'message', 'data': {'text': {'en': 'Minor'}}},
        ], 'edges': [
            {'source': 's', 'sourceHandle': 'next', 'target': 'a'},
            {'source': 'a', 'sourceHandle': 'next', 'target': 'c'},
            {'source': 'c', 'sourceHandle': 'adult', 'target': 'y'},
            {'source': 'c', 'sourceHandle': 'else', 'target': 'n'},
            {'source': 'y', 'sourceHandle': 'next', 'target': 'm'},
        ]}
        rt = Runtime(MemoryStore({'f': flow}), SimulatedEffects())
        state = rt.start('f', {'lang': 'en'}).state
        self.assertEqual(rt.receive(state, text('30')).messages[0]['text'], 'Group adult-30')
        self.assertEqual(rt.receive(state, text('12')).messages[0]['text'], 'Minor')

    def test_go_to_flow_returns_to_caller(self):
        main = {'nodes': [
            {'id': 's', 'type': 'start', 'data': {}},
            {'id': 'g', 'type': 'go_to_flow', 'data': {'flow_id': 'sub'}},
            {'id': 'm', 'type': 'message', 'data': {'text': {'en': 'Back in main, {{name}}'}}},
        ], 'edges': [{'source': 's', 'target': 'g'}, {'source': 'g', 'target': 'm'}]}
        sub = {'nodes': [
            {'id': 's', 'type': 'start', 'data': {}},
            {'id': 'q', 'type': 'ask_text', 'data': {'text': {'en': 'Name?'}, 'save_as': 'name'}},
        ], 'edges': [{'source': 's', 'target': 'q'}]}
        rt = Runtime(MemoryStore({'main': main, 'sub': sub}), SimulatedEffects())
        turn = rt.start('main', {'lang': 'en'})
        self.assertEqual(turn.state['flow'], 'sub')
        turn = rt.receive(turn.state, text('Asha'))
        self.assertEqual(turn.messages[-1]['text'], 'Back in main, Asha')
        self.assertEqual(turn.ended, 'completed')

    def test_endless_loop_is_stopped(self):
        flow = {'nodes': [{'id': 's', 'type': 'start', 'data': {}},
                          {'id': 'v', 'type': 'set_variable', 'data': {'name': 'x', 'value': '1'}}],
                'edges': [{'source': 's', 'target': 'v'}, {'source': 'v', 'target': 'v'}]}
        rt = Runtime(MemoryStore({'f': flow}), SimulatedEffects())
        with self.assertRaises(FlowError):
            rt.start('f')

    def test_validator_catches_whatsapp_limits_and_wiring(self):
        flow = copy.deepcopy(intake_flow())
        lang = next(n for n in flow['nodes'] if n['id'] == 'language')
        lang['data']['options'].append({'id': 'x', 'title': {'sw': 'A title that is far too long'}})
        flow['edges'].append({'source': 'menu', 'sourceHandle': 'nope', 'target': 'privacy'})
        flow['nodes'].append({'id': 'lonely', 'type': 'message', 'data': {'text': {'sw': 'hi'}}})
        messages = [i['message'] for i in validate(flow)]
        self.assertTrue(any('needs 1 to 3' in m for m in messages))
        self.assertTrue(any('longer than 20' in m for m in messages))
        self.assertTrue(any('exit this block no longer has' in m for m in messages))
        self.assertTrue(any('never be reached' in m for m in messages))
