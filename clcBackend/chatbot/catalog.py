"""The node types an administrator can place in a flow.

This catalog is the single source of truth: the engine runs these types, the validator checks
them, and the flow builder (GET /api/chatbot/node-types/) draws its palette and settings panels
from it. Adding a node type = add it here + a handler in nodes.py.

Field kinds the builder knows how to edit:
  text_i18n  a text per language (sw / en / zh); `max` is WhatsApp's character limit
  variable   a variable name such as `full_name`
  number, text, select
  options    choices; each becomes an exit of the node
  rules      condition rules; each becomes an exit, plus "else"
  flow       another flow (for Go to flow)
"""

CATEGORIES = [
    {'id': 'say', 'label': 'Say'},
    {'id': 'ask', 'label': 'Ask'},
    {'id': 'logic', 'label': 'Logic'},
    {'id': 'system', 'label': 'CLC system'},
    {'id': 'end', 'label': 'Finish'},
]

NEXT = {'kind': 'static', 'ports': [{'id': 'next', 'label': 'Next'}]}

CLIENT_TEXT_FIELDS = [
    {'value': '', 'label': "Don't save to the client"},
    {'value': 'full_name', 'label': "Client's full name"},
    {'value': 'region', 'label': "Client's region"},
    {'value': 'email', 'label': "Client's email"},
]

NODE_TYPES = {
    'start': {
        'label': 'Start', 'category': None, 'icon': 'play',
        'description': 'Where the flow begins. What starts it is set under Triggers.',
        'fields': [], 'outputs': NEXT, 'singleton': True, 'deletable': False,
    },
    'message': {
        'label': 'Message', 'category': 'say', 'icon': 'message-square',
        'description': 'Send a text, then continue.',
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Message', 'required': True, 'max': 4096, 'multiline': True},
        ],
        'outputs': NEXT,
    },
    'ask_text': {
        'label': 'Ask a question', 'category': 'ask', 'icon': 'text-cursor-input', 'waits': True,
        'description': 'Ask something and save the typed answer.',
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Question', 'required': True, 'max': 4096, 'multiline': True},
            {'key': 'save_as', 'kind': 'variable', 'label': 'Save the answer as', 'required': True},
            {'key': 'min_length', 'kind': 'number', 'label': 'Minimum characters', 'min': 1, 'default': 1},
            {'key': 'error_text', 'kind': 'text_i18n', 'label': 'If the answer is too short, say', 'max': 1000},
            {'key': 'save_to_client', 'kind': 'select', 'label': 'Also save on the client record',
             'options': CLIENT_TEXT_FIELDS, 'default': ''},
        ],
        'outputs': NEXT,
    },
    'ask_buttons': {
        'label': 'Buttons', 'category': 'ask', 'icon': 'square-mouse-pointer', 'waits': True,
        'description': 'Up to 3 buttons. Each button can lead somewhere different.',
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Message above the buttons', 'required': True, 'max': 1024, 'multiline': True},
            {'key': 'options', 'kind': 'options', 'label': 'Buttons', 'min': 1, 'max': 3, 'title_max': 20},
            {'key': 'save_as', 'kind': 'variable', 'label': "Save the chosen button's value as"},
            {'key': 'save_to_client', 'kind': 'select', 'label': 'Also save on the client record', 'default': '',
             'options': [{'value': '', 'label': "Don't save to the client"},
                         {'value': 'preferred_language', 'label': "Client's language (values sw, en, zh)"}]},
        ],
        'outputs': {'kind': 'options', 'field': 'options'},
    },
    'ask_list': {
        'label': 'List menu', 'category': 'ask', 'icon': 'list', 'waits': True,
        'description': 'A menu of up to 10 choices. Each choice can lead somewhere different.',
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Message above the menu', 'required': True, 'max': 1024, 'multiline': True},
            {'key': 'button_label', 'kind': 'text_i18n', 'label': 'Menu button label', 'required': True, 'max': 20},
            {'key': 'section_title', 'kind': 'text_i18n', 'label': 'Menu heading', 'max': 24},
            {'key': 'options', 'kind': 'options', 'label': 'Choices', 'min': 1, 'max': 10, 'title_max': 24,
             'description': True, 'description_max': 72},
            {'key': 'save_as', 'kind': 'variable', 'label': "Save the chosen value as"},
        ],
        'outputs': {'kind': 'options', 'field': 'options'},
    },
    'ask_file': {
        'label': 'Ask for documents', 'category': 'ask', 'icon': 'paperclip', 'waits': True,
        'description': 'Collect photos or PDFs until the client taps Done. Files are attached to the case.',
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Request', 'required': True, 'max': 1024, 'multiline': True},
            {'key': 'done_label', 'kind': 'text_i18n', 'label': '"Done" button', 'required': True, 'max': 20},
            {'key': 'skip_label', 'kind': 'text_i18n', 'label': '"No documents" button', 'required': True, 'max': 20},
        ],
        'outputs': NEXT,
    },
    'condition': {
        'label': 'Condition', 'category': 'logic', 'icon': 'git-branch',
        'description': 'Go a different way depending on an answer. The first rule that matches wins.',
        'fields': [{'key': 'rules', 'kind': 'rules', 'label': 'Rules'}],
        'outputs': {'kind': 'rules', 'field': 'rules', 'else': {'id': 'else', 'label': 'Otherwise'}},
    },
    'set_variable': {
        'label': 'Set variable', 'category': 'logic', 'icon': 'variable',
        'description': 'Store a value for later, e.g. a service code.',
        'fields': [
            {'key': 'name', 'kind': 'variable', 'label': 'Variable', 'required': True},
            {'key': 'value', 'kind': 'text', 'label': 'Value (can use {{variables}})'},
        ],
        'outputs': NEXT,
    },
    'go_to_flow': {
        'label': 'Go to flow', 'category': 'logic', 'icon': 'workflow',
        'description': 'Run another published flow, then come back here.',
        'fields': [{'key': 'flow_id', 'kind': 'flow', 'label': 'Flow', 'required': True}],
        'outputs': {'kind': 'static', 'ports': [{'id': 'next', 'label': 'After it ends'}]},
    },
    'create_case': {
        'label': 'Create case', 'category': 'system', 'icon': 'briefcase',
        'description': 'Save everything collected as a new case for CLC to review. Sets {{reference}}.',
        'fields': [
            {'key': 'service_variable', 'kind': 'variable', 'label': 'Variable holding the service code', 'default': 'service'},
            {'key': 'summary_variable', 'kind': 'variable', 'label': 'Variable holding the description', 'default': 'description'},
            {'key': 'region_variable', 'kind': 'variable', 'label': 'Variable holding the region', 'default': 'region'},
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Confirmation (use {{reference}})', 'max': 4096, 'multiline': True},
        ],
        'outputs': NEXT,
    },
    'case_status': {
        'label': 'Case status', 'category': 'system', 'icon': 'search',
        'description': "Tell the client the status of their latest cases.",
        'fields': [
            {'key': 'text', 'kind': 'text_i18n', 'label': 'Heading', 'max': 500},
        ],
        'outputs': NEXT,
    },
    'handover': {
        'label': 'Hand over to CLC', 'category': 'end', 'icon': 'headset',
        'description': 'Stop the bot. The chat waits for a CLC Admin in Conversations.',
        'fields': [{'key': 'text', 'kind': 'text_i18n', 'label': 'Message to the client', 'max': 4096, 'multiline': True}],
        'outputs': {'kind': 'none'},
    },
    'end': {
        'label': 'End', 'category': 'end', 'icon': 'flag',
        'description': 'Finish the flow (or return to the flow that called it).',
        'fields': [{'key': 'text', 'kind': 'text_i18n', 'label': 'Last message (optional)', 'max': 4096, 'multiline': True}],
        'outputs': {'kind': 'none'},
    },
}

