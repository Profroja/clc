"""Checks a flow before it is published. Errors block publishing; warnings don't.

WhatsApp rejects interactive messages that break its limits (3 buttons, 10 list rows,
title lengths), so those are errors here rather than surprises in production.
"""
import re

from .botsettings import clean_emails
from .catalog import NODE_TYPES, ports
from .i18n import LANGS, placeholders

VARIABLE = re.compile(r'^[a-z_][a-z0-9_]{0,39}$')
RESERVED = {'files', 'reference'}  # set by the engine itself
PLACEHOLDER_ALLOWANCE = 20       # characters a {{variable}} may expand to, when checking limits


def _issue(level, message, node=None, field=None):
    return {'level': level, 'message': message, 'node': node, 'field': field}


def _texts(value):
    if isinstance(value, dict):
        return {k: v for k, v in value.items() if k in LANGS and isinstance(v, str)}
    if isinstance(value, str):
        return {'all': value}
    return {}


def validate(definition, *, flow_id=None, lookup_flow=None, lookup_media=None, languages=('sw', 'en')):
    """lookup_flow(flow_id) -> {"name", "published"} or None (for Go to flow);
    lookup_media(asset_id) -> truthy if the file still exists (for Send file)."""
    issues = []
    if not isinstance(definition, dict):
        return [_issue('error', 'The flow is not a valid definition.')]
    nodes = definition.get('nodes') or []
    edges = definition.get('edges') or []
    by_id = {}
    for n in nodes:
        if not isinstance(n, dict) or not n.get('id'):
            issues.append(_issue('error', 'A block has no id.'))
            continue
        if n['id'] in by_id:
            issues.append(_issue('error', 'Two blocks share the same id.', n['id']))
        by_id[n['id']] = n

    starts = [n for n in by_id.values() if n.get('type') == 'start']
    if len(starts) != 1:
        issues.append(_issue('error', 'A flow needs exactly one Start block.'))

    for n in by_id.values():
        issues += _check_node(n, flow_id, lookup_flow, lookup_media, languages)

    # --- edges ---
    seen = set()
    targeted = set()
    for e in edges:
        src, tgt, port = e.get('source'), e.get('target'), e.get('sourceHandle') or 'next'
        if src not in by_id or tgt not in by_id:
            issues.append(_issue('error', 'An arrow points to a block that no longer exists.', src))
            continue
        if by_id[tgt].get('type') == 'start':
            issues.append(_issue('error', 'Nothing can lead back into Start.', src))
        if port not in {p for p, _ in ports(by_id[src])}:
            issues.append(_issue('error', 'An arrow leaves from an exit this block no longer has.', src))
        if (src, port) in seen:
            issues.append(_issue('error', 'One exit has two arrows; each exit can lead to one block only.', src))
        seen.add((src, port))
        targeted.add(tgt)

    for n in by_id.values():
        for port, label in ports(n):
            if (n['id'], port) not in seen:
                if n.get('type') == 'start':
                    issues.append(_issue('error', 'Start is not connected to anything.', n['id']))
                else:
                    issues.append(_issue('warning', f'Exit "{label}" goes nowhere, so the flow ends there.', n['id']))

    # --- reachability ---
    if len(starts) == 1:
        reach, todo = set(), [starts[0]['id']]
        adjacency = {}
        for e in edges:
            adjacency.setdefault(e.get('source'), []).append(e.get('target'))
        while todo:
            cur = todo.pop()
            if cur in reach:
                continue
            reach.add(cur)
            todo += adjacency.get(cur, [])
        for n in by_id.values():
            if n['id'] not in reach:
                issues.append(_issue('warning', 'This block can never be reached from Start.', n['id']))
    return issues


