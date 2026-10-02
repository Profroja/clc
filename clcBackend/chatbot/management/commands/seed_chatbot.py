"""Loads CLC's services and the starter intake flow (published, started by any new conversation).

    python manage.py seed_chatbot
Safe to run again: existing services are kept and the flow is only created once.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from chatbot.starter import intake_flow
from chatbot.validate import has_errors, validate
from conversations.models import BotFlow, BotFlowVersion, FlowStatus, FlowTrigger, TriggerType
from core.models import Service

SERVICES = [
    ('tsa_miner', 'Mkataba wa Mchimbaji Mdogo na Mwekezaji', 'Small-scale miner & investor agreement (TSA)', '矿工与投资者协议', 1),
    ('gold_investor', 'Uwekezaji halali kwenye dhahabu', 'Invest in Tanzanian gold legally', '合法投资黄金', 2),
    ('deed_poll', 'Badilisha jina kwa Deed Poll', 'Change of name by Deed Poll', '契据更名', 3),
    ('will', 'Andika wosia', 'Write a will', '订立遗嘱', 4),
    ('general', 'Shauri jingine', 'Other legal matter', '其他法律事务', 9),
]
NAME = 'CLC intake'


class Command(BaseCommand):
    help = "Seed CLC's services and the starter WhatsApp intake flow"

    def handle(self, *args, **opts):
        with transaction.atomic():
            for code, sw, en, zh, order in SERVICES:
                Service.objects.get_or_create(code=code, defaults={'name_sw': sw, 'name_en': en, 'name_zh': zh,
                                                                   'sort_order': order})
            if BotFlow.objects.filter(name=NAME).exists():
                self.stdout.write(f'"{NAME}" already exists; left unchanged.')
                return
            definition = intake_flow()
            issues = validate(definition, languages=('sw', 'en', 'zh'))
            if has_errors(issues):
                raise SystemExit(f'Starter flow is invalid: {issues}')
            flow = BotFlow.objects.create(name=NAME, description='Language, services menu, intake questions, '
                                                                 'documents, then a new case for CLC to review.')
            BotFlowVersion.objects.create(flow=flow, version=1, status=FlowStatus.PUBLISHED,
                                          definition=definition, published_at=timezone.now())
            FlowTrigger.objects.create(flow=flow, type=TriggerType.NEW_CONVERSATION, priority=100)
        self.stdout.write(self.style.SUCCESS(f'Published "{NAME}" (starts on any new conversation).'))
