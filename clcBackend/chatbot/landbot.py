"""CLC's WhatsApp bot, rebuilt from the Landbot bot "LEGAL SERVICES - 2025/2026"
(docs/landbot/). `python manage.py import_landbot` loads it.

Three flows replace Landbot's 284 blocks:
- MAIN: hours check, welcome, language, menu (TSA / Legal services / Kiapo cha Majina).
- KIAPO: Kiapo cha Majina (NSSF, NIDA, NECTA). Swahili only, as in Landbot.
- WRAP_UP: every request ends here. Open: case + email staff + hand over to an agent.
  Closed: offline notice, the client leaves a message, case + email staff.

The English and Swahili copies of each Landbot branch are one branch here; every text holds
both languages. Unreachable Landbot blocks (the English deed-poll branch) are left out.
"""
from collections import deque

CHANNEL = 'https://whatsapp.com/channel/0029Va8djEOE50Uc7HAtew1X'
CALENDLY = 'https://calendly.com/legalclinicclc/10min'

# Landbot file id -> (name in Bot files, file name). import_landbot loads them from a folder.
MEDIA = {
    'welcome_open': ('POMWRY0T6W0TZUEVQU2HLK62F6M0MN9B.png', 'Welcome picture (open hours)', 'clc-welcome.png'),
    'welcome_closed': ('KJ13UW0ZQ8Y84IFUL13Y9QLZ6UXKY68P.png', 'Welcome picture (closed)', 'clc-welcome-closed.png'),
    'tsa_image': ('QP73X467P2PCU9XPQUG9V39SBVY07XD1.jpg', 'TSA picture', 'clc-tsa.jpg'),
    'tsa_pdf_en': ('VL4PXV4O8ACADCOQBE2Z6M2570DTLA8G.pdf', 'TSA proposal (English)', 'CLC TSA Service Proposal.pdf'),
    'tsa_pdf_sw': ('O7NDEDOYP9BV1RTGCT1M4GOMWRUT5BXF.pdf', 'TSA proposal (Kiswahili)', 'CLC Pendekezo la Huduma ya TSA.pdf'),
    'will_pdf': ('DZAU2KDO4G2JVAD4V6JNAKR9KCIZQLED.pdf', 'Will template', 'CLC Will template.pdf'),
    'offices': ('V1LSLFIZSMM9ZMFKQS50OP0MMJE0AMJ9.png', 'Our offices (Dar es Salaam & Dodoma)', 'clc-offices.png'),
    'necta_pdf': ('1F8P02LLPQ4NCGROWCH6D4J2VAVHFLS3.pdf', 'NECTA name-correction guideline', 'NECTA mwongozo.pdf'),
}

SERVICES = [  # code, Kiswahili, English, sort order (codes already in the database are kept)
    ('tsa_miner', 'Mkataba wa Msaada wa Kiufundi (TSA)', 'Technical Support Agreement (TSA)', 1),
    ('land', 'Ardhi na mali', 'Land & property', 10),
    ('work_permit', 'Vibali vya kazi', 'Work permits', 11),
    ('mining_licence_transfer', 'Kuuza/kununua leseni ya madini', 'Transfer of mining licence (PML, PL)', 12),
    ('will', 'Uandishi wa wosia', 'Drafting a will', 13),
    ('company_registration', 'Usajili wa kampuni', 'Company registration', 14),
    ('annual_returns', 'Ripoti za mwaka za kampuni', 'Company annual returns', 15),
    ('mining_licence', 'Leseni za madini', 'Mining licences', 16),
    ('deed_poll', 'Kiapo cha majina (Deed Poll)', 'Change of name (Deed Poll)', 20),
    ('general', 'Huduma nyingine za kisheria', 'Other legal services', 90),
]


def t(sw, en=None):
    return {'sw': sw, 'en': en} if en is not None else {'sw': sw}


def opt(id_, sw, en=None, value='', desc=None):
    o = {'id': id_, 'value': value, 'title': t(sw, en)}
    if desc:
        o['description'] = t(*desc)
    return o


class Builder:
    """Nodes and arrows in the flow builder's format, laid out top to bottom."""

    def __init__(self):
        self.nodes, self.edges = [], []

    def add(self, id_, type_, **data):
        self.nodes.append({'id': id_, 'type': type_, 'position': {'x': 0, 'y': 0}, 'data': data})
        return id_

    def link(self, source, target, port='next'):
        self.edges.append({'id': f'e_{source}_{port}', 'source': source, 'sourceHandle': port, 'target': target})

    def build(self, languages):
        # Each block goes one row below the first block that leads to it; rows are centred.
        out = {}
        for e in self.edges:
            out.setdefault(e['source'], []).append(e['target'])
        depth, order, queue = {'start': 0}, ['start'], deque(['start'])
        while queue:
            cur = queue.popleft()
            for nxt in out.get(cur, []):
                if nxt not in depth:
                    depth[nxt] = depth[cur] + 1
                    order.append(nxt)
                    queue.append(nxt)
        rows = {}
        for nid in order:
            rows.setdefault(depth[nid], []).append(nid)
        pos = {}
        for d, ids in rows.items():
            for i, nid in enumerate(ids):
                pos[nid] = {'x': (i - (len(ids) - 1) / 2) * 300, 'y': d * 230}
        for n in self.nodes:
            n['position'] = pos.get(n['id'], {'x': 1400, 'y': 0})
        return {'nodes': self.nodes, 'edges': self.edges, 'settings': {'languages': list(languages)}}


# --- shared texts -------------------------------------------------------------------------

GOODBYE = t(
    f'Hakuna shida, {{{{client_name}}}}! Ikiwa utahitaji huduma zetu siku za usoni, usisite kuwasiliana nasi. '
    f'Uwe na siku njema! 😊\n\n📢 Jiunge na *WhatsApp Channel ya CLC* kwa taarifa za kisheria, huduma mpya na elimu '
    f'ya sheria moja kwa moja kwenye simu yako:\n👉 {CHANNEL}\n\nTuma *menu* wakati wowote kuanza upya.',
    f'No problem, {{{{client_name}}}}! If you ever need our services in the future, feel free to reach out. '
    f'Have a great day! 😊\n\nIn the meantime, you’re welcome to *join our WhatsApp Channel* for real-time updates, '
    f'announcements and helpful legal tips:\n👉 {CHANNEL}\n\nSend *menu* at any time to start again.')

