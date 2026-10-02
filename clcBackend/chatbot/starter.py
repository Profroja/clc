"""CLC's intake flow in the builder's format. `python manage.py seed_chatbot` loads it, so the
flow builder opens on a working example instead of an empty canvas."""


def _t(sw, en, zh=''):
    return {'sw': sw, 'en': en, 'zh': zh}


def _opt(id_, value, sw, en, zh, desc=None):
    o = {'id': id_, 'value': value, 'title': _t(sw, en, zh)}
    if desc:
        o['description'] = _t(*desc)
    return o


def _node(id_, type_, x, y, **data):
    return {'id': id_, 'type': type_, 'position': {'x': x, 'y': y}, 'data': data}


def _edge(source, target, handle='next'):
    return {'id': f'e-{source}-{handle}', 'source': source, 'sourceHandle': handle, 'target': target}


SERVICES = [
    ('svc_tsa', 'tsa_miner', 'Mchimbaji na Mwekezaji', 'Miner & investor (TSA)', '矿工与投资者协议',
     ('Mkataba wa Msaada wa Kiufundi', 'Technical Support Agreement', '技术支持协议')),
    ('svc_gold', 'gold_investor', 'Uwekezaji wa dhahabu', 'Invest in gold legally', '合法投资黄金',
     ('Kwa wawekezaji wa kigeni', 'For foreign investors', '面向外国投资者')),
    ('svc_deed', 'deed_poll', 'Badilisha jina', 'Change my name', '更改姓名',
     ('Deed Poll / Kiapo cha Majina', 'Deed Poll', '契据更名')),
    ('svc_will', 'will', 'Andika wosia', 'Write a will', '订立遗嘱', None),
    ('svc_general', 'general', 'Shauri jingine', 'Other legal matter', '其他法律事务', None),
]


def intake_flow():
    nodes = [
        _node('start', 'start', 0, 0),
        _node('language', 'ask_buttons', 0, 120,
              text=_t('Karibu Community Legal Clinic (CLC). Chagua lugha · Choose language · 选择语言',
                      'Karibu Community Legal Clinic (CLC). Chagua lugha · Choose language · 选择语言',
                      'Karibu Community Legal Clinic (CLC). Chagua lugha · Choose language · 选择语言'),
              options=[_opt('lang_sw', 'sw', 'Kiswahili', 'Kiswahili', 'Kiswahili'),
                       _opt('lang_en', 'en', 'English', 'English', 'English'),
                       _opt('lang_zh', 'zh', '中文', '中文', '中文')],
              save_as='lang', save_to_client='preferred_language'),
        _node('privacy', 'message', 0, 300,
              text=_t('CLC itatumia taarifa zako kushughulikia shauri lako tu. Hatutazishiriki na wakili au kampuni yoyote ya uwakili bila ridhaa yako.',
                      'CLC uses your details only to handle your case. We will not share them with any advocate or law firm without your consent.',
                      'CLC 仅将您的信息用于处理您的案件。未经您同意，我们不会与任何律师或律师事务所分享。')),
        _node('menu', 'ask_list', 0, 440,
              text=_t('Tunakusaidiaje leo?', 'How can we help you today?', '今天我们能为您做什么？'),
              button_label=_t('Chagua huduma', 'Choose a service', '选择服务'),
              section_title=_t('Huduma za CLC', 'CLC services', 'CLC 服务'),
              options=[_opt(i, v, sw, en, zh, d) for i, v, sw, en, zh, d in SERVICES] + [
                  _opt('menu_status', 'status', 'Hali ya shauri langu', 'Check my case', '查询我的案件'),
                  _opt('menu_human', 'human', 'Ongea na CLC', 'Talk to CLC', '联系 CLC')],
              save_as='service'),
        _node('ask_name', 'ask_text', -260, 720,
              text=_t('Tafadhali andika jina lako kamili.', 'Please type your full name.', '请输入您的全名。'),
              save_as='full_name', min_length=3, save_to_client='full_name'),
        _node('ask_region', 'ask_text', -260, 860,
              text=_t('Unaishi mkoa gani?', 'Which region do you live in?', '您住在哪个地区？'),
              save_as='region', min_length=2, save_to_client='region'),
        _node('ask_description', 'ask_text', -260, 1000,
              text=_t('Eleza kwa ufupi changamoto yako ya kisheria (sentensi 2 au 3).',
                      'Briefly describe your legal issue (2 or 3 sentences).', '请简要描述您的法律问题（两三句话）。'),
              save_as='description', min_length=15,
              error_text=_t('Tafadhali eleza kwa maneno zaidi kidogo.', 'Please add a little more detail.', '请再多写一些细节。')),
        _node('documents', 'ask_file', -260, 1140,
              text=_t('Kama una nyaraka (kitambulisho, leseni, cheti n.k.), tuma picha au PDF sasa. Ukimaliza bonyeza Nimemaliza.',
                      'If you have documents (ID, licence, certificate, etc.), send photos or PDFs now. Tap Done when finished.',
                      '如有文件（身份证、许可证、证书等），请现在发送照片或 PDF。完成后点击“完成”。'),
              done_label=_t('Nimemaliza', 'Done', '完成'), skip_label=_t('Sina nyaraka', 'No documents', '没有文件')),
        _node('create_case', 'create_case', -260, 1300,
              service_variable='service', summary_variable='description', region_variable='region',
              text=_t('Asante, {{full_name}}. Namba ya shauri lako ni {{reference}}. Timu ya CLC italipitia na kukujibu hapa.',
                      'Thank you, {{full_name}}. Your case reference is {{reference}}. The CLC team will review it and reply here.',
                      '谢谢，{{full_name}}。您的案件编号是 {{reference}}。CLC 团队将审核并在此回复您。')),
        _node('handover_after_case', 'handover', -260, 1440),
        _node('status', 'case_status', 260, 720, text=_t('Hali ya shauri lako:', 'Your case status:', '您的案件状态：')),
        _node('status_end', 'end', 260, 860),
        _node('handover', 'handover', 520, 720,
              text=_t('Sawa. Mtu wa CLC atakujibu hapa hivi punde.', 'OK. A member of the CLC team will reply here shortly.',
                      '好的。CLC 工作人员将很快在此回复您。')),
    ]
    edges = [
        _edge('start', 'language'),
        *[_edge('language', 'privacy', h) for h in ('lang_sw', 'lang_en', 'lang_zh')],
        _edge('privacy', 'menu'),
        *[_edge('menu', 'ask_name', s[0]) for s in SERVICES],
        _edge('menu', 'status', 'menu_status'),
        _edge('menu', 'handover', 'menu_human'),
        _edge('ask_name', 'ask_region'),
        _edge('ask_region', 'ask_description'),
        _edge('ask_description', 'documents'),
        _edge('documents', 'create_case'),
        _edge('create_case', 'handover_after_case'),
        _edge('status', 'status_end'),
    ]
    return {'nodes': nodes, 'edges': edges, 'settings': {'languages': ['sw', 'en', 'zh']}}
