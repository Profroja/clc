"""What the engine may do outside the conversation. The runtime only calls this interface,
so the same flow runs live (LiveEffects in live.py, real database) or in the builder's test
chat (SimulatedEffects, nothing saved)."""


class Effects:
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
    """Used by the builder's Test panel: records what would happen instead of doing it."""

    def __init__(self):
        self.log = []

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