CALENDLY_TEXT = t(
    f'📅 *Miadi kwa Simu*\n*Weka miadi yako sasa* (dakika 10)\nBofya kiungo hapa chini 👇🏽\n\n{CALENDLY}\n\n'
    '*Sera ya Kuhudhuria Mikutano*\nKwa ajili ya kuhakikisha ubora na ufanisi wa huduma zetu za kisheria, tafadhali '
    'zingatia yafuatayo:\n1. Wateja wanatakiwa kujiunga kwenye kikao cha dakika 10 kilichopangwa kwa wakati.\n'
    '2. Muda wa kusubiri wa dakika 5 unaruhusiwa. Iwapo mteja hatajiunga ndani ya dakika hizo na hatakuwa ametuma '
    'taarifa, kikao kitazingatiwa kuwa kimeshindikana.\n3. Mikutano iliyoshindikana italazimika kupangwa upya kupitia '
    'mfumo wetu rasmi wa kuweka miadi.\n4. Hatutozi ada yoyote kwa mikutano iliyoshindikana, lakini kuhudhuria kwa '
    'wakati ni muhimu ili kuhakikisha mwendelezo wa huduma bora kwa wateja wote.\nTunakushukuru kwa ushirikiano na '
    'uelewa wako.\n\n*TIMU YA CLC*',
    f'📅 *Phone Appointment*\n*Book your appointment now* (10 minutes)\nClick the link below 👇🏽\n\n{CALENDLY}\n\n'
    '*Client Meeting Policy*\nTo maintain the quality and efficiency of our legal services, please note the '
    'following:\n1. Clients are expected to join their scheduled 10-minute consultation on time.\n2. A grace period '
    'of 5 minutes is allowed. If the client has not joined within 5 minutes and no prior communication is received, '
    'the meeting will be considered missed.\n3. Missed meetings must be rescheduled through our official booking '
    'system to secure a new slot.\n4. We do not impose penalties for missed meetings; however, timely attendance is '
    'required to ensure service continuity for all clients.\nWe appreciate your cooperation and understanding.\n\n'
    '*CLC TEAM*')

OFFICE_TEXT = t(
    'Asante, {{client_name}}! Tumepokea ombi lako la kikao cha ana kwa ana na Wakili. Timu yetu ya huduma kwa wateja '
    'itawasiliana nawe muda mfupi ujao ili kukusaidia na taarifa zaidi.\n\nKwa sasa, tunayo ofisi *Dar es Salaam* na '
    '*Dodoma* kwa vikao vya ana kwa ana. Iwapo hutaweza kufika katika maeneo haya, timu yetu inaweza pia kukusaidia '
    'kupanga miadi ya mtandaoni.',
    'Thank you, {{client_name}}! We’ve received your request for a physical appointment. Our customer care team will '
    'contact you shortly to assist you with further details.\n\nCurrently, we have offices in *Dar es Salaam* and '
    '*Dodoma* for physical appointments. If you’re unable to visit these locations, our team can also help you '
    'schedule a virtual appointment.')

APPOINTMENT = dict(
    text=t('📢 *Taarifa ya Upatikanaji wa Huduma*\n\nKwa sasa, huduma zetu za kisheria zinapatikana *Dar es Salaam* na '
           '*Dodoma* pekee.\n\nUnaweza kuchagua:\n1. *Kutana na Wakili kwa njia ya simu au video* – BURE, lakini '
           'tunahudumia watu wasiozidi wanne (4) kwa siku.\n2. *Kutana na Wakili ofisini* – itahusisha gharama za '
           'kuonana na Wakili.\n\n📌 Tafadhali chagua hapo chini ili kuendelea.',
           '📢 *Service Availability Notice*\n\nAt the moment, our legal services are only available in *Dar es Salaam* '
           'and *Dodoma*.\n\nYou can choose:\n1. *Phone or video appointment* – FREE, but limited to four (4) '
           'clients a day.\n2. *Office appointment* – appointment fees apply.\n\n📌 Please select an option to '
           'continue.'),
    options=[opt('appt_phone', 'Kwa Simu - Bure', 'Phone - Free', 'phone'),
             opt('appt_office', 'Ofisini - Malipo', 'Office - Paid', 'office')],
    save_as='appointment',
)


def appointment_branch(b, prefix, media, wrap_up, what):
    """Phone (Calendly) or office (paid) appointment, then the wrap-up flow."""
    b.add(f'{prefix}_appt', 'ask_buttons', **APPOINTMENT)
    b.add(f'{prefix}_calendly', 'message', text=CALENDLY_TEXT)
    b.add(f'{prefix}_req_phone', 'set_variable', name='request', value=f'{what}: phone appointment (Calendly link sent)')
    b.add(f'{prefix}_offices', 'send_media', media=t(media['offices']), caption={})
    b.add(f'{prefix}_office_msg', 'message', text=OFFICE_TEXT)
    b.add(f'{prefix}_req_office', 'set_variable', name='request', value=f'{what}: office appointment (paid)')
    b.add(f'{prefix}_wrap', 'go_to_flow', flow_id=wrap_up)
    b.link(f'{prefix}_appt', f'{prefix}_calendly', 'appt_phone')
    b.link(f'{prefix}_appt', f'{prefix}_offices', 'appt_office')
    b.link(f'{prefix}_calendly', f'{prefix}_req_phone')
    b.link(f'{prefix}_req_phone', f'{prefix}_wrap')
    b.link(f'{prefix}_offices', f'{prefix}_office_msg')
    b.link(f'{prefix}_office_msg', f'{prefix}_req_office')
    b.link(f'{prefix}_req_office', f'{prefix}_wrap')
    return f'{prefix}_appt', f'{prefix}_wrap'


# --- flow 3: connect to staff, or leave a message -----------------------------------------

