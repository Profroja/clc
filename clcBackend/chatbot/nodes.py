"""What each node type does when the conversation reaches it (enter) and when the client
replies to it (receive). Pure functions over a Ctx: no database access here."""
from dataclasses import dataclass, field

from .i18n import LANGS, STATUS_WORDS, SYSTEM, fill, pick

DONE, SKIP = '__done', '__skip'


@dataclass
class Step:
    messages: list = field(default_factory=list)
    port: str | None = None        # continue through this exit
    wait: bool = False             # stop here until the client replies
    end: str | None = None         # 'completed' | 'handoff'
    goto_flow: str | None = None   # run another flow, then come back


class Ctx:
    def __init__(self, variables, effects):
        self.vars = variables
        self.effects = effects

    @property
    def lang(self):
        return self.vars.get('lang') if self.vars.get('lang') in LANGS else 'sw'

    def t(self, value, **extra):
        return fill(pick(value, self.lang), {**self.vars, **extra})


# --- abstract messages; channel adapters (whatsapp.py, the builder) render them ---

def text(body):
    return {'type': 'text', 'text': body}


def buttons(body, items):
    return {'type': 'buttons', 'text': body, 'buttons': items}


def menu(body, button, section, rows):
    return {'type': 'list', 'text': body, 'button': button, 'section': section, 'rows': rows}


def _norm(s):
    return ' '.join((s or '').lower().split())


def _choose(options, event, ctx):
    """The option the client picked: tapped id, typed title (any language), value or number."""
    if event.get('kind') == 'choice':
        return next((o for o in options if o.get('id') == event.get('choice_id')), None)
    if event.get('kind') == 'text':
        typed = _norm(event.get('text'))
        for i, o in enumerate(options, start=1):
            titles = [_norm(v) for v in (o.get('title') or {}).values() if v]
            if typed and (typed in titles or typed == _norm(o.get('value')) or typed == str(i)):
                return o
    return None


# --- node types --------------------------------------------------------------

class Node:
    def enter(self, node, ctx):
        raise NotImplementedError

    def receive(self, node, ctx, event):  # only for nodes that wait
        raise NotImplementedError


class Start(Node):
    def enter(self, node, ctx):
        return Step(port='next')


class Message(Node):
    def enter(self, node, ctx):
        return Step(messages=[text(ctx.t(node['data'].get('text')))], port='next')


class AskText(Node):
    def enter(self, node, ctx):
        return Step(messages=[text(ctx.t(node['data'].get('text')))], wait=True)

    def receive(self, node, ctx, event):
        d = node['data']
        if event.get('kind') != 'text':
            return Step(messages=[text(ctx.t(SYSTEM['type_answer']) + '\n\n' + ctx.t(d.get('text')))], wait=True)
        value = (event.get('text') or '').strip()
        if len(value) < int(d.get('min_length') or 1):
            error = ctx.t(d.get('error_text')) or ctx.t(SYSTEM['too_short'])
            return Step(messages=[text(error)], wait=True)
        ctx.vars[d['save_as']] = value[:2000]
        if d.get('save_to_client'):
            ctx.effects.set_client(d['save_to_client'], value)
        return Step(port='next')


class AskButtons(Node):
    def render(self, node, ctx, prefix=None):
        d = node['data']
        body = ctx.t(d.get('text'))
        if prefix:
            body = f'{prefix}\n\n{body}'
        return buttons(body, [{'id': o['id'], 'title': ctx.t(o.get('title'))} for o in d.get('options', [])])

    def enter(self, node, ctx):
        return Step(messages=[self.render(node, ctx)], wait=True)

    def receive(self, node, ctx, event):
        d = node['data']
        option = _choose(d.get('options', []), event, ctx)
        if option is None:
            return Step(messages=[self.render(node, ctx, prefix=ctx.t(SYSTEM['choose']))], wait=True)
        value = option.get('value') or option['id']
        if d.get('save_as'):
            ctx.vars[d['save_as']] = value
        if d.get('save_to_client') == 'preferred_language' and value in LANGS:
            ctx.vars['lang'] = value
            ctx.effects.set_client('preferred_language', value)
        return Step(port=option['id'])


class AskList(AskButtons):
    def render(self, node, ctx, prefix=None):
        d = node['data']
        body = ctx.t(d.get('text'))
        if prefix:
            body = f'{prefix}\n\n{body}'
        rows = []
        for o in d.get('options', []):
            row = {'id': o['id'], 'title': ctx.t(o.get('title'))}
            if pick(o.get('description'), ctx.lang):
                row['description'] = ctx.t(o.get('description'))
            rows.append(row)
        return menu(body, ctx.t(d.get('button_label')), ctx.t(d.get('section_title')), rows)


