from django.urls import path

from . import api

urlpatterns = [
    path('chatbot/node-types/', api.node_types),
    path('chatbot/flows/', api.flows),
    path('chatbot/flows/<uuid:flow_id>/', api.flow_detail),
    path('chatbot/flows/<uuid:flow_id>/draft/', api.save_draft),
    path('chatbot/flows/<uuid:flow_id>/validate/', api.validate_flow),
    path('chatbot/flows/<uuid:flow_id>/publish/', api.publish),
    path('chatbot/flows/<uuid:flow_id>/versions/', api.versions),
    path('chatbot/flows/<uuid:flow_id>/versions/<uuid:version_id>/restore/', api.restore_version),
    path('chatbot/flows/<uuid:flow_id>/simulate/', api.simulate),
    path('whatsapp/webhook/', api.webhook),
]