def wrap_up_flow():
    b = Builder()
    b.add('start', 'start')
    b.add('hours', 'business_hours')
    # open: case, email, agent
    b.add('case_open', 'create_case', service_variable='service', summary_variable='request', region_variable='region',
          text={})
    b.add('email_open', 'notify_staff', to='', include_answers='yes',
          subject='WhatsApp: {{request}} (within working hours)',
          body='A client finished the WhatsApp bot during working hours and is waiting in the chat for an agent.\n'
               'Please follow up by chat or phone, and add a private note on what was agreed.')
    b.add('handover', 'handover', text=t(
        '{{client_name}}, subiri kidogo; utaunganishwa na Mtoa Huduma hivi punde.\n'
        'Namba ya kumbukumbu: *{{reference}}*',
        '{{client_name}}, please wait a moment; you will be connected to Customer Care shortly.\n'
        'Your reference: *{{reference}}*'))
    # closed: leave a message
    b.add('offline', 'ask_buttons', save_as='leave_choice', text=t(
        '{{client_name}} 😔 *Timu yetu haipo ofisini kwa sasa.*\n\nTunapatikana siku za kazi zifuatazo:\n'
        '*Jumatatu hadi Ijumaa:* saa 3:00 asubuhi hadi saa 12:00 jioni (EAT)\n'
        '*Jumamosi:* saa 3:00 asubuhi hadi saa 7:30 mchana (EAT)\n*Jumapili:* hatufungui\n\n'
        'Tutafurahi kukuhudumia pindi tutakaporejea. Asante kwa subira yako!\n\n📌 Ungependa kufanya nini?',
        '{{client_name}} 😔 *Our team is currently offline.*\n\nWe are available during our working hours:\n'
        '*Monday to Friday:* 9:00 AM – 6:00 PM (EAT)\n*Saturday:* 9:00 AM – 1:30 PM (EAT)\n*Sunday:* closed\n\n'
        'We’ll be happy to help you once we’re back. Thank you for your patience!\n\n📌 What would you like to do?'),
        options=[opt('leave_message', 'Acha ujumbe', 'Leave a message', 'message'),
                 opt('leave_chat', 'Sitisha huduma', 'Leave chat', 'leave')])
    b.add('message', 'ask_text', save_as='user_message', min_length=2, save_to_client='', text=t(
        'Sawa, {{client_name}}! 💌 Tafadhali andika ujumbe wako hapo chini, na tutakujibu mara baada ya kuingia '
        'muda wa kazi.',
        'Got it, {{client_name}}! 💌 Please type your message below, and we’ll reply as soon as we’re back.'))
    b.add('case_closed', 'create_case', service_variable='service', summary_variable='user_message',
          region_variable='region', text={})
    b.add('email_closed', 'notify_staff', to='', include_answers='yes',
          subject='WhatsApp message outside working hours: {{request}}',
          body='A client left this message on WhatsApp outside working hours:\n\n"{{user_message}}"\n\n'
               'Please follow up by chat or phone once the office opens, and add a private note on what was agreed.')
    b.add('thanks', 'end', text=t(
        f'Asante, {{{{client_name}}}}! Tumepokea ujumbe wako (namba ya kumbukumbu *{{{{reference}}}}*). Tutakujibu '
        f'mara tu tutakaporejea ofisini.\n\nWakati huo, jiunge na WhatsApp Channel yetu kwa taarifa za kisheria:\n'
        f'👉 {CHANNEL}\n\n*Asante,*\n*TIMU YA CLC*',
        f'Thank you, {{{{client_name}}}}! We’ve received your message (reference *{{{{reference}}}}*). We’ll reply as '
        f'soon as we’re back in the office.\n\nIn the meantime, you’re welcome to join our WhatsApp Channel for '
        f'real-time updates and helpful legal tips:\n👉 {CHANNEL}\n\n*Best regards,*\n*CLC TEAM*'))
    b.add('bye', 'end', text=t(
        f'*Habari*, {{{{client_name}}}}. Asante kwa kuwasiliana nasi 😊! Tungependa sana kukuhudumia tunaporudi. '
        f'Tafadhali jisikie huru kuwasiliana nasi tena wakati wa saa zetu za kazi.\n\nJiunge na channel yetu kupata '
        f'taarifa za mara kwa mara: {CHANNEL}\n\n*Asante,*\n*TIMU YA CLC*',
        f'*Hello* {{{{client_name}}}}, thank you for reaching out 😊! We’d love to assist you when we’re back. Feel '
        f'free to reach out again during our working hours.\n\nIn the meantime, join our WhatsApp Channel for '
        f'real-time updates and helpful legal tips: {CHANNEL}\n\n*Best regards,*\n*CLC TEAM*'))
    b.link('start', 'hours')
    b.link('hours', 'case_open', 'open')
    b.link('hours', 'offline', 'closed')
    b.link('case_open', 'email_open')
    b.link('email_open', 'handover')
    b.link('offline', 'message', 'leave_message')
    b.link('offline', 'bye', 'leave_chat')
    b.link('message', 'case_closed')
    b.link('case_closed', 'email_closed')
    b.link('email_closed', 'thanks')
    return b.build(['sw', 'en'])


# --- flow 2: Kiapo cha Majina (Swahili only) -------------------------------------------------

