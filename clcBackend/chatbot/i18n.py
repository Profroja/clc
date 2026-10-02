"""Texts in the flow builder are stored per language: {"sw": "...", "en": "...", "zh": "..."}.
This module picks the client's language and fills {{placeholders}}."""
import re

LANGS = ('sw', 'en', 'zh')
DEFAULT_LANG = 'sw'
_PLACEHOLDER = re.compile(r'\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}')


def pick(value, lang):
    """The text for `lang`, falling back to Kiswahili, then English, then any language."""
    if value is None:
        return ''
    if isinstance(value, str):
        return value
    for key in (lang, DEFAULT_LANG, 'en', *LANGS):
        if value.get(key):
            return value[key]
    return ''


def fill(text, variables):
    """Replace {{name}} with variables['name'] (empty when unknown)."""
    return _PLACEHOLDER.sub(lambda m: str(variables.get(m.group(1), '') or ''), text or '')


def placeholders(text):
    return set(_PLACEHOLDER.findall(text or ''))


# Messages the engine itself sends (not set in the builder).
SYSTEM = {
    'choose': {'sw': 'Samahani, sikuelewa. Tafadhali chagua moja kati ya hizi.',
               'en': "Sorry, I didn't get that. Please choose one of these.",
               'zh': '抱歉，我没看懂。请从以下选项中选择。'},
    'type_answer': {'sw': 'Tafadhali jibu kwa maandishi.', 'en': 'Please reply in writing.', 'zh': '请用文字回复。'},
    'too_short': {'sw': 'Tafadhali eleza kwa maneno zaidi kidogo.', 'en': 'Please add a little more detail.',
                  'zh': '请再多写一些细节。'},
    'send_file': {'sw': 'Tuma picha au PDF, au bonyeza kitufe hapa chini.',
                  'en': 'Send a photo or PDF, or tap a button below.', 'zh': '请发送照片或 PDF，或点击下面的按钮。'},
    'file_received': {'sw': 'Nimepokea nyaraka {{count}}.', 'en': 'Received {{count}} document(s).',
                      'zh': '已收到 {{count}} 份文件。'},
    'file_failed': {'sw': 'Samahani, faili halikupokelewa. Tafadhali litume tena.',
                    'en': 'Sorry, that file did not come through. Please send it again.', 'zh': '抱歉，文件未收到。请重新发送。'},
    'no_cases': {'sw': 'Hatukupata shauri lolote kwa namba hii.', 'en': 'We found no case for this number.',
                 'zh': '未找到与此号码相关的案件。'},
}

STATUS_WORDS = {
    'new': {'sw': 'Imepokelewa', 'en': 'Received', 'zh': '已收到'},
    'under_review': {'sw': 'Inapitiwa na CLC', 'en': 'Being reviewed by CLC', 'zh': 'CLC 审核中'},
    'referred': {'sw': 'Imetumwa kwa {{firm}}', 'en': 'Sent to {{firm}}', 'zh': '已转介至 {{firm}}'},
    'accepted': {'sw': 'Imekubaliwa na {{firm}}', 'en': 'Accepted by {{firm}}', 'zh': '{{firm}} 已接受'},
    'advocate_assigned': {'sw': 'Wakili amepangwa ({{firm}})', 'en': 'Advocate assigned ({{firm}})', 'zh': '已指派律师（{{firm}}）'},
    'active': {'sw': 'Inashughulikiwa na {{firm}}', 'en': 'In progress with {{firm}}', 'zh': '{{firm}} 处理中'},
    'referred_back': {'sw': 'Inapitiwa tena na CLC', 'en': 'Back with CLC for review', 'zh': '已退回 CLC 重新审核'},
    'closed': {'sw': 'Imefungwa', 'en': 'Closed', 'zh': '已结案'},
}
