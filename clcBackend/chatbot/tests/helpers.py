import hashlib
import hmac
import itertools
import json
import time

from accounts.models import Membership, MembershipStatus, Organization, OrgStatus, OrgType, User

SECRET = 'test-app-secret'
_ids = itertools.count(1)


def make_org_users():
    clc = Organization.objects.create(type=OrgType.CLC, name='Community Legal Clinic', status=OrgStatus.APPROVED)
    firm = Organization.objects.create(type=OrgType.LAW_FIRM, name='PNJ Legal Consultants', status=OrgStatus.APPROVED)
    admin = User.objects.create_user('admin@clc.tz', 'S3cure-pass!', full_name='Amina Admin')
    Membership.objects.create(user=admin, organization=clc, role='clc_admin', status=MembershipStatus.ACTIVE)
    Membership.objects.create(user=admin, organization=firm, role='firm_admin', status=MembershipStatus.ACTIVE)
    return clc, firm, admin


def sign_in(client, email, password, role):
    """Real login + 'Working as' through the accounts API; returns the portal access token."""
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, content_type='application/json')
    data = res.json()
    membership = next(m for m in data['memberships'] if m['role'] == role)
    res = client.post('/api/auth/select-role/', {'membership_id': membership['id']}, content_type='application/json',
                      headers={'Authorization': f"Bearer {data['pick_role_token']}"})
    return res.json()['access']


def envelope(messages=(), statuses=(), wa='255700000001', name='Feith M.'):
    value = {'messaging_product': 'whatsapp', 'metadata': {'phone_number_id': 'PNID'}}
    if messages:
        value['contacts'] = [{'profile': {'name': name}, 'wa_id': wa}]
        value['messages'] = list(messages)
    if statuses:
        value['statuses'] = list(statuses)
    return {'object': 'whatsapp_business_account',
            'entry': [{'id': 'WABA', 'changes': [{'field': 'messages', 'value': value}]}]}


def signed(body, secret=SECRET):
    raw = json.dumps(body).encode()
    return raw, 'sha256=' + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def wa_msg(kind, wa='255700000001', **data):
    m = {'from': wa, 'id': f'wamid.in.{next(_ids)}', 'timestamp': str(int(time.time())), 'type': kind}
    m.update(data)
    return m


def wa_text(body, wa='255700000001'):
    return wa_msg('text', wa, text={'body': body})


def wa_tap(button_id, title='x', wa='255700000001'):
    return wa_msg('interactive', wa, interactive={'type': 'button_reply', 'button_reply': {'id': button_id, 'title': title}})


def wa_pick(row_id, title='x', wa='255700000001'):
    return wa_msg('interactive', wa, interactive={'type': 'list_reply', 'list_reply': {'id': row_id, 'title': title}})


def wa_photo(wa='255700000001'):
    return wa_msg('image', wa, image={'id': f'media-{next(_ids)}', 'mime_type': 'image/jpeg'})