NIDA_TOPICS = [
    # id, list title, guidance text, question, (yes -> , no ->), request
    ('nida_name', 'Kubadili Jina',
     '*📌 Mabadiliko ya Majina – NIDA*\n\n*Nani anahusika:* Mamlaka ya Vitambulisho vya Taifa (NIDA) ndiyo yenye '
     'jukumu la kushughulikia mabadiliko ya majina.\n\n*Nyaraka:*\n1. Cheti cha kuzaliwa / shule / kadi ya kliniki\n'
     '2. *Deed Poll* kutoka kwa wakili wa TLS\n3. Tangazo kwenye Gazeti la Serikali\n4. Cheti cha ndoa/talaka '
     '(ikihitajika)\n\n*Hatua:*\n1. Pata Deed Poll na usajili Wizara ya Ardhi\n2. Chapisha tangazo kwenye Gazeti\n'
     '3. Wasilisha nyaraka kwa Afisa Usajili\n4. Lipa Tsh 20,000 (bila malipo kama kosa ni la NIDA)\n5. Kamati ya '
     'Usajili itaamua\n\n*Unaweza kubadilisha:*\n• Jina la kwanza/kati/ukoo\n• Taarifa za ndoa/talaka\n'
     '• Taarifa za elimu au dini\n\n*❗ Muhimu:* Hakuna mabadiliko bila nyaraka sahihi.\n'
     '🔗 Zaidi: https://nida.go.tz/Mabadiliko-Majina',
     'Unahitaji Deed Poll kutoka kwa Wakili?', ('appointment', 'goodbye'), 'NIDA: kubadili jina'),
    ('nida_info', 'Rekebisha Taarifa',
     '*🔧 Marekebisho ya Taarifa – NIDA*\n\n*Mamlaka husika:* Mamlaka ya Vitambulisho vya Taifa (NIDA)\n\n'
     '*Nani anaweza kubadilisha taarifa?*\n• Aliyeoa/olewa na kubadili jina\n• Aliyetalikiwa kihalali\n'
     '• Aliyefanya makosa wakati wa usajili\n• Taarifa zilizokosewa na NIDA\n• Aliyetaka majina maarufu yawe rasmi\n'
     '• Anayetumia jina la ukoo la mzazi/babu\n\n*Taarifa zinazoruhusiwa kubadilishwa:*\n• Jina la kwanza, kati au '
     'ukoo\n• Tarehe & mwezi wa kuzaliwa\n• Anuani ya makazi\n• Namba ya simu (iliyowekwa kwa NIN)\n• Uraia (kwa '
     'waliobadili)\n• Hali ya ndoa\n• Kazi\n• Taarifa binafsi (Sehemu ya F ya Fomu Na. 47–58)\n\n*Taarifa zinazohitaji '
     'kibali maalum:*\n• Taarifa za wazazi\n• Makazi ya kudumu\n• Mahali pa kuzaliwa\n• Kubadilisha majina yote kwa '
     'pamoja\n• Mwaka wa kuzaliwa\n• Sahihi ya mwombaji\n\n📎 Zaidi tembelea: https://nida.go.tz/Usajili-Marekebisho',
     'Ungependa kuzungumza na Huduma kwa Wateja wa NIDA?', ('nida_contacts', 'goodbye'), 'NIDA: kurekebisha taarifa'),
    ('nida_birth', 'Badili Siku/Mwezi/Mwaka',
     '*📅 Marekebisho ya Tarehe/Mwezi/Mwaka wa Kuzaliwa – NIDA*\n\nNIDA inaruhusu marekebisho ya taarifa za '
     'kuzaliwa ikiwa kuna ushahidi halali.\n\nKwa *tarehe au mwezi wa kuzaliwa*, muombaji anatakiwa kuwasilisha:\n'
     '• Cheti cha kuzaliwa\n• *Tangazo la marekebisho kwenye Gazeti la Serikali*, linalothibitisha mabadiliko\n'
     '• Uthibitisho wa cheti kutoka RITA au ZCSRA (kama cheti kipya kinatofautiana na cha awali)\n• Ada ya Tsh '
     '20,000 (isipokuwa kama kosa ni la NIDA)\n\nKwa *mwaka wa kuzaliwa*, mabadiliko hayawezi kufanyika bila *kibali '
     'maalum* kutoka Kamati ya Usajili. Muombaji anatakiwa pia kuwasilisha tangazo kwenye *Gazeti la Serikali* '
     'pamoja na nyaraka kama vyeti vya shule, kadi ya kliniki, na cheti cha kuzaliwa cha awali.\n\n📌 *Tangazo '
     'kwenye Gazeti la Serikali ni la lazima* kuthibitisha mabadiliko yoyote ya taarifa hizi. Bila tangazo hilo, '
     'maombi hayatashughulikiwa.\n🔗 Maelezo zaidi: https://nida.go.tz/Usajili-Marekebisho',
     'Una tangazo la Gazeti la Serikali la mabadiliko?', ('wrap', 'wrap'),
     'NIDA: tarehe ya kuzaliwa (ana gazeti: {{has_gazette_label}})'),
    ('nida_fraud', 'Waliodanganya Taarifa',
     '*🛑 Marekebisho ya Taarifa kwa Waombaji Waliofanya Udanganyifu – NIDA*\n\nNIDA ina mwongozo maalum kwa '
     'waombaji waliotumia nyaraka bandia au za watu wengine ili kuficha utambulisho wao halisi wakati wa usajili.\n'
     '🔗 Soma zaidi: https://nida.go.tz/Mabadiliko-Udanganyifu\n\n*🔐 Sheria inavyosema (Kifungu cha 17(b), Sura ya '
     '36):*\n_Mtu yeyote ambaye kwa kujua anatoa taarifa za uongo au kupotosha kwa Afisa Usajili anatenda kosa. '
     'Akipatikana na hatia, atawajibika kwa faini isiyopungua Tsh 200,000 na isiyozidi Tsh 5,000,000 au kifungo cha '
     'miezi 2 hadi miaka 2._\n\n*Marekebisho yanaruhusiwa baada ya nyaraka zifuatazo:*\n1. Nakala ya hukumu au amri '
     'ya mahakama\n2. Kumbukumbu ya mwenendo wa kesi\n3. Ushahidi wa malipo ya faini (kama alitozwa)\n4. Ushahidi wa '
     'kumaliza kifungo (kama alihukumiwa kifungo)\n5. Nyaraka nyingine kama zitakavyoelekezwa na NIDA\n\n📌 '
     'Marekebisho haya hayafanywi hadi hatua zote za kisheria zitakapokamilika ipasavyo.',
     'Una swali lolote?', ('wrap', 'goodbye'), 'NIDA: waliodanganya taarifa (ana swali)'),
    ('nida_public', 'Taarifa: Watumishi Umma',
     '*📝 Marekebisho ya Taarifa – Watumishi wa Umma/Wastaafu (NIDA)*\n\n*Mamlaka:* Marekebisho haya husimamiwa na '
     'Mamlaka ya Vitambulisho vya Taifa (NIDA).\n\n*Tatizo:* Makosa ya majina, tarehe ya kuzaliwa, au mabadiliko '
     'baada ya ndoa/talaka yanayosababisha matatizo katika mafao au utambulisho.\n\n*Hatua muhimu:*\n✅ Barua ya '
     'mwajiri\n✅ Idhini ya Katibu Mkuu – Utumishi\n✅ Cheti cha kuzaliwa / ndoa / talaka\n✅ Deed Poll kutoka kwa '
     'wakili wa TLS\n✅ Tangazo la Gazeti la Serikali\n✅ Ada ya Tsh 20,000 (isipokuwa kama kosa ni la NIDA)\n✅ '
     'Maombi hupitiwa na Kamati ya Usajili\n\n*Huduma za Wakili:*\n⚖️ Kuandaa *Deed Poll*, kutoa huduma jinsi ya '
     'kupata *Gazeti la Serikali*, na kusaidia kutambua nyaraka sahihi kwa NIDA.\n\n📌 Maombi yanategemea ushahidi '
     'kamili na yanaweza kukubaliwa au kukataliwa.\n🔗 Soma zaidi: https://nida.go.tz',
     'Je, una Deed Poll na Gazeti la Serikali?', ('wrap', 'wrap'),
     'NIDA: watumishi wa umma (ana deed poll na gazeti: {{has_gazette_label}})'),
]


