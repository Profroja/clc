"""Bot-wide settings the admin edits once and every flow uses: opening hours and the staff
who receive Notify staff emails."""
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

TZ = ZoneInfo('Africa/Dar_es_Salaam')
DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
DAY_LABELS = {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday',
              'sat': 'Saturday', 'sun': 'Sunday'}
TIME = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
EMAIL = re.compile(r'^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$')

DEFAULTS = {
    # days: list of [from, to] periods per weekday, "HH:MM" in East Africa Time; [] = closed
    'business_hours': {
        'days': {d: [['09:00', '17:00']] for d in DAYS[:5]} | {'sat': [], 'sun': []},
        'closed_dates': [],  # public holidays, "YYYY-MM-DD"
    },
    'staff_emails': [],
}


def get(key):
    from .models import BotSetting
    row = BotSetting.objects.filter(key=key).first()
    return row.value if row else DEFAULTS[key]


def put(key, value):
    from .models import BotSetting
    BotSetting.objects.update_or_create(key=key, defaults={'value': value})


def clean_hours(raw):
    """Returns (hours, error)."""
    if not isinstance(raw, dict) or not isinstance(raw.get('days'), dict):
        return None, 'business_hours must be {"days": {...}, "closed_dates": [...]}'
    days = {}
    for d in DAYS:
        periods = raw['days'].get(d) or []
        clean = []
        for p in periods:
            if not (isinstance(p, (list, tuple)) and len(p) == 2 and all(isinstance(t, str) and TIME.match(t) for t in p)):
                return None, f'{DAY_LABELS[d]}: times must look like 09:00.'
            if p[0] >= p[1]:
                return None, f'{DAY_LABELS[d]}: closing time must be after opening time.'
            clean.append([p[0], p[1]])
        days[d] = sorted(clean)
    dates = sorted({x.strip() for x in raw.get('closed_dates') or [] if isinstance(x, str) and x.strip()})
    bad = [x for x in dates if not DATE.match(x)]
    if bad:
        return None, f'Closed dates must look like 2026-12-25 ({bad[0]}).'
    return {'days': days, 'closed_dates': dates}, None


def clean_emails(raw):
    """A list or a comma/space separated string -> (emails, error)."""
    items = raw if isinstance(raw, list) else re.split(r'[\s,;]+', raw or '')
    emails = []
    for e in items:
        e = (e or '').strip().lower()
        if not e:
            continue
        if not EMAIL.match(e):
            return None, f'"{e}" is not an email address.'
        if e not in emails:
            emails.append(e)
    return emails, None


def is_open(hours, now=None):
    local = (now or timezone.now()).astimezone(TZ)
    if local.strftime('%Y-%m-%d') in (hours.get('closed_dates') or []):
        return False
    hhmm = local.strftime('%H:%M')
    return any(start <= hhmm < end for start, end in (hours.get('days') or {}).get(DAYS[local.weekday()], []))


def describe(hours):
    """"Mon–Fri 09:00–18:00 · Sat 09:00–13:30" for the builder."""
    def periods(d):
        return ', '.join(f'{a}–{b}' for a, b in hours['days'].get(d, [])) or None
    parts, i = [], 0
    while i < 7:
        j = i
        while j + 1 < 7 and periods(DAYS[j + 1]) == periods(DAYS[i]):
            j += 1
        if periods(DAYS[i]):
            name = DAY_LABELS[DAYS[i]][:3] + ('' if i == j else '–' + DAY_LABELS[DAYS[j]][:3])
            parts.append(f'{name} {periods(DAYS[i])}')
        i = j + 1
    return ' · '.join(parts) or 'Always closed'


def now_local():
    return datetime.now(TZ)