class AskFile(Node):
    def render(self, node, ctx, prefix=None):
        d = node['data']
        body = ctx.t(d.get('text'))
        if prefix:
            body = f'{prefix}\n\n{body}'
        return buttons(body, [{'id': DONE, 'title': ctx.t(d.get('done_label'))},
                              {'id': SKIP, 'title': ctx.t(d.get('skip_label'))}])

    def enter(self, node, ctx):
        return Step(messages=[self.render(node, ctx)], wait=True)

    def receive(self, node, ctx, event):
        d = node['data']
        if event.get('kind') == 'file':
            if not event.get('file'):
                return Step(messages=[text(ctx.t(SYSTEM['file_failed']))], wait=True)
            ctx.vars.setdefault('files', []).append(event['file'])
            received = ctx.t(SYSTEM['file_received'], count=len(ctx.vars['files']))
            return Step(messages=[self.render(node, ctx, prefix=received)], wait=True)
        labels = {_norm(v) for key in ('done_label', 'skip_label') for v in (d.get(key) or {}).values() if v}
        if (event.get('kind') == 'choice' and event.get('choice_id') in (DONE, SKIP)) or (
                event.get('kind') == 'text' and _norm(event.get('text')) in labels):
            return Step(port='next')
        return Step(messages=[self.render(node, ctx, prefix=ctx.t(SYSTEM['send_file']))], wait=True)


def _number(v):
    try:
        return float(str(v).replace(',', ''))
    except (TypeError, ValueError):
        return None


def rule_matches(rule, variables):
    actual = variables.get(rule.get('variable'))
    actual_s = '' if actual is None else str(actual)
    expected = fill(str(rule.get('value', '')), variables)
    op = rule.get('operator')
    if op == 'equals':
        return _norm(actual_s) == _norm(expected)
    if op == 'not_equals':
        return _norm(actual_s) != _norm(expected)
    if op == 'contains':
        return _norm(expected) in _norm(actual_s)
    if op == 'is_empty':
        return actual_s.strip() == ''
    if op == 'not_empty':
        return actual_s.strip() != ''
    if op in ('greater_than', 'less_than'):
        a, b = _number(actual_s), _number(expected)
        if a is None or b is None:
            return False
        return a > b if op == 'greater_than' else a < b
    return False


class Condition(Node):
    def enter(self, node, ctx):
        for rule in node['data'].get('rules', []):
            if rule_matches(rule, ctx.vars):
                return Step(port=rule['id'])
        return Step(port='else')


class SetVariable(Node):
    def enter(self, node, ctx):
        d = node['data']
        ctx.vars[d['name']] = fill(str(d.get('value', '')), ctx.vars)
        return Step(port='next')


class GoToFlow(Node):
    def enter(self, node, ctx):
        return Step(goto_flow=node['data'].get('flow_id'))


class CreateCase(Node):
    def enter(self, node, ctx):
        d = node['data']
        answers = {k: v for k, v in ctx.vars.items() if k != 'files'}
        reference = ctx.effects.create_case(
            service_code=ctx.vars.get(d.get('service_variable') or 'service'),
            summary=ctx.vars.get(d.get('summary_variable') or 'description'),
            region=ctx.vars.get(d.get('region_variable') or 'region'),
            answers=answers, files=ctx.vars.get('files', []),
        )
        ctx.vars['reference'] = reference
        ctx.vars['files'] = []
        messages = [text(ctx.t(d['text']))] if pick(d.get('text'), ctx.lang) else []
        return Step(messages=messages, port='next')


class CaseStatus(Node):
    def enter(self, node, ctx):
        rows = ctx.effects.case_status()
        if not rows:
            return Step(messages=[text(ctx.t(SYSTEM['no_cases']))], port='next')
        lines = [ctx.t(node['data'].get('text'))] if pick(node['data'].get('text'), ctx.lang) else []
        for r in rows:
            words = ctx.t(STATUS_WORDS.get(r['status'], r['status']), firm=r.get('firm') or 'CLC')
            lines.append(f"{r['reference']}: {words}")
        return Step(messages=[text('\n'.join(lines))], port='next')


class Handover(Node):
    def enter(self, node, ctx):
        ctx.effects.handover()
        messages = [text(ctx.t(node['data']['text']))] if pick(node['data'].get('text'), ctx.lang) else []
        return Step(messages=messages, end='handoff')


class End(Node):
    def enter(self, node, ctx):
        messages = [text(ctx.t(node['data']['text']))] if pick(node['data'].get('text'), ctx.lang) else []
        return Step(messages=messages, port=None)  # no exit: flow ends, or returns to its caller


HANDLERS = {
    'start': Start(), 'message': Message(), 'ask_text': AskText(), 'ask_buttons': AskButtons(),
    'ask_list': AskList(), 'ask_file': AskFile(), 'condition': Condition(), 'set_variable': SetVariable(),
    'go_to_flow': GoToFlow(), 'create_case': CreateCase(), 'case_status': CaseStatus(),
    'handover': Handover(), 'end': End(),
}