def kiapo_flow(media, wrap_up):
    b = Builder()
    b.add('start', 'start')
    b.add('intro', 'ask_buttons', save_as='kiapo_area', text=t(
        '{{client_name}}, changamoto yako ya majina inahusu nini?\n\nJe, majina yako hayalingani kwenye cheti cha '
        'kuzaliwa, NIDA, au nyaraka za NSSF? Umeshindwa kupata mafao au huduma kwa sababu ya tofauti ya majina?\n\n'
        '➡️ Tunakusaidia kuandaa *kiapo cha mabadiliko ya majina (Deed Poll)* na *tamko la kisheria* ili kurasimisha '
        'jina lako kwenye nyaraka rasmi. Huduma sahihi itakusaidia kupata cheti kipya, kurekebisha NIDA, na '
        'kurahisisha upatikanaji wa mafao kama ya NSSF.\n\n*MUHIMU:* Kuna baadhi ya huduma tutakuelimisha ukaipate '
        'kwenye mamlaka husika.\n\nChagua hapa chini una changamoto kwenye eneo gani:'),
        options=[opt('area_nssf', 'Mafao ya NSSF', value='nssf'), opt('area_nida', 'Kitambulisho NIDA', value='nida'),
                 opt('area_necta', 'Vyeti (Elimu)', value='necta')])
    b.add('service', 'set_variable', name='service', value='deed_poll')
    b.link('start', 'service')
    b.link('service', 'intro')

    # NSSF
    b.add('nssf', 'ask_buttons', save_as='appointment', text=t(
        'Ikiwa unafuatilia *mafao ya NSSF* au huduma za benki na *majina yako kwenye NIDA hayafanani* na yale kwenye '
        'kitambulisho cha kazi, unaweza kuhitaji *kiapo cha majina* kutoka kwa wakili.\n\n*Leo unaweza kuandaa kiapo '
        'chako rasmi kwa msaada wa Wakili aliyeidhinishwa.*\n\n*Utahitaji:*\n1. Picha 3 za pasipoti\n2. Kitambulisho '
        'chenye jina lililoandikwa tofauti\n3. Kitambulisho chenye jina unalotaka kutumia\n\n📢 Kwa sasa, huduma zetu '
        'za kisheria zinapatikana *Dar es Salaam na Dodoma* pekee. Unaweza kuchagua:\n1. *Miadi kwa simu/video* – BURE, '
        'watu wasiozidi wanne (4) kwa siku.\n2. *Miadi ya ana kwa ana ofisini* – inaweza kuhusisha ada.\n\nTayari '
        'kuanza? Chagua:'),
        options=[opt('appt_phone', 'Simu/Online - Bure', value='phone'), opt('appt_office', 'Ofisini - Malipo', value='office')])
    b.link('intro', 'nssf', 'area_nssf')
    b.add('nssf_calendly', 'message', text=CALENDLY_TEXT)
    b.add('nssf_req_phone', 'set_variable', name='request', value='Kiapo cha majina (NSSF): miadi ya simu (Calendly)')
    b.add('nssf_offices', 'send_media', media=t(media['offices']), caption={})
    b.add('nssf_office_msg', 'message', text=OFFICE_TEXT)
    b.add('nssf_req_office', 'set_variable', name='request', value='Kiapo cha majina (NSSF): miadi ya ofisini (malipo)')
    b.add('nssf_wrap', 'go_to_flow', flow_id=wrap_up)
    b.link('nssf', 'nssf_calendly', 'appt_phone')
    b.link('nssf', 'nssf_offices', 'appt_office')
    b.link('nssf_calendly', 'nssf_req_phone')
    b.link('nssf_req_phone', 'nssf_wrap')
    b.link('nssf_offices', 'nssf_office_msg')
    b.link('nssf_office_msg', 'nssf_req_office')
    b.link('nssf_req_office', 'nssf_wrap')

    # NIDA
    b.add('nida', 'ask_list', save_as='nida_topic', button_label=t('Chagua'), section_title=t('Aina ya marekebisho'),
          text=t('*Unahitaji msaada kwa huduma za marekebisho ya NIDA.* Tafadhali chagua aina ya marekebisho '
                 'unayohitaji:'),
          options=[opt(tid, title, value=tid) for tid, title, *_ in NIDA_TOPICS])
    b.link('intro', 'nida', 'area_nida')
    b.add('goodbye', 'end', text=GOODBYE)
    b.add('nida_wrap', 'go_to_flow', flow_id=wrap_up)
    appt, appt_wrap = appointment_branch(b, 'meet', media, wrap_up, 'Kiapo cha majina (NIDA)')
    targets = {'appointment': appt, 'goodbye': 'goodbye'}
    b.add('nida_contacts', 'ask_buttons', save_as='nida_helped', text=t(
        '*Tafadhali wasiliana na Huduma kwa Wateja wa NIDA:*\n\n📞 *023-2210500*\n🗓️ Jumatatu – Ijumaa\n'
        '🕜 Saa 1:30 asubuhi – saa 9:30 alasiri\n\nAu wasiliana nao rasmi kupitia anwani ifuatayo:\n*Mkurugenzi Mkuu*\n'
        '*Mamlaka ya Vitambulisho vya Taifa (NIDA)*\nBarabara ya Kilimani, S.L.P. 12324, 11995 Dar es Salaam\n'
        '📧 info@nida.go.tz\n📞 +255 734 220 962\n\nJe, tumekusaidia kwenye changamoto yako?'),
        options=[opt('helped_yes', 'Ndiyo', value='yes'), opt('helped_no', 'La, naomba mwongozo', value='no')])
    b.add('thanks', 'end', text=t(
        f'Ahsante, {{{{client_name}}}}! Ikiwa utahitaji huduma zetu siku za usoni, jisikie huru kuwasiliana nasi. '
        f'Kuwa na siku njema!\n\n📢 Jiunge na *WhatsApp Channel ya CLC* kwa taarifa za kisheria, huduma mpya na elimu '
        f'ya sheria: 👉 {CHANNEL} 😊'))
    b.link('nida_contacts', 'thanks', 'helped_yes')
    b.link('nida_contacts', appt, 'helped_no')
    targets['nida_contacts'] = 'nida_contacts'
    for tid, title, guidance, question, (yes, no), request in NIDA_TOPICS:
        b.add(f'{tid}_info', 'message', text=t(guidance))
        save = 'has_gazette' if '{{has_gazette_label}}' in request else ''
        b.add(f'{tid}_q', 'ask_buttons', save_as=save, text=t(question),
              options=[opt(f'{tid}_yes', 'Ndiyo', value='ndiyo'), opt(f'{tid}_no', 'Hapana', value='hapana')])
        b.link('nida', f'{tid}_info', tid)
        b.link(f'{tid}_info', f'{tid}_q')
        for port, dest in ((f'{tid}_yes', yes), (f'{tid}_no', no)):
            if dest == 'wrap':
                req = f'{tid}_req'
                if not any(n['id'] == req for n in b.nodes):
                    b.add(req, 'set_variable', name='request', value=request)
                    b.link(req, 'nida_wrap')
                b.link(f'{tid}_q', req, port)
            else:
                b.link(f'{tid}_q', targets[dest], port)

    # NECTA certificates
    b.add('necta', 'message', text=t(
        '📝 *Marekebisho ya Majina kwa Watahiniwa – Baraza la Mitihani la Tanzania (NECTA)*\n\nKama majina yako '
        'yaliandikwa vibaya kwenye *cheti cha darasa la saba, kidato cha nne, cha sita au chuo cha ualimu*, basi ujue '
        'hii inakuhusu.\n\nNECTA hushughulikia maombi ya marekebisho ya majina yaliyokosewa kuandikwa kwenye mitihani '
        'rasmi. Ikiwa unahitaji kurekebisha jina kwenye cheti chako kwa sababu ya makosa ya uandishi, huu ndio '
        'utaratibu sahihi wa kufuata.'))
    b.add('necta_pdf', 'send_media', media=t(media['necta_pdf']),
          caption=t('Tafadhali soma mwongozo wa NECTA kwenye PDF hii 👆'))
    b.add('necta_q', 'ask_buttons', text=t(
        'Tunatumaini umejifunza na umeweza kuelewa mwongozo kama ulivyoandikwa na mamlaka husika?'),
        options=[opt('necta_yes', 'Ndiyo', value='ndiyo'), opt('necta_no', 'Hapana', value='hapana')])
    b.add('necta_sorry', 'ask_buttons', text=t(
        'Ohhh pole, {{client_name}}. Endelea kupitia zaidi tovuti yao https://www.necta.go.tz/ kwa maswali mengine, au '
        'wapigie au uwatembelee.\n\nJe, una jambo lingine unahitaji tukusaidie?'),
        options=[opt('more_yes', 'Ndiyo', value='ndiyo'), opt('more_no', 'Hapana', value='hapana')])
    b.add('necta_describe', 'ask_text', save_as='description', min_length=5, save_to_client='', text=t(
        'Tafadhali eleza kwa kifupi unachohitaji ili tuweze kukusaidia haraka na kwa usahihi.'))
    b.add('necta_req', 'set_variable', name='request', value='Kiapo cha majina (NECTA): {{description}}')
    b.add('necta_thanks', 'end', text=t(
        f'Tunashukuru kwa taarifa, {{{{client_name}}}}! Ikiwa utahitaji huduma zetu siku za usoni, jisikie huru '
        f'kuwasiliana nasi. Kuwa na siku njema!\n\n📢 Jiunge na *WhatsApp Channel ya CLC*: 👉 {CHANNEL} 😊'))
    b.add('necta_wrap', 'go_to_flow', flow_id=wrap_up)
    b.link('intro', 'necta', 'area_necta')
    b.link('necta', 'necta_pdf')
    b.link('necta_pdf', 'necta_q')
    b.link('necta_q', 'necta_thanks', 'necta_yes')
    b.link('necta_q', 'necta_sorry', 'necta_no')
    b.link('necta_sorry', 'necta_describe', 'more_yes')
    b.link('necta_sorry', 'necta_thanks', 'more_no')
    b.link('necta_describe', 'necta_req')
    b.link('necta_req', 'necta_wrap')

    # after the wrap-up flow: nothing more to say
    b.add('done', 'end', text={})
    for w in ('nssf_wrap', 'nida_wrap', appt_wrap, 'necta_wrap'):
        b.link(w, 'done')
    return b.build(['sw'])


