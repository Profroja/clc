from datetime import timedelta

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from tracking.models import SessionEndReason, UserSession

from .models import Membership, MembershipStatus, OrgStatus, OrgType


def usable_memberships(user):
    """Roles shown in the 'Working as' chooser: active roles in CLC or an approved firm."""
    qs = user.memberships.filter(status=MembershipStatus.ACTIVE).select_related('organization')
    return [
        m for m in qs
        if m.organization.type == OrgType.CLC or m.organization.status == OrgStatus.APPROVED
    ]


def membership_payload(m):
    return {
        'id': str(m.id),
        'role': m.role,
        'role_label': m.get_role_display(),
        'organization': m.organization.name,
        'label': f'{m.organization.name} - {m.get_role_display()}',
    }


def client_ip(request):
    fwd = request.META.get('HTTP_X_FORWARDED_FOR')
    return fwd.split(',')[0].strip() if fwd else request.META.get('REMOTE_ADDR')


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    """Step 1 for every user: check the password, return the roles they can work as."""
    email = (request.data.get('email') or '').strip()
    password = request.data.get('password') or ''
    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({'detail': 'invalid_credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    memberships = usable_memberships(user)
    if not memberships:
        return Response({'detail': 'no_active_role'}, status=status.HTTP_403_FORBIDDEN)

    # Short-lived token that can only be used to pick a role.
    token = RefreshToken.for_user(user).access_token
    token['scope'] = 'pick_role'
    token.set_exp(lifetime=timedelta(minutes=10))
    return Response({
        'pick_role_token': str(token),
        'user': {'id': str(user.id), 'full_name': user.full_name, 'email': user.email},
        'memberships': [membership_payload(m) for m in memberships],
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def select_role(request):
    """Step 2: 'Working as'. Starts a portal session and issues the real tokens."""
    if request.auth.get('scope') not in ('pick_role', 'portal'):
        return Response({'detail': 'invalid_token'}, status=status.HTTP_401_UNAUTHORIZED)
    user = request.user
    membership = next((m for m in usable_memberships(user) if str(m.id) == str(request.data.get('membership_id'))), None)
    if membership is None:
        return Response({'detail': 'invalid_role'}, status=status.HTTP_403_FORBIDDEN)

    # Switching role ends the previous session.
    if request.auth.get('scope') == 'portal':
        UserSession.objects.filter(id=request.auth.get('session_id'), ended_at__isnull=True).update(
            ended_at=timezone.now(), end_reason=SessionEndReason.SWITCHED_ROLE)

    session = UserSession.objects.create(
        user=user, membership=membership, ip_address=client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    refresh = RefreshToken.for_user(user)
    for token in (refresh, refresh.access_token):
        token['scope'] = 'portal'
        token['membership_id'] = str(membership.id)
        token['role'] = membership.role
        token['organization_id'] = str(membership.organization_id)
        token['session_id'] = str(session.id)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'membership': membership_payload(membership),
        'user': {'id': str(user.id), 'full_name': user.full_name, 'email': user.email},
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    UserSession.objects.filter(id=request.auth.get('session_id'), ended_at__isnull=True).update(
        ended_at=timezone.now(), end_reason=SessionEndReason.SIGN_OUT)
    return Response(status=status.HTTP_204_NO_CONTENT)
