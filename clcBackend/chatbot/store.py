"""Where the runtime gets flow definitions from."""
from conversations.models import BotFlowVersion, FlowStatus

from .runtime import FlowStore


class PublishedStore(FlowStore):
    """Live WhatsApp: new runs use the published version; running sessions keep theirs."""

    def current(self, flow_id):
        v = (BotFlowVersion.objects.filter(flow_id=flow_id, status=FlowStatus.PUBLISHED, flow__is_active=True)
             .only('id', 'definition').first())
        return (v.id, v.definition) if v else None

    def version(self, flow_id, version_id):
        v = BotFlowVersion.objects.filter(id=version_id, flow_id=flow_id).only('definition').first()
        return v.definition if v else None


class TestStore(PublishedStore):
    """The builder's test chat: the flow being edited runs from the canvas (unsaved changes
    included); flows it jumps to run from their published version, or their draft."""
    DRAFT = 'draft'

    def __init__(self, flow_id, definition):
        self.flow_id, self.definition = str(flow_id), definition

    def current(self, flow_id):
        if str(flow_id) == self.flow_id:
            return self.DRAFT, self.definition
        found = super().current(flow_id)
        if found:
            return found
        draft = BotFlowVersion.objects.filter(flow_id=flow_id, status=FlowStatus.DRAFT).only('id', 'definition').first()
        return (draft.id, draft.definition) if draft else None

    def version(self, flow_id, version_id):
        if str(flow_id) == self.flow_id and version_id == self.DRAFT:
            return self.definition
        return super().version(flow_id, version_id)