# --- flow 1: the bot --------------------------------------------------------------------------

LEGAL_ROWS = [  # id, value (service code), Kiswahili title/desc, English title/desc
    ('svc_land', 'land', ('Ardhi & Mali', 'Umiliki wa ardhi, uhamishaji wa hati & migogoro'),
     ('Land & Property', 'Land ownership, title transfers & disputes')),
    ('svc_permit', 'work_permit', ('Vibali vya Kazi', 'Maombi & upyaishaji wa vibali kwa wafanyakazi wa kigeni'),
     ('Work Permits', 'Permit applications & renewals for foreign workers')),
    ('svc_transfer', 'mining_licence_transfer', ('Uza/Nunua Leseni', 'Kuuza, kununua au kuachia leseni ya madini'),
     ('PML, PL Transfer', 'Transfer of mining licences (PML, ML, PL)')),
    ('svc_will', 'will', ('Uandishi wa Wosia', 'Mpango wa urithi & maandalizi rasmi ya wosia'),
     ('Drafting of Will', 'Estate planning & official will preparation')),
    ('svc_company', 'company_registration', ('Usajili wa Kampuni', 'Kuanzisha biashara, usajili & uzingatiaji wa sheria'),
     ('Company Registration', 'Business setup, registration & compliance')),
    ('svc_returns', 'annual_returns', ('Ripoti za Kampuni', 'Ripoti za mwaka & mabadiliko ya wakurugenzi'),
     ('Annual Returns', 'Annual returns & corporate compliance')),
    ('svc_mining', 'mining_licence', ('Leseni za Madini', 'Upatikanaji wa leseni & kibali cha udhibiti'),
     ('Mining Licences', 'Licensing & regulatory approvals')),
    ('svc_other', 'general', ('Huduma Nyingine', 'Kwa masuala maalum ya kisheria'),
     ('Other Legal Services', 'For specialised legal matters')),
]