TRIGGER_TYPES = [
    {'id': 'new_conversation', 'label': 'New conversation',
     'description': 'Someone writes and no other flow is running and no keyword matched.'},
    {'id': 'keyword', 'label': 'Keyword or link code',
     'description': 'The message is or contains certain words, e.g. "wosia", or a code from a website link.'},
]

CONDITION_OPERATORS = [
    {'id': 'equals', 'label': 'is'},
    {'id': 'not_equals', 'label': 'is not'},
    {'id': 'contains', 'label': 'contains'},
    {'id': 'is_empty', 'label': 'is empty', 'no_value': True},
    {'id': 'not_empty', 'label': 'is not empty', 'no_value': True},
    {'id': 'greater_than', 'label': 'is greater than'},
    {'id': 'less_than', 'label': 'is less than'},
]


def ports(node):
    """The exits of a node, as [(port_id, label)]."""
    spec = NODE_TYPES.get(node.get('type'), {}).get('outputs', {'kind': 'none'})
    data = node.get('data') or {}
    if spec['kind'] == 'static':
        return [(p['id'], p['label']) for p in spec['ports']]
    if spec['kind'] == 'options':
        return [(o.get('id'), (o.get('title') or {}).get('sw') or (o.get('title') or {}).get('en') or f'Choice {i}')
                for i, o in enumerate(data.get(spec['field'], []) or [], 1)]
    if spec['kind'] == 'rules':
        return [(r.get('id'), f"{r.get('variable')} {r.get('operator')} {r.get('value', '')}".strip())
                for r in data.get(spec['field'], []) or []] + [(spec['else']['id'], spec['else']['label'])]
    return []


def catalog():
    """What GET /api/chatbot/node-types/ returns."""
    return {
        'categories': CATEGORIES,
        'node_types': [{'type': k, **v} for k, v in NODE_TYPES.items()],
        'trigger_types': TRIGGER_TYPES,
        'operators': CONDITION_OPERATORS,
        'languages': [{'id': 'sw', 'label': 'Kiswahili'}, {'id': 'en', 'label': 'English'}, {'id': 'zh', 'label': '中文'}],
    }
