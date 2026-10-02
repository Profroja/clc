"""What the engine may do outside the conversation. The runtime only calls this interface,
so the same flow runs live (LiveEffects in live.py, real database) or in the builder's test
chat (SimulatedEffects, nothing saved)."""
from django.core.exceptions import ValidationError

from . import botsettings


class Effects:
    def media_info(self, asset_id):
        """{"id", "kind", "file_name", "name"} of a file in the bot's library, or None."""
        from .models import MediaAsset
        try:
            a = MediaAsset.objects.filter(id=asset_id).first()
        except (ValueError, ValidationError):
            return None
        return a and {'id': str(a.id), 'kind': a.kind, 'file_name': a.file_name, 'name': a.name}

    def is_open(self):
        return botsettings.is_open(botsettings.get('business_hours'))

    def notify_staff(self, *, to, subject, body, answers):
        """Email staff (`to`, or the staff list in Bot settings when empty)."""
        raise NotImplementedError

    def set_client(self, field, value):
        raise NotImplementedError

    def create_case(self, *, service_code, summary, region, answers, files):
        """Create the case; return its reference, e.g. CLC/2026/0014."""
        raise NotImplementedError

    def case_status(self):
        """Latest cases of this client: [{"reference", "status", "firm"}]."""
        raise NotImplementedError

    def handover(self):
        raise NotImplementedError


class SimulatedEffects(Effects):
    """Used by the builder's Test panel: records what would happen instead of doing it.
    `hours` ("open" / "closed") lets the admin test both sides of a Business hours block."""

    def __init__(self, hours=None):
        self.log = []
        self.hours = hours

    def is_open(self):
        is_open = self.hours == 'open' if self.hours in ('open', 'closed') else super().is_open()
        self.log.append({'effect': 'business_hours', 'detail': 'open' if is_open else 'closed'})
        return is_open

    def notify_staff(self, *, to, subject, body, answers):
        to = to or botsettings.get('staff_emails')
        self.log.append({'effect': 'notify_staff',
                         'detail': f'email "{subject}" to {", ".join(to) or "nobody (add staff emails in Bot settings)"}'})

    def set_client(self, field, value):
        self.log.append({'effect': 'set_client', 'detail': f'{field} = {value}'})

    def create_case(self, *, service_code, summary, region, answers, files):
        self.log.append({'effect': 'create_case',
                         'detail': f'service={service_code or "-"}, region={region or "-"}, documents={len(files)}'})
        return 'CLC/TEST/0001'

    def case_status(self):
        self.log.append({'effect': 'case_status', 'detail': 'sample case shown'})
        return [{'reference': 'CLC/TEST/0001', 'status': 'under_review', 'firm': None}]

    def handover(self):
        self.log.append({'effect': 'handover', 'detail': 'chat would wait for a CLC Admin'})