def main_flow(media, kiapo, wrap_up):
    b = Builder()
    b.add('start', 'start')
    b.add('hours', 'business_hours')
    b.add('welcome', 'send_media', media=t(media['welcome_open']), caption=t('*KARIBU COMMUNITY LEGAL CLINIC*',
                                                                              '*WELCOME TO COMMUNITY LEGAL CLINIC*'))
    b.add('welcome_closed', 'send_media', media=t(media['welcome_closed']),
          caption=t('*KARIBU COMMUNITY LEGAL CLINIC*', '*WELCOME TO COMMUNITY LEGAL CLINIC*'))
    language = dict(text=t('{{client_name}}\nChoose 1️⃣ for English\nChagua 2️⃣ kwa Kiswahili',
                           '{{client_name}}\nChoose 1️⃣ for English\nChagua 2️⃣ kwa Kiswahili'),
                    options=[opt('lang_en', '1️⃣ English', '1️⃣ English', 'en'),
                             opt('lang_sw', '2️⃣ Kiswahili', '2️⃣ Kiswahili', 'sw')],
                    save_as='lang_choice', save_to_client='preferred_language')
    b.add('language', 'ask_buttons', **language)
    b.add('language_closed', 'ask_buttons', **language)
    b.add('closed_req', 'set_variable', name='request', value='General message (bot opened outside working hours)')
    b.add('closed_wrap', 'go_to_flow', flow_id=wrap_up)
    b.link('start', 'hours')
    b.link('hours', 'welcome', 'open')
    b.link('hours', 'welcome_closed', 'closed')
    b.link('welcome', 'language')
    b.link('welcome_closed', 'language_closed')
    for p in ('lang_en', 'lang_sw'):
        b.link('language_closed', 'closed_req', p)
    b.link('closed_req', 'closed_wrap')

    b.add('menu', 'ask_buttons', save_as='category', text=t(
        '👋 Habari {{client_name}}, karibu *CLC Huduma za Kisheria!*\n\nTunawezaje kukusaidia leo?\n\n'
        '🔹 Chagua katika orodha',
        '👋 Hello {{client_name}}, welcome to *CLC Legal Services!*\n\nHow can we assist you today?\n\n'
        '🔹 Select a category'),
        options=[opt('cat_tsa', '1️⃣ TSA', '1️⃣ TSA', 'tsa'),
                 opt('cat_legal', '2️⃣ Huduma za Sheria', '2️⃣ Legal Services', 'legal'),
                 opt('cat_kiapo', '3️⃣ Kiapo cha Majina', '3️⃣ Kiapo cha Majina', 'kiapo')])
    for p in ('lang_en', 'lang_sw'):
        b.link('language', 'menu', p)

    # TSA
    b.add('tsa_service', 'set_variable', name='service', value='tsa_miner')
    b.add('tsa_intro', 'ask_buttons', text=t(
        '{{client_name}}, tunakukaribisha kupata huduma bora za *TSA*.\n\nTafadhali chukua muda kukagua *Pendekezo '
        'letu la Huduma ya TSA*.',
        '{{client_name}}, here’s what we offer for *TSA*.\n\nPlease review our *TSA Service Proposal*.'),
        options=[opt('view', 'Tazama Pendekezo', 'View Proposal', 'view')])
    b.add('tsa_image', 'send_media', media=t(media['tsa_image']), caption={})
    b.add('tsa_text', 'message', text=t(
        '📌 *PENDEKEZO LA HUDUMA YA TSA*\nMkataba wa Msaada wa Kiufundi (*TSA – Technical Support Agreement*) '
        'unamruhusu mmiliki wa *Leseni ya Uchimbaji Mdogo wa Madini (PML – Primary Mining Licence)* kushirikiana na '
        'mtaalamu wa kiufundi kwa shughuli za uchimbaji madini. Kwa mujibu wa *Kifungu cha 8(3) cha Sheria ya Madini, '
        'Sura ya 123 ya mwaka 2019*, idhini ya TSA kutoka kwa *Tume ya Madini* inahitajika kabla ya mshirika wa kigeni '
        'kutoa huduma za kiufundi.\n\n📌 *Tunachotoa:*\n1. *Mchakato wa hatua kwa hatua* – mwongozo ulioandaliwa kwa '
        'urahisi wa kupata idhini ya TSA.\n2. *Gharama zenye uwazi* – muundo wa malipo ulio wazi, bila gharama '
        'zilizofichwa.\n3. *Uzingatiaji wa sheria* – uhakikisho wa kufuata kikamilifu sheria za uchimbaji madini.\n\n'
        '📩 *PDF imeambatishwa:* {{client_name}}, tafadhali kagua pendekezo letu kamili la huduma za TSA.\n\n'
        'Kwa maswali au maelezo zaidi, wasiliana nasi wakati wowote.\n*Mshirika Wako Katika Uzingatiaji wa Sheria za '
        'Madini,*\n*Timu ya CLC*',
        '📌 *TSA SERVICE PROPOSAL*\nThe *Technical Support Agreement (TSA)* allows a *Primary Mining Licence (PML) '
        'holder* to engage a technical partner for mining operations. As per *Section 8(3) of the Mining Act, Cap 123 '
        'of 2019*, TSA approval by the *Mining Commission* is required before a foreign party can provide technical '
        'services.\n\n📌 *What we offer:*\n1. *Step-by-step process:* a structured guide for a smooth TSA approval.\n'
        '2. *Transparent fees:* clear pricing breakdown, no hidden costs.\n3. *Regulatory compliance:* full adherence '
        'to mining laws.\n\n📩 *PDF attached:* {{client_name}}, kindly review our full TSA Service Proposal.\n'
        'For inquiries, contact us anytime.\n*Your Partner in Mining Compliance,*\n*CLC TEAM*'))
    b.add('tsa_pdf', 'send_media', media={'sw': media['tsa_pdf_sw'], 'en': media['tsa_pdf_en']}, caption={})
    b.add('tsa_expert', 'ask_buttons', save_as='tsa_expert', text=t(
        '📌 *Je, ungependa kujadili na mtaalamu kabla ya kuendelea?*',
        '*Would you like to discuss with an expert before proceeding?*'),
        options=[opt('expert_yes', 'NDIYO', 'YES', 'yes'), opt('expert_no', 'HAPANA', 'NO', 'no')])
    b.add('tsa_req', 'set_variable', name='request', value='TSA: wants to discuss with an expert')
    b.add('tsa_wrap', 'go_to_flow', flow_id=wrap_up)
    b.add('goodbye', 'end', text=GOODBYE)
    b.link('menu', 'tsa_service', 'cat_tsa')
    b.link('tsa_service', 'tsa_intro')
    b.link('tsa_intro', 'tsa_image', 'view')
    b.link('tsa_image', 'tsa_text')
    b.link('tsa_text', 'tsa_pdf')
    b.link('tsa_pdf', 'tsa_expert')
    b.link('tsa_expert', 'tsa_req', 'expert_yes')
    b.link('tsa_expert', 'goodbye', 'expert_no')
    b.link('tsa_req', 'tsa_wrap')

    # Legal services
    b.add('legal', 'ask_list', save_as='service', button_label=t('Chagua huduma', 'Choose a service'),
          section_title=t('Huduma za kisheria', 'Legal services'), text=t(
              '{{client_name}}, *unahitaji msaada wa huduma gani za kisheria?*\n\n'
              '💰 Gharama zinatofautiana kulingana na huduma.\nBonyeza hapa chini 👇🏽 kuchagua.',
              '{{client_name}}, *what legal service do you need help with?*\n\n'
              '💰 Costs vary by service.\nTap below 👇🏽 to choose.'),
          options=[opt(rid, sw[0], en[0], value, (sw[1], en[1])) for rid, value, sw, en in LEGAL_ROWS])
    b.add('will_pdf', 'send_media', media=t(media['will_pdf']), caption=t(
        '📝 Hii hapa nakala ya bure ya Wosia — kama tulivyoahidi kwenye podcast yetu.',
        '📝 Here’s your free Will template PDF — just as we promised in our podcast.'))
    b.add('proceed', 'ask_buttons', text=t(
        '{{client_name}} ✍️ Baada ya kupitia mwongozo wetu wa huduma za kisheria, umechagua *{{service_label}}*.\n\n'
        'Je, unataka kuendelea?',
        '{{client_name}} ✍️ After reviewing our legal services overview, you opted for *{{service_label}}*.\n\n'
        'Do you want to proceed?'),
        options=[opt('go', 'Endelea ✅', 'Proceed ✅', 'yes'), opt('stop', 'Sitisha ❌', 'Not interested ❌', 'no')])
    appt, appt_wrap = appointment_branch(b, 'legal', media, wrap_up, '{{service_label}}')
    b.add('other', 'ask_text', save_as='description', min_length=10, save_to_client='', text=t(
        'Umechagua *{{service_label}}*. Nipo tayari kukusaidia!\n\nTafadhali eleza kwa ufupi suala lako au huduma '
        'unayohitaji. Tutaipitia na, baada ya kushauriana na Wakili wetu ikihitajika, tutakuelekeza namna bora ya '
        'kukuhudumia.',
        'You’ve selected *{{service_label}}*. I’m here to help!\n\nPlease briefly describe your issue or the assistance '
        'you require. We’ll review your situation and, after consulting our legal expert if necessary, guide you on '
        'the best way forward.'))
    b.add('other_req', 'set_variable', name='request', value='Other legal service: {{description}}')
    b.add('other_wrap', 'go_to_flow', flow_id=wrap_up)
    b.link('menu', 'legal', 'cat_legal')
    for rid, *_ in LEGAL_ROWS:
        if rid == 'svc_will':
            b.link('legal', 'will_pdf', rid)
        elif rid == 'svc_other':
            b.link('legal', 'other', rid)
        else:
            b.link('legal', 'proceed', rid)
    b.link('will_pdf', 'proceed')
    b.link('proceed', appt, 'go')
    b.link('proceed', 'goodbye', 'stop')
    b.link('other', 'other_req')
    b.link('other_req', 'other_wrap')

    # Kiapo cha Majina (Swahili only)
    b.add('kiapo_lang', 'condition', rules=[{'id': 'is_en', 'variable': 'lang', 'operator': 'equals', 'value': 'en'}])
    b.add('kiapo_note', 'message', text=t(
        '👉 Huduma hii inatolewa kwa *Kiswahili pekee* kwa sasa.',
        '👉 Please note: this service is provided in *Swahili only* for now, so we will continue in Kiswahili.'))
    b.add('kiapo_sw', 'set_variable', name='lang', value='sw')
    b.add('kiapo', 'go_to_flow', flow_id=kiapo)
    b.link('menu', 'kiapo_lang', 'cat_kiapo')
    b.link('kiapo_lang', 'kiapo_note', 'is_en')
    b.link('kiapo_lang', 'kiapo', 'else')
    b.link('kiapo_note', 'kiapo_sw')
    b.link('kiapo_sw', 'kiapo')

    b.add('done', 'end', text={})
    for w in ('closed_wrap', 'tsa_wrap', appt_wrap, 'other_wrap', 'kiapo'):
        b.link(w, 'done')
    return b.build(['sw', 'en'])