def _check_node(n, flow_id, lookup_flow, lookup_media, languages):
    issues = []
    spec = NODE_TYPES.get(n.get('type'))
    nid = n['id']
    if spec is None:
        return [_issue('error', f'Unknown block type "{n.get("type")}".', nid)]
    data = n.get('data') or {}

    for f in spec['fields']:
        key, kind, value = f['key'], f['kind'], data.get(f['key'])
        label = f['label']
        if kind == 'text_i18n':
            texts = _texts(value)
            filled = {k: v for k, v in texts.items() if v.strip()}
            if f.get('required') and not filled:
                issues.append(_issue('error', f'{label} is empty.', nid, key))
            elif filled and f.get('required'):
                missing = [lang for lang in languages if not texts.get(lang, '').strip() and 'all' not in texts]
                if missing:
                    issues.append(_issue('warning', f'{label} has no {", ".join(missing).upper()} text yet.', nid, key))
            for lang, v in filled.items():
                limit = f.get('max')
                size = len(v) + PLACEHOLDER_ALLOWANCE * len(placeholders(v))
                if limit and size > limit:
                    issues.append(_issue('error', f'{label} ({lang.upper()}) is longer than WhatsApp allows ({limit} characters).', nid, key))
        elif kind == 'variable':
            if f.get('required') and not value:
                issues.append(_issue('error', f'{label} is empty.', nid, key))
            elif value and not VARIABLE.match(value):
                issues.append(_issue('error', f'{label}: use lowercase letters, digits and _ only (e.g. full_name).', nid, key))
            elif value in RESERVED and n.get('type') != 'create_case':
                issues.append(_issue('error', f'{label}: "{value}" is reserved by the engine.', nid, key))
        elif kind == 'options':
            options = value or []
            if not f.get('min', 0) <= len(options) <= f.get('max', 99):
                issues.append(_issue('error', f'{label}: needs {f.get("min", 0)} to {f["max"]}, has {len(options)}.', nid, key))
            ids = [o.get('id') for o in options]
            if len(ids) != len(set(ids)) or not all(ids):
                issues.append(_issue('error', f'{label}: every choice needs its own id.', nid, key))
            for i, o in enumerate(options, start=1):
                titles = {k: v for k, v in _texts(o.get('title')).items() if v.strip()}
                if not titles:
                    issues.append(_issue('error', f'{label}: choice {i} has no title.', nid, key))
                for lang, v in titles.items():
                    if len(v) > f['title_max']:
                        issues.append(_issue('error', f'{label}: choice {i} ({lang.upper()}) is longer than {f["title_max"]} characters.', nid, key))
                for lang, v in _texts(o.get('description')).items():
                    if len(v) > f.get('description_max', 72):
                        issues.append(_issue('error', f'{label}: choice {i} description ({lang.upper()}) is too long.', nid, key))
        elif kind == 'rules':
            rules = value or []
            if not rules:
                issues.append(_issue('warning', 'No rules yet: everything goes to "Otherwise".', nid, key))
            ids = [r.get('id') for r in rules]
            if len(ids) != len(set(ids)) or not all(ids) or 'else' in ids:
                issues.append(_issue('error', 'Every rule needs its own id.', nid, key))
            for i, r in enumerate(rules, start=1):
                if not r.get('variable') or not VARIABLE.match(r.get('variable', '')):
                    issues.append(_issue('error', f'Rule {i}: choose a variable.', nid, key))
                if r.get('operator') not in {'equals', 'not_equals', 'contains', 'is_empty', 'not_empty',
                                             'greater_than', 'less_than'}:
                    issues.append(_issue('error', f'Rule {i}: choose a comparison.', nid, key))
        elif kind == 'flow':
            if f.get('required') and not value:
                issues.append(_issue('error', f'{label}: choose a flow.', nid, key))
            elif value and flow_id and str(value) == str(flow_id):
                issues.append(_issue('error', 'A flow cannot go to itself.', nid, key))
            elif value and lookup_flow:
                target = lookup_flow(value)
                if target is None:
                    issues.append(_issue('error', 'The chosen flow no longer exists.', nid, key))
                elif not target.get('published'):
                    issues.append(_issue('error', f'"{target["name"]}" is not published yet.', nid, key))
        elif kind == 'media':
            chosen = {k: v for k, v in _texts(value).items() if v}
            if f.get('required') and not chosen:
                issues.append(_issue('error', f'{label}: choose a file.', nid, key))
            for lang, asset_id in chosen.items():
                if lookup_media and not lookup_media(asset_id):
                    issues.append(_issue('error', f'{label} ({lang.upper()}) was deleted from Bot files.', nid, key))
        elif kind == 'emails':
            _, problem = clean_emails(value or '')
            if problem:
                issues.append(_issue('error', f'{label}: {problem}', nid, key))
        elif kind == 'text':
            if f.get('required') and not (value or '').strip():
                issues.append(_issue('error', f'{label} is empty.', nid, key))
        elif kind == 'number' and value not in (None, ''):
            try:
                if int(value) < f.get('min', 0):
                    raise ValueError
            except (TypeError, ValueError):
                issues.append(_issue('error', f'{label} must be a whole number of at least {f.get("min", 0)}.', nid, key))
    return issues


def has_errors(issues):
    return any(i['level'] == 'error' for i in issues)
